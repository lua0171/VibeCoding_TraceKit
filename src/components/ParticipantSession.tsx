import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { db, type Study } from '../db/db';
import { PrototypeViewer } from './PrototypeViewer';

interface ParticipantSessionProps {
  studyId: string;
}

type Stage = 'loading' | 'not-found' | 'intro' | 'active' | 'done';

export const ParticipantSession: React.FC<ParticipantSessionProps> = ({ studyId }) => {
  const [stage, setStage] = useState<Stage>('loading');
  const [study, setStudy] = useState<Study | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);
  const [currentFrameId, setCurrentFrameId] = useState<string>('Home View');
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

  const activeTask = study?.tasks && study.tasks.length > 0 ? study.tasks[activeTaskIndex] : null;

  const handleNavigate = (toFrameId: string) => {
    if (sessionId) {
      db.appendEvent(sessionId, {
        type: 'navigation',
        nodeId: toFrameId,
        timestamp: new Date().toISOString(),
        fromNodeId: previousNodeId.current || undefined,
        toNodeId: toFrameId,
        taskId: activeTask?.id
      });
    }
    previousNodeId.current = toFrameId;
    setCurrentFrameId(toFrameId);
  };

  const handleViewerClick = (x: number, y: number, targetName: string, isHotspot: boolean) => {
    if (sessionId) {
      db.appendEvent(sessionId, {
        type: 'click',
        nodeId: targetName,
        timestamp: new Date().toISOString(),
        x,
        y,
        isHotspot,
        taskId: activeTask?.id,
        screenId: currentFrameId
      });
    }
  };

  const handleStart = async () => {
    const session = await db.createSession(studyId);
    setSessionId(session.id);
    setActiveTaskIndex(0);
    const firstTask = study?.tasks && study.tasks.length > 0 ? study.tasks[0] : null;
    const startFrame = firstTask?.startingFrameNodeId || 'Home View';
    setCurrentFrameId(startFrame);
    previousNodeId.current = startFrame;
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
        
        {study.tasks && study.tasks.length > 0 && (
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Tasks to complete ({study.tasks.length})
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              {study.tasks.map(t => (
                <li key={t.id} style={{ marginBottom: '4px' }}>
                  <strong>{t.title}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Click through the prototype as instructed. When you're done, complete the tasks.
        </p>
        <button className="btn btn-primary" onClick={handleStart}>
          Start Usability Study
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
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usability Study</span>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{study?.title}</span>
        </div>

        {activeTask && (
          <div style={{ 
            flex: 1, 
            maxWidth: '600px', 
            backgroundColor: 'var(--bg)', 
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              TASK {activeTaskIndex + 1} OF {study?.tasks?.length || 0}: <strong style={{ color: 'var(--text)' }}>{activeTask.title}</strong>
            </span>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {activeTask.instruction}
            </p>
          </div>
        )}

        <div>
          {study?.tasks && activeTaskIndex < study.tasks.length - 1 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                const nextIndex = activeTaskIndex + 1;
                setActiveTaskIndex(nextIndex);
                const nextTask = study?.tasks ? study.tasks[nextIndex] : null;
                const startFrame = nextTask?.startingFrameNodeId || 'Home View';
                setCurrentFrameId(startFrame);
                previousNodeId.current = startFrame;
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Next Task ➔
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleFinish}>
              Finish Study
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', backgroundColor: 'black' }}>
        <PrototypeViewer
          frameId={currentFrameId}
          figmaUrl={study?.figmaUrl}
          onNavigate={handleNavigate}
          onClick={handleViewerClick}
        />
      </div>
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
