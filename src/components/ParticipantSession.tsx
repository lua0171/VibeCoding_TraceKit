import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { db, type Study } from '../db/db';
import { getEmbedUrl } from '../lib/figma';

interface ParticipantSessionProps {
  studyId: string;
}

type Stage = 'loading' | 'not-found' | 'intro' | 'active' | 'done';

const FIGMA_ORIGIN = 'https://www.figma.com';

export const ParticipantSession: React.FC<ParticipantSessionProps> = ({ studyId }) => {
  const [stage, setStage] = useState<Stage>('loading');
  const [study, setStudy] = useState<Study | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const previousNodeId = useRef<string | null>(null);

  useEffect(() => {
    const fetchStudy = async () => {
      const data = await db.getStudyById(studyId);
      if (!data || !data.figmaUrl) {
        setStage('not-found');
        return;
      }
      setStudy(data);
      setStage('intro');
    };
    fetchStudy();
  }, [studyId]);

  // Listen for click/navigation events from the embedded prototype once active.
  useEffect(() => {
    if (stage !== 'active' || !sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== FIGMA_ORIGIN) return;
      const { type, data } = event.data || {};

      if (type === 'MOUSE_PRESS_OR_RELEASE') {
        db.appendEvent(sessionId, {
          type: 'click',
          nodeId: data.targetNodeId,
          timestamp: new Date().toISOString(),
          x: data.targetNodeMousePosition?.x,
          y: data.targetNodeMousePosition?.y,
          // Figma calls this "handled": whether the click hit an interactive hotspot
          isHotspot: data.handled,
        });
      } else if (type === 'PRESENTED_NODE_CHANGED') {
        const toNodeId = data.presentedNodeId;
        db.appendEvent(sessionId, {
          type: 'navigation',
          nodeId: toNodeId,
          timestamp: new Date().toISOString(),
          fromNodeId: previousNodeId.current ?? undefined,
          toNodeId,
        });
        previousNodeId.current = toNodeId;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [stage, sessionId]);

  const handleStart = async () => {
    const session = await db.createSession(studyId);
    setSessionId(session.id);
    setIframeLoading(true);
    setStage('active');
  };

  const handleFinish = async () => {
    if (sessionId) await db.endSession(sessionId);
    if (study) await db.updateStudy(study.id, { completedParticipants: study.completedParticipants + 1 });
    setStage('done');
  };

  if (stage === 'loading') {
    return (
      <CenteredMessage>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading study...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </CenteredMessage>
    );
  }

  if (stage === 'not-found') {
    return (
      <CenteredMessage>
        <h1 style={{ fontSize: '20px' }}>This study isn't ready yet</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '360px', textAlign: 'center' }}>
          The link you followed doesn't point to an active usability study with a configured prototype. Please check the link with the person who shared it.
        </p>
      </CenteredMessage>
    );
  }

  if (stage === 'intro' && study) {
    return (
      <CenteredMessage>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '13px', fontWeight: 500 }}>
          <ShieldCheck size={16} /> Your interactions stay on this device
        </div>
        <h1 style={{ fontSize: '24px', textAlign: 'center' }}>{study.title}</h1>
        {study.description && (
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', textAlign: 'center', lineHeight: 1.5 }}>
            {study.description}
          </p>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Click through the prototype below. When you're done, use the "I'm done" button.
        </p>
        <button className="btn btn-primary" onClick={handleStart}>
          Start
        </button>
      </CenteredMessage>
    );
  }

  if (stage === 'done') {
    return (
      <CenteredMessage>
        <h1 style={{ fontSize: '24px' }}>Thanks for taking part!</h1>
        <p style={{ color: 'var(--text-muted)' }}>You can close this tab now.</p>
      </CenteredMessage>
    );
  }

  // stage === 'active'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--card-bg)',
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>{study?.title}</span>
        <button className="btn btn-primary" onClick={handleFinish}>
          I'm done
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative', backgroundColor: 'black' }}>
        {iframeLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#9ca3af',
          }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '12px' }}>Loading prototype...</span>
          </div>
        )}
        <iframe
          src={getEmbedUrl(study?.figmaUrl || '')}
          title="Usability test prototype"
          allowFullScreen
          onLoad={() => setIframeLoading(false)}
          style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
        />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const CenteredMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '16px', minHeight: '100vh', padding: '24px', textAlign: 'center',
  }}>
    {children}
  </div>
);
