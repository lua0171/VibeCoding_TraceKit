import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/**
 * <Heatmap />
 * ---------------------------------------------------------
 * Renders a click-density heatmap over a study screen (e.g. a screenshot
 * of the embedded Figma frame), with hover inspection, zoom, and
 * participant filtering — covering the four V1 acceptance criteria:
 *   - Click heatmap
 *   - Hover overlay
 *   - Zoom
 *   - Filter participants
 *
 * INPUT CONTRACT (see mockHeatmapData.js for the concrete shape):
 *   data = {
 *     screen: { id, name, imageUrl, width, height },
 *     participants: [{ id, label }],
 *     events: [{ id, sessionId, x, y, timestamp }]  // x/y normalized 0–1
 *   }
 *
 * REFACTOR NOTE:
 * This component does not know or care where `data` came from. Once the
 * real backend endpoint exists, fetch the same shape and pass it in as
 * the `data` prop — nothing inside this file needs to change unless the
 * shape itself changes.
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const HOVER_RADIUS_PX = 28; // radius (in canvas px) used to gather nearby events on hover

export default function Heatmap({ data }) {
  const { screen, participants, events } = data;

  const [activeParticipantIds, setActiveParticipantIds] = useState(
    () => new Set(participants.map((p) => p.id))
  );
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState(null); // { x, y, count, sessions }

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const filteredEvents = useMemo(
    () => events.filter((e) => activeParticipantIds.has(e.sessionId)),
    [events, activeParticipantIds]
  );

  const toggleParticipant = useCallback((id) => {
    setActiveParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allSelected = activeParticipantIds.size === participants.length;
  const toggleAll = () => {
    setActiveParticipantIds(
      allSelected ? new Set() : new Set(participants.map((p) => p.id))
    );
  };

  // --- Canvas heatmap rendering -------------------------------------------

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (filteredEvents.length === 0) return;

    // Pass 1: accumulate radial-gradient "heat" per point onto an
    // offscreen alpha channel, additively.
    const heatCanvas = document.createElement("canvas");
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heatCtx = heatCanvas.getContext("2d");

    const pointRadius = Math.max(width, height) * 0.045;

    filteredEvents.forEach((e) => {
      const px = e.x * width;
      const py = e.y * height;
      const gradient = heatCtx.createRadialGradient(px, py, 0, px, py, pointRadius);
      gradient.addColorStop(0, "rgba(0,0,0,0.35)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      heatCtx.fillStyle = gradient;
      heatCtx.beginPath();
      heatCtx.arc(px, py, pointRadius, 0, Math.PI * 2);
      heatCtx.fill();
    });

    // Pass 2: recolor the accumulated alpha mask into a
    // blue -> yellow -> red density scale (matches PRD accent palette
    // at the cool end, escalates to warning colors at high density).
    const imgData = heatCtx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) continue;

      const t = Math.min(alpha / 180, 1); // normalized intensity 0–1
      const color = densityColor(t);
      pixels[i] = color.r;
      pixels[i + 1] = color.g;
      pixels[i + 2] = color.b;
      pixels[i + 3] = Math.min(alpha * 1.6, 210);
    }
    heatCtx.putImageData(imgData, 0, 0);

    ctx.drawImage(heatCanvas, 0, 0);
  }, [filteredEvents]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap, zoom, imageLoaded]);

  // Keep canvas pixel size in sync with the rendered image size
  useEffect(() => {
    const syncSize = () => {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      if (!img || !canvas) return;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      drawHeatmap();
    };
    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, [drawHeatmap, imageLoaded]);

  // --- Hover overlay -------------------------------------------------------

  const handleMouseMove = (evt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = evt.clientX - rect.left;
    const cy = evt.clientY - rect.top;

    const nearby = filteredEvents.filter((e) => {
      const px = e.x * canvas.width;
      const py = e.y * canvas.height;
      const dist = Math.hypot(px - cx, py - cy);
      return dist <= HOVER_RADIUS_PX;
    });

    if (nearby.length === 0) {
      setHover(null);
      return;
    }

    const uniqueSessions = new Set(nearby.map((e) => e.sessionId));
    setHover({
      x: cx,
      y: cy,
      count: nearby.length,
      sessionCount: uniqueSessions.size,
    });
  };

  const handleMouseLeave = () => setHover(null);

  // --- Zoom ----------------------------------------------------------------

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => setZoom(1);

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 font-sans text-slate-800"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Click Heatmap</h2>
          <p className="text-xs text-slate-500">{screen.name}</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="h-7 w-7 rounded-md text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="min-w-[3rem] rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm"
            aria-label="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="h-7 w-7 rounded-md text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Heatmap canvas */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-100"
          style={{ maxHeight: 520 }}
        >
          <div
            className="relative inline-block origin-top-left transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              ref={imageRef}
              src={screen.imageUrl}
              alt={`Screenshot of ${screen.name}`}
              onLoad={() => setImageLoaded(true)}
              className="block max-w-none select-none"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="absolute left-0 top-0 cursor-crosshair"
            />
            {hover && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg"
                style={{ left: hover.x, top: hover.y - 8 }}
              >
                {hover.count} click{hover.count !== 1 ? "s" : ""} ·{" "}
                {hover.sessionCount} participant{hover.sessionCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Participant filter */}
        <aside className="w-44 shrink-0 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Participants
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {allSelected ? "Clear" : "All"}
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {participants.map((p) => {
              const checked = activeParticipantIds.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(p.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={checked ? "text-slate-700" : "text-slate-400"}>
                      {p.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <p className="text-xs text-slate-400">
        {filteredEvents.length} of {events.length} click events shown · data processed locally
      </p>
    </div>
  );
}

/**
 * Maps a 0–1 intensity value to an RGB color on a
 * cool-to-warm density scale (blue → yellow → red).
 */
function densityColor(t) {
  if (t < 0.5) {
    const localT = t / 0.5;
    return lerpColor({ r: 37, g: 99, b: 235 }, { r: 250, g: 204, b: 21 }, localT); // blue -> yellow
  }
  const localT = (t - 0.5) / 0.5;
  return lerpColor({ r: 250, g: 204, b: 21 }, { r: 220, g: 38, b: 38 }, localT); // yellow -> red
}

function lerpColor(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
