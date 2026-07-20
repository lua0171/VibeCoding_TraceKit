import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Play, Lock, CheckCircle, XCircle, AlertCircle, Sparkles, Download, Info } from 'lucide-react';
import { db, type Hypothesis, type Study, type Session } from '../db/db';
import { runAnalysisLoop } from '../lib/analysis';
import { Heatmap, type HeatmapEvent } from './Heatmap';

interface StudyResultsPageProps {
  studyId: string;
  onBack: () => void;
}

export const StudyResultsPage: React.FC<StudyResultsPageProps> = ({ studyId, onBack }) => {
  const [study, setStudy] = useState<Study | null>(null);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const s = await db.getStudyById(studyId);
      setStudy(s);
      const h = await db.getHypothesesByStudy(studyId);
      setHypotheses(h);
      const sess = await db.getSessionsByStudy(studyId);
      setSessions(sess);

      // Extract unique screens visited
      const screens = new Set<string>();
      sess.forEach(session => {
        session.events.forEach(e => {
          if (e.screenId) screens.add(e.screenId);
          if (e.type === 'navigation' && e.toNodeId) screens.add(e.toNodeId);
        });
      });
      const screenList = Array.from(screens);
      if (screenList.length > 0 && !selectedScreen) {
        setSelectedScreen(screenList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [studyId]);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setError('');
    try {
      const updated = await runAnalysisLoop(studyId);
      setHypotheses(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to run analysis. Make sure Ollama is running on port 11434 with llama3 installed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleLock = async (id: string) => {
    const target = hypotheses.find(h => h.id === id);
    if (!target) return;
    
    const updated = hypotheses.map(h => h.id === id ? { ...h, status: 'closed' as const } : h);
    await db.saveHypotheses(updated);
    setHypotheses(updated);
  };

  // Compile list of unique screen nodes from session data
  const uniqueScreens = useMemo(() => {
    const screens = new Set<string>();
    sessions.forEach(s => {
      s.events.forEach(e => {
        if (e.screenId) screens.add(e.screenId);
        if (e.type === 'navigation' && e.toNodeId) screens.add(e.toNodeId);
      });
    });
    return Array.from(screens);
  }, [sessions]);

  // Construct dynamic HeatmapData contract
  const heatmapData = useMemo(() => {
    if (!selectedScreen || sessions.length === 0) return null;

    const participants = sessions.map(s => ({
      id: s.id,
      label: `Participant ${s.id.slice(-4)}`
    }));

    const events: HeatmapEvent[] = [];
    sessions.forEach(s => {
      s.events.forEach((e, idx) => {
        if (e.type === 'click' && e.screenId === selectedScreen && e.x !== undefined && e.y !== undefined) {
          events.push({
            id: `ev_${idx}_${s.id}`,
            sessionId: s.id,
            x: e.x,
            y: e.y,
            timestamp: e.timestamp,
            label: e.nodeId
          });
        }
      });
    });

    const frameName = study?.importedPrototype?.frames?.find(f => f.id === selectedScreen)?.name || `Figma Frame Node: ${selectedScreen}`;

    return {
      screen: {
        id: selectedScreen,
        name: frameName,
        imageUrl: '', // blank since we will use the live iframe rendering
        width: 960,
        height: 640
      },
      participants,
      events
    };
  }, [selectedScreen, sessions, study]);

  if (!study) return <div style={{ padding: '24px' }}>Loading...</div>;

  const getStatusIcon = (status: Hypothesis['status']) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} color="var(--success)" />;
      case 'refuted': return <XCircle size={16} color="var(--error)" />;
      case 'inconclusive': return <AlertCircle size={16} color="var(--warning)" />;
      case 'closed': return <Lock size={16} color="var(--text-muted)" />;
      default: return <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)' }} />;
    }
  };

  return (
    <div className="study-results-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="results-header" style={{ marginBottom: '32px' }}>
        <button 
          className="btn btn-secondary no-print" 
          onClick={onBack} 
          style={{ marginBottom: '16px' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginTop: '2px', letterSpacing: '-0.5px' }}>
              Results: {study.title}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {study.description}
            </p>
          </div>
          <button 
            className="btn btn-primary no-print"
            onClick={() => window.print()}
          >
            <Download size={16} /> Export to PDF
          </button>
        </div>
      </div>

      <div className="results-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Heatmaps Area */}
        <section style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Click Heatmaps</h2>
            
            {uniqueScreens.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="no-print">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Select Screen:</span>
                <select
                  value={selectedScreen}
                  onChange={(e) => setSelectedScreen(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  {uniqueScreens.map(scrId => (
                    <option key={scrId} value={scrId}>
                      Figma Node {scrId}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {sessions.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              border: '1px solid var(--border)',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>No Sessions Recorded Yet</strong>
                <span>Please share the participant link with users to gather usability session tracking click logs, which will automatically generate heatmaps here.</span>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {heatmapData ? (
                <Heatmap data={heatmapData} figmaUrl={study.figmaUrl} importedPrototype={study.importedPrototype} />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No click events recorded for the selected screen yet.
                </div>
              )}
            </div>
          )}
        </section>

        {/* AI Hypothesis Loop */}
        <section className="print-break-before" style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--primary)" /> 
                AI Hypothesis Validation Loop
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Evaluates existing hypotheses and discovers new ones based on session data.
              </p>
            </div>
            
            <button 
              className="btn btn-primary no-print"
              onClick={handleRunAnalysis}
              disabled={isRunning}
            >
              {isRunning ? 'Analyzing (This takes a moment)...' : <><Play size={16}/> Run AI Analysis Loop</>}
            </button>
          </div>

          {error && (
            <div className="no-print" style={{ padding: '12px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {hypotheses.length === 0 && !isRunning && (
            <div className="no-print" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              No hypotheses generated or seeded yet. Click "Run AI Analysis Loop" to start.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hypotheses.map(h => (
              <div key={h.id} style={{ 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '16px',
                backgroundColor: h.status === 'closed' ? 'var(--bg)' : 'transparent',
                opacity: h.status === 'closed' ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>{getStatusIcon(h.status)}</div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: h.status === 'closed' ? 'var(--text-muted)' : 'var(--text)' }}>
                        {h.content}
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', padding: '2px 6px', backgroundColor: 'var(--bg)', borderRadius: '4px' }}>
                          {h.origin === 'initial' ? 'User Generated' : 'AI Discovery'}
                        </span>
                        <span>Confidence: {h.confidenceScore}%</span>
                        <span className="print-hide" style={{ textTransform: 'capitalize' }}>Status: {h.status}</span>
                        {h.status === 'open' && <span className="print-only-inline" style={{ textTransform: 'capitalize', color: 'var(--warning)', fontWeight: 600 }}>Status: Unresolved</span>}
                      </div>
                      
                      {h.evidence && h.evidence.length > 0 && (
                        <div style={{ marginTop: '12px', fontSize: '13px' }}>
                          <strong>Evidence:</strong>
                          <ul style={{ paddingLeft: '20px', marginTop: '4px', color: 'var(--text-muted)' }}>
                            {h.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {h.status !== 'closed' && h.confidenceScore > 80 && (
                    <button 
                      className="btn btn-secondary no-print"
                      onClick={() => handleLock(h.id)}
                      style={{ fontSize: '12px', padding: '6px 10px', height: 'auto' }}
                    >
                      <Lock size={12} style={{ marginRight: '4px' }} />
                      Lock & Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
