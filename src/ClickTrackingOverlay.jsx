import React, { useRef } from "react";
import { useClickTracking } from "./useClickTracking";

/**
 * <ClickTrackingOverlay />
 * ---------------------------------------------------------
 * Wraps whatever the Figma Embed step renders (currently a stub, see
 * StubFigmaEmbed below) and records interactions via useClickTracking.
 *
 * REFACTOR POINT: once the real embed component exists, replace
 * <StubFigmaEmbed /> with it. As long as it renders inside the ref'd
 * container and — ideally — reports its own screenId via props/context,
 * nothing in this file's tracking logic needs to change.
 */
export default function ClickTrackingOverlay({
  sessionId,
  initialScreenId = "screen-unknown",
  onFlush,
}) {
  const containerRef = useRef(null);

  const { events, navigationPath, isTracking } = useClickTracking(containerRef, {
    sessionId,
    screenId: initialScreenId,
    onFlush,
  });

  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isTracking ? "bg-green-500" : "bg-slate-300"
            }`}
          />
          {isTracking ? "Recording locally" : "Idle"}
        </span>
        <span>{events.length} events captured</span>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        style={{ height: 520 }}
      >
        {/* REPLACE with the real Figma Embed Kit iframe once that step exists.
            See FIGMA_EMBED_CONTRACT.md for the required embed URL format. */}
        <StubFigmaEmbed />
      </div>

      {navigationPath.length > 0 && (
        <details className="rounded-lg border border-slate-200 p-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">
            Navigation path ({navigationPath.length} screens)
          </summary>
          <ol className="mt-1 flex flex-col gap-0.5 pl-4 list-decimal">
            {navigationPath.map((step, i) => (
              <li key={i}>
                {step.screenId} — {new Date(step.enteredAt).toLocaleTimeString()}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

/**
 * StubFigmaEmbed
 * ---------------------------------------------------------
 * Placeholder standing in for the not-yet-built Figma Embed module.
 * A real iframe embed is cross-origin and can't be simulated with a normal
 * <iframe>, so this renders an inert placeholder — its only job is to
 * occupy the container so the overlay/tracking demo has something to
 * point at. DELETE this once the real embed step exists.
 */
function StubFigmaEmbed() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
      Figma embed goes here (not built yet)
    </div>
  );
}
