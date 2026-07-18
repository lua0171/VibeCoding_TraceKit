import { useRef, useState, useEffect, useCallback } from 'react';
import { db, type TrackedEvent } from '../db/db';

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
 * INPUT IT DEPENDS ON:
 *   containerRef  — a ref to the div wrapping the Figma iframe embed
 *   options.sessionId — the active session id for persistence via db
 *   options.screenId — current screen/node id, ideally driven by the
 *                       embed step's own navigation state
 *
 * OUTPUT SHAPE:
 *   events: TrackedEvent[]           — all events recorded this session
 *   navigationPath: NavigationStep[] — screen-to-screen transitions
 *   isTracking: boolean              — whether the hook is actively recording
 *
 * PERSISTENCE:
 * Events are persisted via db.appendEvent() (localStorage-backed mock).
 * A batch flush runs every `flushIntervalMs` as a secondary safety net,
 * calling `options.onFlush` if provided. Each individual event is also
 * written to the db immediately so short sessions aren't lost.
 */

const FIGMA_ORIGIN = 'https://www.figma.com';

export interface NavigationStep {
  screenId: string;
  enteredAt: number;
}

export interface UseClickTrackingOptions {
  sessionId: string;
  screenId: string;
  /** Optional extra flush callback (e.g. analytics). Events are always persisted via db.appendEvent. */
  onFlush?: (batch: TrackedEvent[]) => void;
  /** Milliseconds between batch flushes to onFlush. Default: 5000. */
  flushIntervalMs?: number;
  /** Debounce delay to reduce false-positive blur detections. Default: 120. */
  blurConfirmDelayMs?: number;
}

export interface UseClickTrackingResult {
  events: TrackedEvent[];
  navigationPath: NavigationStep[];
  isTracking: boolean;
}

export function useClickTracking(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseClickTrackingOptions
): UseClickTrackingResult {
  const {
    sessionId,
    screenId,
    onFlush,
    flushIntervalMs = 5000,
    blurConfirmDelayMs = 120,
  } = options;

  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [navigationPath, setNavigationPath] = useState<NavigationStep[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  const lastMousePos = useRef<{ clientX: number; clientY: number } | null>(null);
  const pendingBatch = useRef<TrackedEvent[]>([]);
  const currentScreenIdRef = useRef(screenId);
  const previousNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentScreenIdRef.current = screenId;
  }, [screenId]);

  const recordEvent = useCallback(
    (clientX: number, clientY: number) => {
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

      const trackedEvent: TrackedEvent = {
        type: 'click',
        nodeId: currentScreenIdRef.current,
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        timestamp: new Date().toISOString(),
      };

      setEvents((prev) => [...prev, trackedEvent]);
      pendingBatch.current.push(trackedEvent);

      // Persist immediately — clicks can fire in quick succession and
      // db.appendEvent intentionally skips the simulated delay.
      db.appendEvent(sessionId, trackedEvent);
    },
    [containerRef, sessionId]
  );

  // --- Track mouse position while it's over the container ------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { clientX: e.clientX, clientY: e.clientY };
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
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
        const activeIsIframe = document.activeElement?.tagName === 'IFRAME';
        if (activeIsIframe) {
          recordEvent(pos.clientX, pos.clientY);
        }
      }, blurConfirmDelayMs);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [recordEvent, blurConfirmDelayMs]);

  // --- Navigation path via Figma Embed Kit postMessage ---------------------
  // Uses the real Embed Kit 2.0 event types (MOUSE_PRESS_OR_RELEASE,
  // PRESENTED_NODE_CHANGED) — verified against Figma's docs and matching
  // ParticipantSession.tsx's existing listener.
  useEffect(() => {
    const handleFigmaMessage = (event: MessageEvent) => {
      if (event.origin !== FIGMA_ORIGIN) return;
      const { type, data } = event.data || {};

      if (type === 'MOUSE_PRESS_OR_RELEASE' && data) {
        const clickEvent: TrackedEvent = {
          type: 'click',
          nodeId: data.targetNodeId,
          timestamp: new Date().toISOString(),
          x: data.targetNodeMousePosition?.x,
          y: data.targetNodeMousePosition?.y,
          isHotspot: data.handled,
        };
        setEvents((prev) => [...prev, clickEvent]);
        pendingBatch.current.push(clickEvent);
        db.appendEvent(sessionId, clickEvent);
      } else if (type === 'PRESENTED_NODE_CHANGED' && data) {
        const toNodeId = data.presentedNodeId;
        if (!toNodeId) return;

        const navEvent: TrackedEvent = {
          type: 'navigation',
          nodeId: toNodeId,
          timestamp: new Date().toISOString(),
          fromNodeId: previousNodeIdRef.current ?? undefined,
          toNodeId,
        };
        previousNodeIdRef.current = toNodeId;

        setEvents((prev) => [...prev, navEvent]);
        db.appendEvent(sessionId, navEvent);

        currentScreenIdRef.current = toNodeId;
        setNavigationPath((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.screenId === toNodeId) return prev; // no real change
          return [...prev, { screenId: toNodeId, enteredAt: Date.now() }];
        });
      }
    };

    window.addEventListener('message', handleFigmaMessage);
    return () => window.removeEventListener('message', handleFigmaMessage);
  }, [sessionId]);

  // --- Batch flushing (secondary safety net for onFlush callback) ----------
  useEffect(() => {
    setIsTracking(true);

    const interval = window.setInterval(() => {
      if (pendingBatch.current.length === 0) return;
      const batch = pendingBatch.current;
      pendingBatch.current = [];
      if (onFlush) onFlush(batch);
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
