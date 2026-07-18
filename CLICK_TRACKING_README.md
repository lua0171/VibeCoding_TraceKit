# Click Tracking — Notes

## Files
- `FIGMA_EMBED_CONTRACT.md` — what the not-yet-built embed step must provide.
- `useClickTracking.js` — the tracking logic (click position, timestamps, navigation path).
- `ClickTrackingOverlay.jsx` — wraps the (currently stubbed) embed and surfaces tracking status.

## The core constraint this is built around

You cannot attach a click listener to a cross-origin iframe from the parent
page — this isn't a gap to close later, it's a browser security boundary.
Since the Figma prototype will load in an iframe, "record clicks" can't mean
"listen for click events on the iframe" the way it would for a same-origin
element.

Two techniques solve this, and both are implemented here:

1. **Click position** — the blur+mousemove heuristic. The hook tracks mouse
   position continuously while it's over the embed container. When the
   window loses focus (`blur`) and the newly-focused element is an `<iframe>`,
   it's a strong signal a click just landed inside it — so the last known
   mouse position is recorded as the click. This is approximate (it can't
   distinguish a click from, say, a drag-release), but it's the standard
   approach used by tools like Hotjar and Maze for iframe click tracking.

2. **Navigation path** — Figma's official Embed Kit posts `NEW_STATE`
   messages to the parent window when the presented frame changes. The hook
   listens for these via `window.addEventListener("message", ...)`.
   **This is currently unverified** against a real embed, since the embed
   step doesn't exist yet — see `FIGMA_EMBED_CONTRACT.md` for exactly what
   to check once it's built.

## What to refactor once the Embed step is built

1. **Swap the stub.** In `ClickTrackingOverlay.jsx`, replace `<StubFigmaEmbed />`
   with the real embed. Nothing else in that file should need to change if
   the embed renders inside the existing `containerRef`.
2. **Verify the postMessage shape.** Log `event.data` from a real embed and
   compare against the assumed shape in `FIGMA_EMBED_CONTRACT.md`. Adjust the
   one function (`handleFigmaMessage` in `useClickTracking.js`) if field
   names differ — the rest of the hook is unaffected.
3. **Decide on `screenId` sourcing.** Right now `screenId` is passed in as a
   static prop. Once navigation events are confirmed working, drive it from
   `navigationPath` instead of a manually-passed value.
4. **Wire `onFlush` to real persistence.** The hook batches events every 5s
   and calls `onFlush(batch)` — currently unconnected. Point it at whatever
   local storage mechanism gets built (a `POST` to the local Express/SQLite
   backend is the PRD's intended design, since "local storage" in the PRD
   means "never leaves the device," not necessarily browser `localStorage`).

## Known limitations to flag to the team, not silently patch over
- The blur heuristic will occasionally misfire (e.g., a participant alt-tabs
  away right after hovering the embed). The `blurConfirmDelayMs` + "is active
  element an iframe" check reduces but doesn't eliminate this.
- It cannot distinguish click vs. drag vs. long-press inside the iframe —
  all register as a single point.
- If the embed step ends up using a plain (non–Embed Kit) iframe URL,
  navigation-path tracking silently gets zero events. Worth an explicit
  check/warning once the embed exists, rather than assuming it's working.
