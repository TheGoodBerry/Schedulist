# Schedulist

A class/schedule countdown display: upload a schedule, see what's happening
now, how much time is left in it, and when the next class starts. Comes with
a separate **Theme Builder** app for designing your own look — colors,
background, particle effects, fonts, tick sounds, class-change chimes, and
background music.

## Getting started

1. Unzip everything into one folder — keep `index.html`, `theme-builder.html`,
   `css/`, and `js/` together; the two apps link to each other by relative path.
2. Open **`index.html`** in a browser. It loads with a sample schedule and the
   default "Departure Board" theme.
3. Click the ⚙ settings icon (or press **S**) to upload your own schedule,
   pick a built-in theme, or upload a theme you built in the Theme Builder.
4. Open **`theme-builder.html`** (there's a link inside Settings) to design a
   custom theme, then export it and re-import it into Schedulist.

**Tip:** everything works straight from the filesystem (double-click to open),
but for the smoothest experience — and if your browser is picky about
`file://` pages — serve the folder locally instead:

```
cd schedulist
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Uploading a schedule

Settings → Schedule → **Upload schedule.json**. Format:

```json
{
  "name": "My Schedule",
  "skipDates": ["2026-11-27"],
  "periods": [
    {
      "name": "Period 1 — Algebra II",
      "start": "08:15",
      "end": "09:05",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "kind": "class"
    }
  ]
}
```

- `start` / `end` are 24-hour `HH:MM`.
- `days` uses 3-letter lowercase day codes (`sun`…`sat`).
- `kind` is optional (`"class"` or `"break"`) — cosmetic only, shown in the
  today list.
- `skipDates` is an optional list of `YYYY-MM-DD` no-school days (holidays,
  breaks) — the app treats them like a weekend and looks ahead to the next
  real school day.
- A period can appear on multiple days with different names by listing it
  twice with different `days` arrays — handy for A-day/B-day rotations.

Use **Download current** in Settings to grab your active schedule as a
starting template, or **Load sample** to restore the demo schedule
(also saved at `data/sample-schedule.json`).

## Building a theme

Open `theme-builder.html`. Everything updates a live preview on the right as
you edit:

- **Colors** — background gradient stops, card color, text, and two accent
  colors (used for "now" vs "next").
- **Background** — gradient, flat color, or your own uploaded image, with a
  dimmer overlay so text stays readable.
- **Type & shape** — pick the display font for the big countdown separately
  from the label font, and set corner roundness from sharp (departure-board)
  to soft.
- **Particles** — snow, stars, bubbles, embers, confetti, or fireflies,
  drifting behind the UI, with density and speed sliders.
- **Sounds** — upload a custom tick (plays once a second, off by default), a
  class-change chime (plays on every transition — a synthesized chime is used
  if you don't upload one), and a looping background-music track with its own
  volume slider.
- **Saved in this browser** — a local gallery so you can flip between drafts
  without re-exporting each time.

When you're happy, click **Export theme.json**, then in Schedulist go to
Settings → Theme → **Upload theme.json**. Themes are plain JSON (images and
sounds are embedded as data URLs), so they're easy to share with friends —
just send the file.

## Other features

- Big flip-style countdown with a progress bar for the current period.
- "Up next" preview, plus a full scrollable timetable for the day at the
  bottom, with the current period highlighted and past ones dimmed.
- Kiosk / fullscreen mode (press **F** or the expand icon) for a wall display
  — hides all chrome, just the countdown.
- Optional desktop notifications on every period change.
- 12-hour / 24-hour clock toggle.
- Everything (schedule, theme, and your toggle preferences) is remembered in
  this browser via `localStorage`, with an off switch in Settings if you'd
  rather it not persist.

## Keyboard shortcuts (main app)

- `F` — toggle fullscreen / kiosk mode
- `S` — open settings
- `Esc` — close settings

## Notes & limits

- Everything runs client-side — no server, no accounts, no tracking.
- Because `localStorage` on `file://` pages is scoped per file path in most
  browsers, the two apps don't automatically share saved themes — export from
  the builder and import into the main app to move a theme across.
- Fullscreen and notification permissions require a user click to activate
  (a browser security rule), so those buttons need to be pressed at least
  once per session.
- Very large uploaded background images or long music files make your
  exported `theme.json` large (they're embedded as base64). That's fine for
  personal use, just keep an eye on file size if you plan to share themes.
