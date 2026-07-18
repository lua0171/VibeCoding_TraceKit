import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Lock, CheckCircle, XCircle, AlertCircle, Sparkles, Download } from 'lucide-react';
import { db, type Hypothesis, type Study } from '../db/db';
import { runAnalysisLoop } from '../lib/analysis';
import { HeatmapDemo } from './HeatmapDemo'; // Placeholder for the actual dynamic heatmap

interface StudyResultsPageProps {
  studyId: string;
  onBack: () => void;
}

export const StudyResultsPage: React.FC<StudyResultsPageProps> = ({ studyId, onBack }) => {
  const [study, setStudy] = useState<Study | null>(null);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const s = await db.getStudyById(studyId);
      setStudy(s);
      const h = await db.getHypothesesByStudy(studyId);
      setHypotheses(h);
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
    
    // Copy the list, update the one, save, update state
    const updated = hypotheses.map(h => h.id === id ? { ...h, status: 'closed' as const } : h);
    await db.saveHypotheses(updated);
    setHypotheses(updated);
  };

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
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Click Heatmaps</h2>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
             {/* Using HeatmapDemo as a placeholder for the real wired-up heatmap */}
            <HeatmapDemo />
          </div>
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
