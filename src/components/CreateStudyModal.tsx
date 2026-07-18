import React, { useState } from 'react';
import { X, Info, Loader2, Plus, Minus } from 'lucide-react';

interface CreateStudyModalProps {
  isOpen: boolean;
  onConfirm: (studyData: { title: string; description: string; minParticipants: number }) => Promise<void>;
  onCancel: () => void;
}

export const CreateStudyModal: React.FC<CreateStudyModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minParticipants, setMinParticipants] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Study name is required.');
      return;
    }

    if (minParticipants < 1) {
      setError('Please specify at least 1 target participant.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({ title, description, minParticipants });
      // Reset fields
      setTitle('');
      setDescription('');
      setMinParticipants(10);
    } catch (err) {
      setError('Failed to create study.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="details-overlay" role="dialog" aria-modal="true" aria-labelledby="create-modal-title" onClick={onCancel}>
      <div className="details-modal" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 id="create-modal-title" className="modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
            Create New Study
          </h2>
          <button className="modal-close" onClick={onCancel} aria-label="Close dialog" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {error && (
              <div style={{
                color: 'var(--error)',
                backgroundColor: 'var(--error-bg)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="study-title-input" className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Study Name <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="study-title-input"
                type="text"
                className="form-control"
                placeholder="e.g. Mobile Checkout Usability Test"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null); }}
                required
                disabled={isSubmitting}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="study-desc-input" className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                id="study-desc-input"
                className="form-control"
                placeholder="Briefly describe the study goals, tasks, and target user audience..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="study-participants-input" className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Target Participants
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setMinParticipants(prev => Math.max(1, prev - 1))}
                  disabled={isSubmitting}
                  aria-label="Decrease participants"
                >
                  <Minus size={16} />
                </button>
                
                <input
                  id="study-participants-input"
                  type="number"
                  className="form-control"
                  value={minParticipants}
                  onChange={(e) => setMinParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  required
                  disabled={isSubmitting}
                  style={{ width: '64px', textAlign: 'center', height: '36px' }}
                />
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setMinParticipants(prev => prev + 1)}
                  disabled={isSubmitting}
                  aria-label="Increase participants"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Little info disclaimer */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              border: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '8px'
            }}>
              <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '1px' }} />
              <span>These details can still be edited later on</span>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end', gap: '12px', display: 'flex' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  Creating...
                </>
              ) : (
                'Create Study'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
