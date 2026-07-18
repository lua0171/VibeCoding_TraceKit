import React, { useState } from 'react';
import { ArrowLeft, ClipboardList, Smartphone, HelpCircle, Info, FileText } from 'lucide-react';
import { db } from '../db/db';

interface StudyConfigurationProps {
  onBack: () => void;
  onStudyCreated: (studyId: string) => void;
}

export const StudyConfiguration: React.FC<StudyConfigurationProps> = ({ onBack, onStudyCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      const study = await db.createStudy({ title: title.trim(), description: description.trim() });
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
            Study Configuration
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Set up questions and prototype embeds for your usability study sessions.
          </p>
        </div>
      </div>

      {/* Main Configuration Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Section 0: Study Details */}
        <section
          aria-labelledby="study-details-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
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
              <FileText size={18} />
            </div>
            <div>
              <h2 id="study-details-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Study Details
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Give your usability study a title and a short description.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="study-title" className="form-label" style={{ fontWeight: 600 }}>
              Study Title
            </label>
            <input
              id="study-title"
              type="text"
              className="form-control"
              placeholder="e.g. Onboarding Flow Usability Test"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
              disabled={isSaving}
            />
            {titleError && (
              <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px' }}>{titleError}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="study-description" className="form-label" style={{ fontWeight: 600 }}>
              Description
            </label>
            <textarea
              id="study-description"
              className="form-control"
              placeholder="What are you testing and why?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              style={{ minHeight: '80px' }}
            />
          </div>
        </section>

        {/* Section 1: Pre-Study Questions */}
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

          {/* Placeholder for Pre-Study Questions */}
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

        {/* Section 2: Prototype */}
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

          {/* Placeholder for Figma Embed */}
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

        {/* Section 3: Post-Study Questions */}
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

          {/* Placeholder for Post-Study Questions */}
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
