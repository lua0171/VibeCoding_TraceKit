import React, { useState } from 'react';
import { ArrowLeft, ClipboardList, Smartphone, HelpCircle, Save, AlertCircle, Info } from 'lucide-react';
import { db } from '../db/db';

interface CreateStudyPageProps {
  onBack: () => void;
  onStudyCreated: (studyId: string) => void;
}

export const CreateStudyPage: React.FC<CreateStudyPageProps> = ({ onBack, onStudyCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialHypotheses, setInitialHypotheses] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Study title is required.');
      return;
    }
    setTitleError('');
    setIsSaving(true);
    try {
      const study = await db.createStudy({ 
        title: title.trim(), 
        description: description.trim(),
        initialHypotheses: initialHypotheses.trim()
      });
      onStudyCreated(study.id);
    } catch (e) {
      console.error('Failed to create study:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header and Navigation */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={onBack} 
          style={{ marginBottom: '16px' }}
          aria-label="Go back to Dashboard"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div>
          <span className="details-section-label">Module 2: Study Setup</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px', letterSpacing: '-0.5px' }}>
            New Study Configuration
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Set up questions and prototype embeds for your usability study sessions.
          </p>
        </div>
      </div>

      {/* Main Configuration Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Section 0: General Info */}
        <section 
          aria-labelledby="general-info-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Save size={18} />
            </div>
            <div>
              <h2 id="general-info-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                1. General Information & Hypotheses
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Define the core goals, parameters, and baseline assumptions for this research project.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="study-title" style={{ fontSize: '13px', fontWeight: 600 }}>
                Study Title <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="study-title"
                type="text"
                className="form-control"
                placeholder="e.g. Shopping Cart Friction Analysis"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%' }}
              />
              {titleError && (
                <span style={{ color: 'var(--error)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <AlertCircle size={14} /> {titleError}
                </span>
              )}
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="study-description" style={{ fontSize: '13px', fontWeight: 600 }}>
                Study Description
              </label>
              <textarea
                id="study-description"
                className="form-control"
                placeholder="Describe what you want to achieve with this study..."
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="study-hypotheses" style={{ fontSize: '13px', fontWeight: 600 }}>
                Initial Hypotheses (AI Guidance)
              </label>
              <textarea
                id="study-hypotheses"
                className="form-control"
                placeholder="Enter baseline assumptions to validate (e.g. 'Users abandonment rates drop 20% on the single page flow')"
                rows={3}
                value={initialHypotheses}
                onChange={e => setInitialHypotheses(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                These hypotheses will be evaluated by AI algorithms against the collected user interaction paths and metrics.
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Pre-Study Questions Placeholder */}
        <section 
          aria-labelledby="pre-study-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 id="pre-study-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                2. Pre-Study Questions
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Screen participants or gather initial demographic and context questions before the usability test begins.
              </p>
            </div>
          </div>

          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            marginTop: '16px'
          }}>
            <HelpCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              Survey Builder Placeholder
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
              Questions configured here will be shown to users when they first access the test session. Builder options will appear in a future iteration.
            </p>
          </div>
        </section>

        {/* Section 2: Prototype Placeholder */}
        <section 
          aria-labelledby="prototype-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Smartphone size={18} />
            </div>
            <div>
              <h2 id="prototype-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                3. Prototype
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Embed the target Figma prototype link that participants will interact with.
              </p>
            </div>
          </div>

          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            marginTop: '16px'
          }}>
            <Smartphone size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              Figma Embedding Placeholder
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
              The interactive frame player configurer and paste field will appear in this section in a future iteration.
            </p>
          </div>
        </section>

        {/* Section 3: Post-Study Questions Placeholder */}
        <section 
          aria-labelledby="post-study-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 id="post-study-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                4. Post-Study Questions
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Gather feedback, user satisfaction ratings, and final remarks after participants complete the prototype tasks.
              </p>
            </div>
          </div>

          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            marginTop: '16px'
          }}>
            <HelpCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              Survey Builder Placeholder
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
              Final follow-up feedback configurations will be managed in this section. Options will appear in a future iteration.
            </p>
          </div>
        </section>

        {/* Info Box and Static Action Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          border: '1px solid var(--border)',
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>
            Title and description are saved locally right away. Question builders and prototype embedding here are still visual placeholders — the working Figma embed can already be added afterwards from the study's "Study Design" view.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={onBack}
            aria-label="Cancel study configuration"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save study configuration"
          >
            {isSaving ? 'Creating...' : 'Create Study'}
          </button>
        </div>

      </div>
    </div>
  );
};
