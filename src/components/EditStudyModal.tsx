import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Study } from '../db/db';

interface EditStudyModalProps {
  isOpen: boolean;
  study: Study | null;
  onSave: (id: string, title: string, description: string) => Promise<void>;
  onCancel: () => void;
}

export const EditStudyModal: React.FC<EditStudyModalProps> = ({
  isOpen,
  study,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (study) {
      setTitle(study.title);
      setDescription(study.description);
      setError('');
    }
  }, [study, isOpen]);

  if (!isOpen || !study) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Study title is required');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onSave(study.id, title, description);
    } catch (e) {
      console.error(e);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="details-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div className="details-modal">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div className="modal-header-title-container">
              <h2 id="edit-modal-title" className="modal-title">Edit Study</h2>
            </div>
            <button type="button" className="modal-close" onClick={onCancel} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {error && (
              <div style={{
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '14px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="study-title" className="form-label">Study Title</label>
              <input
                id="study-title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Navigation usability test"
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="study-desc" className="form-label">Study Description</label>
              <textarea
                id="study-desc"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the study goals and tasks..."
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
