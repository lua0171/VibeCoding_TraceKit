import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PrototypeViewer } from './PrototypeViewer';

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
 * INPUT CONTRACT (see mockHeatmapData.ts for the concrete shape):
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

// --- Exported types for the heatmap data contract --------------------------

export interface HeatmapScreen {
  id: string;
  name: string;
  /** URL to a screenshot/export of the Figma frame */
  imageUrl: string;
  width: number;
  height: number;
}

export interface HeatmapParticipant {
  id: string;
  label: string;
}

export interface HeatmapEvent {
  id: string;
  /** Maps to a participant id */
  sessionId: string;
  /** Normalized 0–1 horizontal position */
  x: number;
  /** Normalized 0–1 vertical position */
  y: number;
  /** Timestamp in ms since epoch or ISO string */
  timestamp: number | string;
}

export interface HeatmapData {
  screen: HeatmapScreen;
  participants: HeatmapParticipant[];
  events: HeatmapEvent[];
}

// --- Constants -------------------------------------------------------------

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const HOVER_RADIUS_PX = 28; // radius (in canvas px) used to gather nearby events on hover

// --- Component -------------------------------------------------------------
import { type Study } from '../db/db';

interface HeatmapProps {
  data: HeatmapData;
  figmaUrl?: string;
  importedPrototype?: Study['importedPrototype'];
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, figmaUrl, importedPrototype }) => {
  const { screen, participants, events } = data;

  const [activeParticipantIds, setActiveParticipantIds] = useState<Set<string>>(
    () => new Set(participants.map((p) => p.id))
  );
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ x: number; y: number; count: number; sessionCount: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (figmaUrl) {
      setImageLoaded(true);
    }
  }, [figmaUrl]);

  const filteredEvents = useMemo(
    () => events.filter((e) => activeParticipantIds.has(e.sessionId)),
    [events, activeParticipantIds]
  );

  const toggleParticipant = useCallback((id: string) => {
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (filteredEvents.length === 0) return;

    // Pass 1: accumulate radial-gradient "heat" per point onto an
    // offscreen alpha channel, additively.
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heatCtx = heatCanvas.getContext('2d');
    if (!heatCtx) return;

    const pointRadius = Math.max(width, height) * 0.045;

    filteredEvents.forEach((e) => {
      const px = e.x * width;
      const py = e.y * height;
      const gradient = heatCtx.createRadialGradient(px, py, 0, px, py, pointRadius);
      gradient.addColorStop(0, 'rgba(0,0,0,0.35)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
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
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, [drawHeatmap, imageLoaded]);

  // --- Hover overlay -------------------------------------------------------

  const handleMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--card-bg)',
      padding: '16px',
      fontFamily: 'var(--sans)',
      color: 'var(--text)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Click Heatmap</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{screen.name}</p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          padding: '4px',
        }}>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: zoom <= MIN_ZOOM ? 'default' : 'pointer',
              opacity: zoom <= MIN_ZOOM ? 0.3 : 1,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetZoom}
            style={{
              minWidth: '48px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              padding: '0 8px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            aria-label="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: zoom >= MAX_ZOOM ? 'default' : 'pointer',
              opacity: zoom >= MAX_ZOOM ? 0.3 : 1,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Heatmap canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'auto',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            maxHeight: '520px',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease',
              transform: `scale(${zoom})`,
            }}
          >
            {figmaUrl ? (
              <div 
                ref={imageRef as any}
                style={{ 
                  width: '960px', 
                  height: '640px', 
                  position: 'relative',
                  backgroundColor: '#000',
                  userSelect: 'none'
                }}
              >
                <PrototypeViewer
                  frameId={screen.id}
                  importedPrototype={importedPrototype}
                  figmaUrl={figmaUrl}
                  readOnly={true}
                />
              </div>
            ) : (
              <img
                ref={imageRef}
                src={screen.imageUrl}
                alt={`Screenshot of ${screen.name}`}
                onLoad={() => setImageLoaded(true)}
                style={{ display: 'block', maxWidth: 'none', userSelect: 'none' }}
                draggable={false}
              />
            )}
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ position: 'absolute', left: 0, top: 0, cursor: 'crosshair' }}
            />
            {hover && (
              <div
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  zIndex: 10,
                  transform: 'translateX(-50%) translateY(-100%)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--text)',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--text-inverse)',
                  boxShadow: 'var(--shadow-lg)',
                  left: hover.x,
                  top: hover.y - 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {hover.count} click{hover.count !== 1 ? 's' : ''} ·{' '}
                {hover.sessionCount} participant{hover.sessionCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Participant filter */}
        <aside style={{
          width: '176px',
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: '12px',
        }}>
          <div style={{
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}>
              Participants
            </span>
            <button
              type="button"
              onClick={toggleAll}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {allSelected ? 'Clear' : 'All'}
            </button>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none' }}>
            {participants.map((p) => {
              const checked = activeParticipantIds.has(p.id);
              return (
                <li key={p.id}>
                  <label style={{
                    display: 'flex',
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 6px',
                    fontSize: '14px',
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(p.id)}
                      style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ color: checked ? 'var(--text)' : 'var(--text-muted)' }}>
                      {p.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {filteredEvents.length} of {events.length} click events shown · data processed locally
      </p>
    </div>
  );
};

/**
 * Maps a 0–1 intensity value to an RGB color on a
 * cool-to-warm density scale (blue → yellow → red).
 */
function densityColor(t: number): { r: number; g: number; b: number } {
  if (t < 0.5) {
    const localT = t / 0.5;
    return lerpColor({ r: 37, g: 99, b: 235 }, { r: 250, g: 204, b: 21 }, localT); // blue -> yellow
  }
  const localT = (t - 0.5) / 0.5;
  return lerpColor({ r: 250, g: 204, b: 21 }, { r: 220, g: 38, b: 38 }, localT); // yellow -> red
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
