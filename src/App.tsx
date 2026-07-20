import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { StudyConfiguration } from './components/StudyConfiguration';
import { ParticipantSession } from './components/ParticipantSession';
import { StudyResultsPage } from './components/StudyResultsPage';
import { SettingsModal } from './components/SettingsModal';
import { ShieldCheck, Globe, Settings } from 'lucide-react';
import { getAiConfig } from './lib/config';
import { useEffect } from 'react';

type View = 'dashboard' | 'configure-study' | 'study-results';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExternalAi, setIsExternalAi] = useState(() => getAiConfig().providerType === 'openai-compatible');

  useEffect(() => {
    const handleConfigChange = () => {
      setIsExternalAi(getAiConfig().providerType === 'openai-compatible');
    };
    window.addEventListener('ai-config-changed', handleConfigChange);
    return () => window.removeEventListener('ai-config-changed', handleConfigChange);
  }, []);

  // Participant links (?session=<studyId>) bypass the researcher app entirely —
  // no header, no dashboard access, just the tracked test session.
  const participantSessionId = new URLSearchParams(window.location.search).get('session');
  if (participantSessionId) {
    return <ParticipantSession studyId={participantSessionId} />;
  }

  return (
    <>
      {/* Sticky Header */}
      <header className="app-header">
        <div className="header-container">
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setView('dashboard'); }}>
            <div className="brand-logo">
              <span style={{ fontFamily: 'var(--heading)', fontWeight: 800, fontSize: '18px' }}>T</span>
            </div>
            <span className="brand-name">TraceKit</span>
            <span className="brand-badge">v0.1</span>
          </a>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isExternalAi ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--warning)', backgroundColor: 'var(--warning-bg)', padding: '4px 10px', borderRadius: '100px', fontWeight: 600 }}>
                <Globe size={14} /> External AI Active
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success)' }}>
                <ShieldCheck size={16} />
                <span style={{ fontWeight: 500 }}>Local-Only Sandbox</span>
              </div>
            )}
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {view === 'dashboard' ? (
          <Dashboard 
            onNavigateToStudyConfiguration={(studyId) => {
              setSelectedStudyId(studyId);
              setView('configure-study');
            }}
            onNavigateToStudyDesign={(studyId) => {
              setSelectedStudyId(studyId);
              setView('configure-study');
            }}
            onNavigateToStudyResults={(studyId) => {
              setSelectedStudyId(studyId);
              setView('study-results');
            }}
            refreshTrigger={refreshTrigger}
          />
        ) : view === 'configure-study' ? (
          <StudyConfiguration
            studyId={selectedStudyId || ''}
            mode="edit"
            onBack={() => {
              setSelectedStudyId(null);
              setRefreshTrigger(prev => prev + 1);
              setView('dashboard');
            }}
          />
        ) : (
          <StudyResultsPage 
            studyId={selectedStudyId || ''} 
            onBack={() => {
              setSelectedStudyId(null);
              setRefreshTrigger(prev => prev + 1);
              setView('dashboard');
            }}
          />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}

export default App;
