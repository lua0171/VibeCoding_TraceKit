import React, { useRef } from 'react';
import { useClickTracking } from '../lib/useClickTracking';
import type { TrackedEvent } from '../db/db';

/**
 * <ClickTrackingOverlay />
 * ---------------------------------------------------------
 * Wraps a Figma embed (passed as `children`) and records interactions
 * via useClickTracking.
 *
 * Usage:
 *   <ClickTrackingOverlay sessionId={session.id} studyId={study.id}>
 *     <iframe src={embedUrl} ... />
 *   </ClickTrackingOverlay>
 *
 * The overlay provides a status bar showing recording state and event
 * count, plus an expandable navigation path log.
 */

interface ClickTrackingOverlayProps {
  sessionId: string;
  studyId: string;
  initialScreenId?: string;
  /** Optional extra flush callback beyond db persistence. */
  onFlush?: (batch: TrackedEvent[]) => void;
  children: React.ReactNode;
}

export const ClickTrackingOverlay: React.FC<ClickTrackingOverlayProps> = ({
  sessionId,
  initialScreenId = 'screen-unknown',
  onFlush,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { events, navigationPath, isTracking } = useClickTracking(containerRef, {
    sessionId,
    screenId: initialScreenId,
    onFlush,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--sans)' }}>
      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card-bg)',
        padding: '8px 12px',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isTracking ? 'var(--success)' : 'var(--text-muted)',
          }} />
          {isTracking ? 'Recording locally' : 'Idle'}
        </span>
        <span>{events.length} events captured</span>
      </div>

      {/* Embed container — children (the real iframe) render here */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          height: '520px',
        }}
      >
        {children}
      </div>

      {/* Navigation path log */}
      {navigationPath.length > 0 && (
        <details style={{
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: '8px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}>
          <summary style={{
            cursor: 'pointer',
            fontWeight: 500,
            color: 'var(--text)',
          }}>
            Navigation path ({navigationPath.length} screens)
          </summary>
          <ol style={{
            marginTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            paddingLeft: '16px',
            listStyleType: 'decimal',
          }}>
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
};
