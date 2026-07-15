import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  studyTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  studyTitle,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="details-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
      <div className="details-modal confirm-modal-content">
        <div className="modal-body" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="confirm-warning-icon">
            <AlertTriangle size={24} />
          </div>
          <h2 id="delete-confirm-title" className="modal-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
            Delete Usability Study
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Are you sure you want to delete <strong>"{studyTitle}"</strong>? This action is permanent and cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isDeleting}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={isDeleting}
              style={{ flex: 1 }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Study'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
