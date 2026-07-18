import { useRef, useState, useEffect, useCallback } from "react";

/**
 * useClickTracking(containerRef, options)
 * ---------------------------------------------------------
 * Records participant interactions with an embedded prototype:
 *   - Click position (approximate, via the blur+mousemove heuristic —
 *     see FIGMA_EMBED_CONTRACT.md for why direct click capture inside
 *     a cross-origin iframe isn't possible)
 *   - Timestamps
 *   - Navigation path (via Figma Embed Kit postMessage events)
 *
 * INPUT IT DEPENDS ON (not yet built):
 *   containerRef  — a ref to the div wrapping the Figma iframe embed
 *   options.screenId — current screen/node id, ideally driven by the
 *                       embed step's own navigation state
 *
 * OUTPUT SHAPE (matches the Heatmap component's input contract):
 *   events: [{ id, sessionId, screenId, x, y, timestamp }]  // x/y normalized 0–1
 *   navigationPath: [{ screenId, enteredAt }]
 *
 * PERSISTENCE:
 * This hook does NOT decide where data is stored (browser localStorage vs.
 * the local SQLite backend isn't built yet). Instead it batches events and
 * calls `options.onFlush(batch)` every `flushIntervalMs`. Wire `onFlush` to
 * whatever local persistence exists once that step is built — e.g.:
 *
 *   useClickTracking(containerRef, {
 *     sessionId,
 *     screenId,
 *     onFlush: (batch) => fetch("/api/sessions/" + sessionId + "/events", {
 *       method: "POST",
 *       body: JSON.stringify(batch),
 *     }),
 *   });
 */
export function useClickTracking(containerRef, options) {
  const {
    sessionId,
    screenId,
    onFlush,
    flushIntervalMs = 5000,
    blurConfirmDelayMs = 120, // debounce to avoid false positives from alt-tab, devtools, etc.
  } = options;

  const [events, setEvents] = useState([]);
  const [navigationPath, setNavigationPath] = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  const lastMousePos = useRef(null); // { clientX, clientY } — most recent position INSIDE the container
  const pendingBatch = useRef([]);
  const currentScreenIdRef = useRef(screenId);

  useEffect(() => {
    currentScreenIdRef.current = screenId;
  }, [screenId]);

  const recordEvent = useCallback(
    (clientX, clientY) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Ignore if the last known position wasn't actually over the container
      // (guards against blur events unrelated to the embed, e.g. switching apps).
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }

      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        screenId: currentScreenIdRef.current,
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        timestamp: Date.now(),
      };

      setEvents((prev) => [...prev, event]);
      pendingBatch.current.push(event);
    },
    [containerRef, sessionId]
  );

  // --- Track mouse position while it's over the container ------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      lastMousePos.current = { clientX: e.clientX, clientY: e.clientY };
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [containerRef]);

  // --- Blur heuristic: a click landed inside the iframe if the window -----
  // --- loses focus shortly after the mouse was last seen over it. ---------
  useEffect(() => {
    const handleBlur = () => {
      const pos = lastMousePos.current;
      if (!pos) return;

      // Small delay + re-check that focus actually moved into an iframe,
      // to reduce false positives from unrelated OS-level focus changes.
      window.setTimeout(() => {
        const activeIsIframe = document.activeElement?.tagName === "IFRAME";
        if (activeIsIframe) {
          recordEvent(pos.clientX, pos.clientY);
        }
      }, blurConfirmDelayMs);
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [recordEvent, blurConfirmDelayMs]);

  // --- Navigation path via Figma Embed Kit postMessage ---------------------
  // ASSUMPTION: message shape per FIGMA_EMBED_CONTRACT.md — confirm once the
  // embed step is built and adjust this handler if Figma's actual fields differ.
  useEffect(() => {
    const handleFigmaMessage = (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "NEW_STATE" || !msg.data) return;

      const nextScreenId = msg.data.presentedNodeId ?? msg.data.currentPageId;
      if (!nextScreenId) return;

      currentScreenIdRef.current = nextScreenId;
      setNavigationPath((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.screenId === nextScreenId) return prev; // no real change
        return [...prev, { screenId: nextScreenId, enteredAt: Date.now() }];
      });
    };

    window.addEventListener("message", handleFigmaMessage);
    return () => window.removeEventListener("message", handleFigmaMessage);
  }, []);

  // --- Batch flushing --------------------------------------------------------
  useEffect(() => {
    if (!onFlush) return;
    setIsTracking(true);

    const interval = window.setInterval(() => {
      if (pendingBatch.current.length === 0) return;
      const batch = pendingBatch.current;
      pendingBatch.current = [];
      onFlush(batch);
    }, flushIntervalMs);

    return () => {
      window.clearInterval(interval);
      setIsTracking(false);
      // Flush anything left on unmount so short sessions aren't lost.
      if (pendingBatch.current.length > 0 && onFlush) {
        onFlush(pendingBatch.current);
        pendingBatch.current = [];
      }
    };
  }, [onFlush, flushIntervalMs]);

  return { events, navigationPath, isTracking };
}
