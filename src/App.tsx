import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CreateStudyPlaceholder } from './components/CreateStudyPlaceholder';
import { ShieldCheck } from 'lucide-react';

type View = 'dashboard' | 'create-study';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleStudyCreated = () => {
    // Increment trigger to reload studies in the dashboard
    setRefreshTrigger(prev => prev + 1);
    setView('dashboard');
  };

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
            onCreateNewStudy={() => setView('create-study')} 
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <CreateStudyPlaceholder 
            onBack={() => setView('dashboard')} 
            onStudyCreated={handleStudyCreated}
          />
        )}
      </main>
    </>
  );
}

export default App;
