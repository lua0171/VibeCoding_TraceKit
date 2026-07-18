# Heatmap Visualization — Notes

## Files
- `Heatmap.jsx` — the component. Pure function of a `data` prop, no fetching inside.
- `mockHeatmapData.js` — the input contract + fake data standing in for the backend.
- `HeatmapDemo.jsx` — one-line usage example.

## Why it's built this way

**Input isolation.** `Heatmap.jsx` never fetches data itself — it only reads the `data` prop.
This means the mock data file is the *only* thing you'll touch once the real
`GET /studies/:id/screens/:id/events` endpoint exists. Everything else (canvas
rendering, zoom, filtering, hover) stays untouched.

**Normalized coordinates (x/y as 0–1, not pixels).** Click coordinates are stored
as a fraction of screen width/height. This is the one assumption most likely to
need confirming against your real click-tracking overlay: if your `click_events`
table stores raw pixel coordinates instead, either convert them to normalized
form when you fetch them, or convert in the component before the canvas draw
step (one function, easy to add).

**Canvas over SVG/DOM elements.** With potentially hundreds of click events per
study, an SVG circle-per-click or DOM-node-per-click approach gets slow fast.
Canvas with additive radial gradients (the classic "heatmap.js" technique) keeps
rendering cheap regardless of event count, which matters for your <5s heatmap
generation performance budget in the PRD.

## What's already covered (per PRD acceptance criteria)
- ✅ Click heatmap (canvas density rendering, blue→yellow→red scale)
- ✅ Hover overlay (shows click count + participant count near cursor)
- ✅ Zoom (100%–300%, in 25% steps)
- ✅ Filter participants (checkbox list, "All"/"Clear" toggle)

## Known gaps to close once the backend contract is final
1. **Screen navigation** — this component renders one screen at a time. If a
   study has multiple screens/frames, you'll want a screen switcher above it
   (data.screen becomes a list, or this component gets wrapped by a parent that
   manages "current screen").
2. **Timestamp/sequence data** — `events[].timestamp` is captured in the mock
   but unused. Once you build navigation-path analysis (mentioned in the PRD's
   Click Tracking module), you'll likely want a second view mode (path/flow
   lines) reusing the same `events` array.
3. **Real screenshots** — `screen.imageUrl` currently points to a placeholder.
   You'll need a step in the Figma embed flow that captures/exports a static
   image of each frame to overlay the canvas on (screenshots don't need to be
   pixel-perfect, but must match the aspect ratio used when clicks were recorded).
4. **Accessibility** — the PRD requires WCAG 2.2 AA and "accessible charts and
   heatmaps." A canvas heatmap is visual-only; you'll want a companion data
   table (e.g., "top 5 click zones with % of total clicks") for screen readers,
   which can reuse the same `filteredEvents` computation already in the
   component.

## Dependencies
None beyond React + Tailwind (already in your stack). No charting library
required — the heatmap is hand-drawn on `<canvas>`.
