import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Monitor, Smartphone, Tablet, Shield, Loader2, AlertCircle, Link2, Check } from 'lucide-react';
import { db, type Study } from '../db/db';
import { getEmbedUrl, isValidFigmaUrl } from '../lib/figma';

interface StudyDesignPageProps {
  studyId: string;
  onBack: () => void;
}

type ViewportSize = 'desktop' | 'mobile' | 'tablet';

export const StudyDesignPage: React.FC<StudyDesignPageProps> = ({
  studyId,
  onBack,
}) => {
  const [study, setStudy] = useState<Study | null>(null);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [linkCopied, setLinkCopied] = useState(false);

  // Load study details
  useEffect(() => {
    const fetchStudy = async () => {
      setIsLoading(true);
      try {
        const data = await db.getStudyById(studyId);
        if (data) {
          setStudy(data);
          setFigmaUrl(data.figmaUrl || '');
        }
      } catch (e) {
        console.error('Failed to load study for design:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudy();
  }, [studyId]);

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFigmaUrl(e.target.value);
    if (feedback) setFeedback(null);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validate empty input (allow clear)
    if (!figmaUrl.trim()) {
      setIsSaving(true);
      try {
        await db.updateStudy(studyId, { figmaUrl: '' });
        setFeedback({ type: 'success', text: 'Prototype URL cleared successfully.' });
        if (study) {
          setStudy({ ...study, figmaUrl: '' });
        }
      } catch (e) {
        setFeedback({ type: 'error', text: 'Failed to update study.' });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Validate figma domain
    if (!isValidFigmaUrl(figmaUrl)) {
      setFeedback({ 
        type: 'error', 
        text: 'Please enter a valid Figma URL (e.g., figma.com/proto/... or figma.com/file/...)' 
      });
      return;
    }

    setIsSaving(true);
    setIframeLoading(true); // Trigger skeleton state for new embed loading
    try {
      const updated = await db.updateStudy(studyId, { figmaUrl });
      setStudy(updated);
      setFeedback({ type: 'success', text: 'Prototype URL saved successfully.' });
    } catch (e) {
      setFeedback({ type: 'error', text: 'Failed to save prototype link.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyParticipantLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?session=${studyId}`;
    await navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Trigger iframe loader trigger on src change
  useEffect(() => {
    if (study?.figmaUrl) {
      setIframeLoading(true);
    } else {
      setIframeLoading(false);
    }
  }, [study?.figmaUrl]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading study configuration...</span>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="placeholder-container">
        <h2 className="placeholder-title" style={{ color: 'var(--error)' }}>Study Not Found</h2>
        <p className="placeholder-desc">The usability study you are configuring does not exist in local storage.</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const embedSrc = getEmbedUrl(study.figmaUrl || '');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Navigation and Title */}
      <div style={{ marginBottom: '32px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="details-section-label">Module 2: Prototype Setup</span>
            <h1 style={{ fontSize: '28px', marginTop: '2px', letterSpacing: '-0.5px' }}>
              Study Design — {study.title}
            </h1>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(59, 130, 246, 0.15)'
          }}>
            <Shield size={14} /> Local Sandboxing
          </div>
        </div>
      </div>

      {/* URL Configuration form */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '32px'
      }}>
        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="figma-url" className="form-label" style={{ fontWeight: 600 }}>
              Figma Prototype Link
            </label>
            <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
              <input
                id="figma-url"
                type="text"
                className="form-control"
                placeholder="Paste share link here, e.g. https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={handleUrlChange}
                disabled={isSaving}
                style={{ flex: 1, minWidth: '280px' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSaving}
                style={{ flexShrink: 0 }}
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Link'}
              </button>
            </div>
          </div>
        </form>

        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginTop: '12px',
            backgroundColor: feedback.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--error)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
          }}>
            <AlertCircle size={16} />
            <span>{feedback.text}</span>
          </div>
        )}

        {study.figmaUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyParticipantLink}
            >
              {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
              {linkCopied ? 'Link copied!' : 'Copy Participant Link'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Share this with participants to start a tracked session.
            </span>
          </div>
        )}
      </div>

      {/* Viewport controls & Frame Viewer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Embed Preview Canvas</h2>
          
          {study.figmaUrl && (
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'var(--card-bg)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '2px',
              gap: '2px'
            }}>
              <button 
                className={`btn btn-secondary ${viewport === 'desktop' ? 'active-viewport-btn' : ''}`}
                onClick={() => setViewport('desktop')}
                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', gap: '6px', fontSize: '12px' }}
              >
                <Monitor size={14} /> Desktop
              </button>
              <button 
                className={`btn btn-secondary ${viewport === 'mobile' ? 'active-viewport-btn' : ''}`}
                onClick={() => setViewport('mobile')}
                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', gap: '6px', fontSize: '12px' }}
              >
                <Smartphone size={14} /> Mobile
              </button>
              <button 
                className={`btn btn-secondary ${viewport === 'tablet' ? 'active-viewport-btn' : ''}`}
                onClick={() => setViewport('tablet')}
                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', gap: '6px', fontSize: '12px' }}
              >
                <Tablet size={14} /> Tablet
              </button>
            </div>
          )}
        </div>

        {/* Viewport Frame Container */}
        <div className="canvas-wrapper" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '400px',
          width: '100%',
          padding: '24px',
          backgroundColor: 'var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflowX: 'auto',
          transition: 'all 0.3s ease'
        }}>
          
          {!study.figmaUrl ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '48px 24px', 
              color: 'var(--text-muted)',
              textAlign: 'center',
              maxWidth: '360px',
              margin: '0 auto'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '1px solid var(--border)'
              }}>
                <Monitor size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                No Prototype Configured
              </h3>
              <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
                Paste your Figma prototype URL above and click "Save Link" to render the live interactive frame view.
              </p>
            </div>
          ) : (
            <div 
              className={`figma-viewport-frame size-${viewport}`}
              style={{
                position: 'relative',
                backgroundColor: 'black',
                borderRadius: viewport === 'desktop' ? 'var(--radius-sm)' : '32px',
                border: viewport === 'desktop' ? '1px solid var(--border)' : '10px solid #1f2937',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                width: viewport === 'desktop' ? '100%' : viewport === 'mobile' ? '390px' : '768px',
                height: viewport === 'desktop' ? '600px' : viewport === 'mobile' ? '780px' : '960px',
              }}
            >
              {iframeLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#0a0a0a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  gap: '12px',
                  color: '#9ca3af'
                }}>
                  <Loader2 size={24} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '12px' }}>Connecting to Figma Embed Player...</span>
                </div>
              )}

              <iframe
                src={embedSrc}
                title="Figma Prototype"
                allowFullScreen
                onLoad={() => setIframeLoading(false)}
                style={{
                  border: 'none',
                  width: '100%',
                  height: '100%',
                  display: 'block'
                }}
              />
            </div>
          )}

        </div>

      </div>

      {/* Loader Keyframe definition */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>

    </div>
  );
};
