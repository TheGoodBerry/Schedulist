/* Schedulist — schedule engine
   Schedule JSON shape:
   {
     "name": "My Schedule",
     "skipDates": ["2026-11-27"],           // YYYY-MM-DD, no-school days
     "periods": [
       { "name": "Period 1 - Math", "start": "08:00", "end": "08:50",
         "days": ["mon","tue","wed","thu","fri"], "kind": "class" }
     ]
   }
   "kind" is optional ("class" | "break") and only affects the label style.
*/
(function (global) {
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function sampleSchedule() {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    return {
      name: 'Sample Weekday Schedule',
      skipDates: [],
      periods: [
        { name: 'Homeroom', start: '08:00', end: '08:10', days: weekdays, kind: 'break' },
        { name: 'Period 1 — Algebra II', start: '08:15', end: '09:05', days: weekdays, kind: 'class' },
        { name: 'Period 2 — Chemistry', start: '09:10', end: '10:00', days: weekdays, kind: 'class' },
        { name: 'Passing / Break', start: '10:00', end: '10:10', days: weekdays, kind: 'break' },
        { name: 'Period 3 — World History', start: '10:10', end: '11:00', days: weekdays, kind: 'class' },
        { name: 'Period 4 — English Lit', start: '11:05', end: '11:55', days: weekdays, kind: 'class' },
        { name: 'Lunch', start: '11:55', end: '12:35', days: weekdays, kind: 'break' },
        { name: 'Period 5 — Studio Art', start: '12:40', end: '13:30', days: weekdays, kind: 'class' },
        { name: 'Period 6 — Physics', start: '13:35', end: '14:25', days: weekdays, kind: 'class' },
        { name: 'Period 7 — PE', start: '14:30', end: '15:15', days: weekdays, kind: 'class' },
      ],
    };
  }

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function validate(schedule) {
    if (!schedule || typeof schedule !== 'object') throw new Error('Schedule must be a JSON object.');
    if (!Array.isArray(schedule.periods) || schedule.periods.length === 0) throw new Error('Schedule needs a non-empty "periods" array.');
    for (const p of schedule.periods) {
      if (!p.name || !p.start || !p.end || !Array.isArray(p.days)) {
        throw new Error('Every period needs name, start, end, and a days array.');
      }
      if (!/^\d{1,2}:\d{2}$/.test(p.start) || !/^\d{1,2}:\d{2}$/.test(p.end)) {
        throw new Error(`Period "${p.name}" has a bad time format. Use HH:MM (24h).`);
      }
    }
    return true;
  }

  function periodsForDate(schedule, date) {
    const dayKey = DAY_KEYS[date.getDay()];
    if ((schedule.skipDates || []).includes(dateKey(date))) return [];
    return schedule.periods
      .filter(p => p.days.map(d => d.toLowerCase().slice(0, 3)).includes(dayKey))
      .map(p => ({ ...p, startMin: toMinutes(p.start), endMin: toMinutes(p.end) }))
      .sort((a, b) => a.startMin - b.startMin);
  }

  // Search forward up to 14 days for the next day that has periods, return {date, first}
  function findNextSchoolDay(schedule, fromDate) {
    for (let i = 1; i <= 14; i++) {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const periods = periodsForDate(schedule, d);
      if (periods.length > 0) return { date: d, first: periods[0] };
    }
    return null;
  }

  /**
   * Compute the current status for `schedule` at time `now`.
   * Returns one of:
   *  { state:'in-class', current, next, progress, remainingMs }
   *  { state:'passing',  prev, next, remainingMs }
   *  { state:'before-school', next, remainingMs }
   *  { state:'after-school', next, remainingMs, nextIsAnotherDay }
   *  { state:'no-school', next, remainingMs }
   */
  function computeStatus(schedule, now) {
    now = now || new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const today = periodsForDate(schedule, now);

    if (today.length === 0) {
      const nsd = findNextSchoolDay(schedule, now);
      if (!nsd) return { state: 'no-school', next: null, remainingMs: 0 };
      const nextStart = new Date(nsd.date);
      nextStart.setHours(...nsd.first.start.split(':').map(Number), 0, 0);
      return { state: 'no-school', next: nsd.first, nextDate: nextStart, remainingMs: nextStart - now };
    }

    for (let i = 0; i < today.length; i++) {
      const p = today[i];
      if (nowMin >= p.startMin && nowMin < p.endMin) {
        const endDate = atMinutes(now, p.endMin);
        const startDate = atMinutes(now, p.startMin);
        const progress = (nowMin - p.startMin) / (p.endMin - p.startMin);
        const next = today[i + 1] || null;
        return {
          state: 'in-class', current: p, next,
          progress: Math.max(0, Math.min(1, progress)),
          remainingMs: endDate - now, elapsedMs: now - startDate,
          totalMs: (p.endMin - p.startMin) * 60000,
        };
      }
    }

    if (nowMin < today[0].startMin) {
      const startDate = atMinutes(now, today[0].startMin);
      return { state: 'before-school', next: today[0], remainingMs: startDate - now };
    }

    if (nowMin >= today[today.length - 1].endMin) {
      const nsd = findNextSchoolDay(schedule, now);
      if (!nsd) return { state: 'after-school', next: null, remainingMs: 0 };
      const nextStart = new Date(nsd.date);
      nextStart.setHours(...nsd.first.start.split(':').map(Number), 0, 0);
      const sameDay = false;
      return { state: 'after-school', next: nsd.first, nextDate: nextStart, remainingMs: nextStart - now, nextIsAnotherDay: !sameDay };
    }

    // Between two periods today (passing period)
    for (let i = 0; i < today.length - 1; i++) {
      if (nowMin >= today[i].endMin && nowMin < today[i + 1].startMin) {
        const startDate = atMinutes(now, today[i + 1].startMin);
        return { state: 'passing', prev: today[i], next: today[i + 1], remainingMs: startDate - now };
      }
    }

    return { state: 'no-school', next: null, remainingMs: 0 };
  }

  function atMinutes(refDate, minutes) {
    const d = new Date(refDate);
    d.setHours(0, minutes, 0, 0);
    return d;
  }

  function formatDuration(ms) {
    ms = Math.max(0, ms);
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  global.Schedulist = global.Schedulist || {};
  global.Schedulist.sampleSchedule = sampleSchedule;
  global.Schedulist.validateSchedule = validate;
  global.Schedulist.periodsForDate = periodsForDate;
  global.Schedulist.computeStatus = computeStatus;
  global.Schedulist.formatDuration = formatDuration;
  global.Schedulist.DAY_KEYS = DAY_KEYS;
})(window);
