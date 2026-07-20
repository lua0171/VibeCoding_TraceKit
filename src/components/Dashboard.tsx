import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, FileText, Edit2, Trash2, Check, X, Minus } from 'lucide-react';
import { db, type Study } from '../db/db';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { CreateStudyModal } from './CreateStudyModal';
import { getEmbedUrl, getParticipantLink } from '../lib/links';

interface DashboardProps {
  onNavigateToStudyConfiguration: (studyId: string) => void;
  refreshTrigger: number;
  onNavigateToStudyDesign: (studyId: string) => void;
  onNavigateToStudyResults: (studyId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToStudyConfiguration,
  refreshTrigger,
  onNavigateToStudyDesign,
  onNavigateToStudyResults,
}) => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Details Modal, Delete state, and Create state
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [studyToDelete, setStudyToDelete] = useState<Study | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState('');
  
  const [isEditingMin, setIsEditingMin] = useState(false);
  const [tempMin, setTempMin] = useState(10);
  const [detailsLinkCopied, setDetailsLinkCopied] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load studies on mount or when refreshTrigger updates
  const loadStudies = async () => {
    setIsLoading(true);
    try {
      const data = await db.getAllStudies();
      setStudies(data);
    } catch (e) {
      console.error('Failed to load studies:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudies();
  }, [refreshTrigger]);

  // Handle new study creation confirm from modal
  const handleCreateStudyConfirm = async (studyData: { title: string; description: string; minParticipants: number }) => {
    try {
      const newStudy = await db.createStudy(studyData);
      setIsCreateModalOpen(false);
      onNavigateToStudyConfiguration(newStudy.id);
    } catch (e) {
      console.error('Failed to create study:', e);
      throw e;
    }
  };

  // Reset inline edit states when selected study changes
  useEffect(() => {
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setIsEditingMin(false);
    if (selectedStudy) {
      setTempTitle(selectedStudy.title);
      setTempDesc(selectedStudy.description);
      setTempMin(selectedStudy.minParticipants || 10);
    }
  }, [selectedStudy]);

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return isoString;
    }
  };

  // Filter studies based on search query
  const filteredStudies = studies.filter(study =>
    study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    study.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle inline Title save
  const handleSaveTitleInline = async () => {
    if (!selectedStudy) return;
    if (!tempTitle.trim()) return;
    try {
      const updated = await db.updateStudy(selectedStudy.id, { title: tempTitle });
      setStudies(prev => prev.map(s => s.id === selectedStudy.id ? updated : s));
      setSelectedStudy(updated);
      setIsEditingTitle(false);
    } catch (e) {
      console.error('Error saving study title:', e);
    }
  };

  // Handle inline Description save
  const handleSaveDescInline = async () => {
    if (!selectedStudy) return;
    try {
      const updated = await db.updateStudy(selectedStudy.id, { description: tempDesc });
      setStudies(prev => prev.map(s => s.id === selectedStudy.id ? updated : s));
      setSelectedStudy(updated);
      setIsEditingDesc(false);
    } catch (e) {
      console.error('Error saving study description:', e);
    }
  };

  // Handle inline Min Target save
  const handleSaveMinInline = async () => {
    if (!selectedStudy) return;
    const targetVal = tempMin > 0 ? tempMin : 10; // Default fallback to 10
    try {
      const updated = await db.updateStudy(selectedStudy.id, { minParticipants: targetVal });
      setStudies(prev => prev.map(s => s.id === selectedStudy.id ? updated : s));
      setSelectedStudy(updated);
      setTempMin(targetVal);
      setIsEditingMin(false);
    } catch (e) {
      console.error('Error saving min participants:', e);
    }
  };

  // Handle Delete Action
  const handleDeleteConfirm = async () => {
    if (!studyToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteStudy(studyToDelete.id);
      setStudies(prev => prev.filter(s => s.id !== studyToDelete.id));
      if (selectedStudy?.id === studyToDelete.id) {
        setSelectedStudy(null);
      }
      setStudyToDelete(null);
    } catch (e) {
      console.error('Error deleting study:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Usability Studies</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Manage prototypes and view AI research hypotheses.
        </p>
      </div>

      {/* Search and Action Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 14px',
          boxShadow: 'var(--shadow-sm)',
          flex: '1',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search usability studies..."
            aria-label="Search usability studies"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={{
              border: 'none',
              padding: '10px 0',
              width: '100%',
              fontSize: '14px',
              background: 'transparent',
              color: 'var(--text)',
              boxShadow: isSearchFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
            }}
          />
        </div>

        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)} id="btn-create-study" style={{ height: '42px' }}>
          <Plus size={16} /> New Study
        </button>
      </div>

      {/* List Display */}
      {isLoading ? (
        <div className="studies-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div style={{ flex: 1 }}>
                <div className="skeleton-title" style={{ marginBottom: '8px' }}></div>
                <div className="skeleton-text" style={{ width: '30%' }}></div>
              </div>
              <div className="skeleton-footer" style={{ width: '80px', height: '16px', marginTop: 0 }}></div>
            </div>
          ))}
        </div>
      ) : filteredStudies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={28} />
          </div>
          <h2 className="empty-state-title">No studies found</h2>
          <p className="empty-state-desc">
            {searchQuery 
              ? `We couldn't find any studies matching "${searchQuery}". Try refining your keywords.`
              : 'Start by creating your first usability study to embed prototypes and collect user interactions.'
            }
          </p>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ marginTop: '8px' }}>
              <Plus size={16} /> Create Study
            </button>
          )}
        </div>
      ) : (
        <div className="studies-grid">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="study-card"
              onClick={() => setSelectedStudy(study)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSelectedStudy(study);
                } else if (e.key === ' ' || e.key === 'Space') {
                  e.preventDefault();
                  setSelectedStudy(study);
                }
              }}
            >
              <div>
                <div className="study-card-header" style={{ marginBottom: '4px' }}>
                  <h3 className="study-card-title">{study.title}</h3>
                </div>
                <div className="study-card-date" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} />
                    <span>{formatDate(study.createdAt)}</span>
                  </div>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    backgroundColor: study.completedParticipants >= study.minParticipants ? 'var(--success-bg)' : 'var(--primary-light)',
                    color: study.completedParticipants >= study.minParticipants ? 'var(--success)' : 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '10px',
                    letterSpacing: '0.2px'
                  }}>
                    {study.completedParticipants} / {study.minParticipants} Users
                  </span>
                </div>
              </div>
              <div className="study-card-footer" style={{ gap: '16px' }}>
                <button
                  className="btn-card-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStudyToDelete(study);
                  }}
                  title="Delete Study"
                  aria-label="Delete Study"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      {selectedStudy && (
        <div className="details-overlay" onClick={() => setSelectedStudy(null)} role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <div className="modal-header-title-container" style={{ width: '100%' }}>
                <span className="details-section-label">Usability Study Details</span>
                {isEditingTitle ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      style={{ fontSize: '18px', padding: '6px 12px' }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-icon-only" onClick={handleSaveTitleInline} title="Save Title" aria-label="Save Title">
                      <Check size={16} />
                    </button>
                    <button
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => {
                        setIsEditingTitle(false);
                        setTempTitle(selectedStudy.title);
                      }}
                      title="Cancel"
                      aria-label="Cancel edit title"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <h2 id="detail-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selectedStudy.title}
                    <button
                      className="btn-inline-edit"
                      onClick={() => {
                        setIsEditingTitle(true);
                        setTempTitle(selectedStudy.title);
                      }}
                      title="Edit Title"
                      aria-label="Edit Title"
                    >
                      <Edit2 size={16} />
                    </button>
                  </h2>
                )}
              </div>
              <button className="modal-close" onClick={() => setSelectedStudy(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="details-section-label">Description</div>
              {isEditingDesc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <textarea
                    className="form-control"
                    value={tempDesc}
                    onChange={(e) => setTempDesc(e.target.value)}
                    style={{ minHeight: '100px' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => {
                        setIsEditingDesc(false);
                        setTempDesc(selectedStudy.description);
                      }}
                      title="Cancel"
                      aria-label="Cancel edit description"
                    >
                      <X size={16} />
                    </button>
                    <button className="btn btn-primary btn-icon-only" onClick={handleSaveDescInline} title="Save Description" aria-label="Save Description">
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="details-description" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ flex: 1 }}>{selectedStudy.description}</span>
                  <button
                    className="btn-inline-edit"
                    onClick={() => {
                      setIsEditingDesc(true);
                      setTempDesc(selectedStudy.description);
                    }}
                    title="Edit Description"
                    aria-label="Edit Description"
                    style={{ marginTop: '4px' }}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}

              {/* Copy Participant Link Box */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--card-bg)',
                marginTop: '20px',
                marginBottom: '20px'
              }}>
                <span className="details-section-label" style={{ margin: 0, fontSize: '11px' }}>Participant Study Link</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={getParticipantLink(selectedStudy.id)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-muted)'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(getParticipantLink(selectedStudy.id)).then(() => {
                        setDetailsLinkCopied(true);
                        setTimeout(() => setDetailsLinkCopied(false), 2000);
                      });
                    }}
                    style={{ fontSize: '12px', height: '34px', whiteSpace: 'nowrap', gap: '6px', display: 'flex', alignItems: 'center' }}
                  >
                    <span aria-live="polite">{detailsLinkCopied ? 'Copied! ✓' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Participant Progress Panel */}
              <div className="details-participants-section" style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginTop: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="details-section-label" style={{ margin: 0 }}>Participant Progress</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    
                    {/* Completed participants count (read-only) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Recruited:</span>
                      <span style={{ fontWeight: 600 }}>
                        {selectedStudy.completedParticipants}
                      </span>
                    </div>

                    <span style={{ color: 'var(--border)' }}>|</span>

                    {/* Min Target participants count inline edit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Target:</span>
                      {isEditingMin ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon-only"
                            style={{ padding: '2px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => setTempMin(prev => Math.max(1, prev - 1))}
                            aria-label="Decrease target"
                          >
                            <Minus size={10} />
                          </button>
                          
                          <input
                            type="number"
                            className="form-control"
                            value={tempMin}
                            onChange={(e) => setTempMin(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: '40px', padding: '2px 4px', height: '22px', fontSize: '12px', textAlign: 'center' }}
                            min="1"
                            autoFocus
                          />
                          
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon-only"
                            style={{ padding: '2px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => setTempMin(prev => prev + 1)}
                            aria-label="Increase target"
                          >
                            <Plus size={10} />
                          </button>
                          
                          <button className="btn btn-primary btn-icon-only" style={{ padding: '2px', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleSaveMinInline} title="Save" aria-label="Save target count">
                            <Check size={12} />
                          </button>
                          <button className="btn btn-secondary btn-icon-only" style={{ padding: '2px', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsEditingMin(false)} title="Cancel" aria-label="Cancel edit target count">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          {selectedStudy.minParticipants || 10}
                          <button
                            className="btn-inline-edit"
                            style={{ padding: '2px' }}
                            onClick={() => { setIsEditingMin(true); setTempMin(selectedStudy.minParticipants || 10); }}
                            title="Edit Target Count"
                            aria-label="Edit Target Count"
                          >
                            <Edit2 size={11} />
                          </button>
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: 'var(--border)', 
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(100, (selectedStudy.completedParticipants / (selectedStudy.minParticipants || 1)) * 100)}%`,
                    height: '100%',
                    backgroundColor: 'var(--text)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>

              {/* Study Design and Results frames */}
              <div className="study-frames-grid">
                <div
                  className="study-frame-card"
                  onClick={() => {
                    const studyId = selectedStudy.id;
                    setSelectedStudy(null);
                    onNavigateToStudyDesign(studyId);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const studyId = selectedStudy.id;
                      setSelectedStudy(null);
                      onNavigateToStudyDesign(studyId);
                    } else if (e.key === ' ' || e.key === 'Space') {
                      e.preventDefault();
                      const studyId = selectedStudy.id;
                      setSelectedStudy(null);
                      onNavigateToStudyDesign(studyId);
                    }
                  }}
                >
                  <div className="study-frame-preview">
                    {selectedStudy.figmaUrl ? (
                      <iframe
                        src={getEmbedUrl(selectedStudy.figmaUrl)}
                        title="Figma Prototype Preview Thumbnail"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          pointerEvents: 'none',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <div className="mock-canvas">
                        <div className="mock-sidebar"></div>
                        <div className="mock-prototype">
                          <div className="mock-play-button"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="study-frame-info">
                    <h3>Study Configuration</h3>
                    <p>Configure questions and prototype embeds</p>
                  </div>
                </div>

                <div
                  className="study-frame-card"
                  onClick={() => {
                    const studyId = selectedStudy.id;
                    setSelectedStudy(null);
                    onNavigateToStudyResults(studyId);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const studyId = selectedStudy.id;
                      setSelectedStudy(null);
                      onNavigateToStudyResults(studyId);
                    } else if (e.key === ' ' || e.key === 'Space') {
                      e.preventDefault();
                      const studyId = selectedStudy.id;
                      setSelectedStudy(null);
                      onNavigateToStudyResults(studyId);
                    }
                  }}
                >
                  <div className="study-frame-preview">
                    <div className="mock-heatmap">
                      <div className="mock-hotspot hotspot-red"></div>
                      <div className="mock-hotspot hotspot-orange"></div>
                      <div className="mock-chart">
                        <div className="mock-bar bar-1"></div>
                        <div className="mock-bar bar-2"></div>
                        <div className="mock-bar bar-3"></div>
                      </div>
                    </div>
                  </div>
                  <div className="study-frame-info">
                    <h3>Study Results</h3>
                    <p>Heatmaps & local AI insights</p>
                  </div>
                </div>
              </div>



              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <div>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '6px' }}>Created:</span>
                  <span>{formatDate(selectedStudy.createdAt)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '6px' }}>Last Edited:</span>
                  <span>{formatDate(selectedStudy.updatedAt || selectedStudy.createdAt)}</span>
                </div>
              </div>
            </div>



          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={studyToDelete !== null}
        studyTitle={studyToDelete?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setStudyToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Create Study Parameter Config Modal */}
      <CreateStudyModal
        isOpen={isCreateModalOpen}
        onConfirm={handleCreateStudyConfirm}
        onCancel={() => setIsCreateModalOpen(false)}
      />

    </div>
  );
};
