import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { StudyConfiguration } from './components/StudyConfiguration';
import { StudyDesignPage } from './components/StudyDesignPage';
import { CreateStudyPage } from './components/CreateStudyPage';
import { ParticipantSession } from './components/ParticipantSession';
import { StudyResultsPage } from './components/StudyResultsPage';
import { ShieldCheck } from 'lucide-react';

type View = 'dashboard' | 'create-study' | 'configure-study' | 'study-design' | 'study-results';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--success)' }}>
            <ShieldCheck size={16} />
            <span style={{ fontWeight: 500 }}>Local-Only Sandbox</span>
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
              setView('study-design');
            }}
            onNavigateToStudyResults={(studyId) => {
              setSelectedStudyId(studyId);
              setView('study-results');
            }}
            refreshTrigger={refreshTrigger}
          />
        ) : view === 'create-study' ? (
          <CreateStudyPage
            onBack={() => setView('dashboard')}
            onStudyCreated={(studyId) => {
              setSelectedStudyId(studyId);
              setRefreshTrigger(prev => prev + 1);
              setView('configure-study');
            }}
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
        ) : view === 'study-design' ? (
          <StudyDesignPage 
            studyId={selectedStudyId || ''} 
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
    </>
  );
}

export default App;
