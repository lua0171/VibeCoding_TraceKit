# Contract: what the Figma Embed step must provide

Click Tracking is built against this interface. The embed step doesn't exist yet,
so these are the assumptions to confirm/refactor once it's built.

## 1. A container ref wrapping the iframe

```jsx
<div ref={embedContainerRef}>
  <iframe src={figmaEmbedUrl} ... />
</div>
```

Click Tracking attaches its listeners to this container, NOT to the iframe
itself — you cannot attach a click listener to a cross-origin iframe's
internal document from the parent page. This is a hard browser security
restriction, not an oversight to fix later.

## 2. The Figma Embed Kit URL, not a plain iframe src

For navigation-path tracking to work at all, the embed must use Figma's
official Embed Kit URL format (`https://www.figma.com/embed?embed_host=...&url=...`),
NOT a raw `figma.com/proto/...` link in a plain iframe. Only the Embed Kit
sends `postMessage` events to the parent on navigation. If the embed step
ends up using a plain iframe instead, navigation-path tracking (not click
tracking) will need to be cut from V1 or replaced with a manual "which
screen is this" dropdown the participant confirms.

## 3. Expected postMessage shape from the embed (per Figma's Embed Kit)

```js
// event.data when Figma posts a navigation update
{
  type: "NEW_STATE",
  data: {
    currentPageId: string,
    currentPageName: string,
    presentedNodeId: string,   // the frame/screen currently shown
    // ...other fields Figma includes, currently unused here
  }
}
```

`useClickTracking` listens for `window.addEventListener("message", ...)` and
filters for `event.data.type === "NEW_STATE"`. **This shape is assumed from
Figma's public Embed Kit docs, not yet verified against a real embed in this
project** — confirm the exact field names once the embed step is built, and
adjust the single `handleFigmaMessage` function in the hook if they differ.

## 4. A `screenId` the embed step reports

Until real navigation events are wired up, the embed step must at minimum
provide a `screenId` string identifying what's currently on screen (either
from the postMessage data above, or a manual value). This flows straight
into every recorded click event and into the navigation path array.

## What Click Tracking does NOT assume

- It does not assume pixel dimensions of the iframe beyond what it can read
  from the container's own bounding box at click time (`getBoundingClientRect`).
- It does not assume the embed is same-origin or scriptable in any way.
- It does not assume where events get persisted — that's left to the caller
  (see `onFlush` in `useClickTracking.js`), since local DB (SQLite) plumbing
  isn't built yet either.
