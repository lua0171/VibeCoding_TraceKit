import React, { useState, useRef } from 'react';
import { MOCK_PROTOTYPE_FRAMES } from '../lib/prototype';
import { User, LogOut, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { type Study } from '../db/db';

interface PrototypeViewerProps {
  frameId: string;
  importedPrototype?: Study['importedPrototype'];
  figmaUrl?: string;
  onNavigate?: (toFrameId: string) => void;
  onClick?: (x: number, y: number, targetName: string, isHotspot: boolean) => void;
  readOnly?: boolean;
}

export const PrototypeViewer: React.FC<PrototypeViewerProps> = ({
  frameId,
  importedPrototype,
  figmaUrl: _figmaUrl,
  onNavigate,
  onClick,
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHints, setShowHints] = useState(false);

  const isImported = !!(importedPrototype && importedPrototype.frames && importedPrototype.frames.length > 0);

  const activeImportedFrame = isImported
    ? (importedPrototype!.frames.find(f => f.id === frameId) || importedPrototype!.frames[0])
    : null;

  const activeMockFrame = !isImported
    ? (MOCK_PROTOTYPE_FRAMES.find(f => f.id === frameId) || MOCK_PROTOTYPE_FRAMES[0])
    : null;

  const triggerHintsFlash = () => {
    if (readOnly) return;
    setShowHints(true);
    const timer = setTimeout(() => setShowHints(false), 500);
    return () => clearTimeout(timer);
  };

  // Fallback for clicks that land outside any hotspot button (a "miss") --
  // hits are now handled directly by each hotspot's own <button onClick>,
  // which stops propagation so this only ever sees misses.
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (onClick) {
      onClick(clickX, clickY, 'Missed Hotspot', false);
    }
    triggerHintsFlash();
  };

  const handleHotspotActivate = (e: React.MouseEvent | React.KeyboardEvent, hs: { x: number; y: number; name: string; targetFrameId: string }) => {
    e.stopPropagation();
    if (readOnly) return;
    if (onClick) {
      onClick(hs.x, hs.y, hs.name, true);
    }
    if (onNavigate) {
      onNavigate(hs.targetFrameId);
    }
  };

  const aspect = (activeImportedFrame?.width && activeImportedFrame?.height)
    ? activeImportedFrame.width / activeImportedFrame.height
    : 1.5;

  const hotspots = isImported ? activeImportedFrame?.hotspots : activeMockFrame?.hotspots;

  // Hotspots are real, always-present, keyboard-focusable buttons (not
  // mouse-only geometry) -- transparent by default, highlighted on
  // hover/focus/hint-flash via the .prototype-hotspot CSS class.
  const renderHotspots = () => {
    if (readOnly || !hotspots) return null;
    return hotspots.map(hs => (
      <button
        key={hs.id}
        type="button"
        aria-label={hs.name}
        className="prototype-hotspot"
        onClick={(e) => handleHotspotActivate(e, hs)}
        style={{
          position: 'absolute',
          left: `${hs.x * 100}%`,
          top: `${hs.y * 100}%`,
          width: `${hs.width * 100}%`,
          height: `${hs.height * 100}%`,
          backgroundColor: showHints ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
          border: showHints ? '2px solid var(--primary)' : '2px solid transparent',
          borderRadius: '4px',
          padding: 0,
          cursor: 'pointer',
          zIndex: 999
        }}
      />
    ));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
        fontFamily: 'var(--sans)',
        color: 'var(--text)',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: readOnly ? 'default' : 'pointer',
        touchAction: 'manipulation'
      }}
    >
      {isImported && activeImportedFrame ? (
        <div style={{
          position: 'relative',
          aspectRatio: `${aspect}`,
          maxHeight: '100%',
          maxWidth: '100%',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000'
        }}>
          <img
            src={activeImportedFrame.imageUrl}
            alt={activeImportedFrame.name}
            width={activeImportedFrame.width}
            height={activeImportedFrame.height}
            style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', objectFit: 'contain' }}
          />

          {renderHotspots()}
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {activeMockFrame?.layoutType === 'home' && renderHomeLayout()}
            {activeMockFrame?.layoutType === 'dashboard' && renderDashboardLayout()}
            {activeMockFrame?.layoutType === 'search' && renderSearchLayout()}
            {activeMockFrame?.layoutType === 'profile' && renderProfileLayout()}
          </div>

          {renderHotspots()}
        </div>
      )}
    </div>
  );
};

// --- MOCK SCREEN RENDER FUNCTIONS ---

function renderHomeLayout() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px', background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
      textAlign: 'center', color: '#f8fafc'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '6px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '99px',
        border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '16px', color: '#60a5fa', fontSize: '12px'
      }}>
        <Sparkles size={14} /> Interactive Prototype Simulation
      </div>
      <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.75px', margin: '0 0 12px 0' }}>
        TraceKit Web App Portal
      </h1>
      <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '380px', margin: '0 0 32px 0', lineHeight: 1.5 }}>
        Welcome to the in-app interactive usability study prototype. Please click the button below to start the session.
      </p>

      <div style={{
        position: 'absolute',
        left: '40%',
        top: '52%',
        width: '20%',
        height: '7%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--primary)',
        color: 'white',
        borderRadius: 'var(--radius-md)',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: 'var(--shadow-md)',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        Sign In / Enter
      </div>
    </div>
  );
}

function renderDashboardLayout() {
  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#0b0f19', color: '#e2e8f0' }}>
      <aside style={{
        width: '18%', borderRight: '1px solid #1e293b', backgroundColor: '#0d1321',
        padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>TRACEKIT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <span style={{ padding: '8px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>
              Overview
            </span>
            <span style={{ padding: '8px 12px', color: '#94a3b8' }}>Reports</span>
            <span style={{ padding: '8px 12px', color: '#94a3b8' }}>Analytics</span>
          </div>
        </div>

        <div style={{
          position: 'absolute', left: '2%', top: '92%', width: '10%', height: '5%',
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444',
          fontWeight: 600
        }}>
          <LogOut size={12} /> Sign Out
        </div>
      </aside>

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{
            position: 'absolute', left: '38%', top: '2%', width: '8%', height: '5%',
            border: '1px solid #1e293b', borderRadius: '4px', backgroundColor: '#0d1321',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8'
          }}>
            <Search size={10} /> Search
          </div>

          <div style={{ flex: 1 }} />

          <div style={{
            position: 'absolute', left: '88%', top: '1.5%', width: '5%', height: '6%',
            borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '11px'
          }}>
            LA
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#0d1321', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Active Sessions</span>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#f8fafc' }}>1,248</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#0d1321', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Task Success</span>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#22c55e' }}>94.2%</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#0d1321', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Avg Completion</span>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#3b82f6' }}>4.8s</div>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0d1321', borderRadius: '8px', border: '1px solid #1e293b', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 600, fontSize: '12px' }}>Real-time Completeness Chart</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
            <div style={{ height: '30%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.3, borderRadius: '2px 2px 0 0' }} />
            <div style={{ height: '55%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.5, borderRadius: '2px 2px 0 0' }} />
            <div style={{ height: '85%', flex: 1, backgroundColor: 'var(--primary)', borderRadius: '2px 2px 0 0' }} />
            <div style={{ height: '40%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.4, borderRadius: '2px 2px 0 0' }} />
          </div>
        </div>
      </main>
    </div>
  );
}

function renderSearchLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b0f19', color: '#e2e8f0' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b', backgroundColor: '#0d1321' }}>
        <div style={{
          position: 'absolute', left: '8%', top: '2%', width: '12%', height: '5%',
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)',
          fontWeight: 600
        }}>
          ⬅ Dashboard
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '24%' }}>/ Catalog Search</span>
      </header>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '12px', border: '1px solid #1e293b', borderRadius: '4px', backgroundColor: '#0d1321', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Search TraceKit database...</span>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 600 }}>Active Search Results</div>

        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          <div style={{
            position: 'absolute', left: '8%', top: '26%', width: '26%', height: '30%',
            backgroundColor: '#0d1321', border: '1px solid var(--primary)', borderRadius: '6px',
            padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <div style={{ width: '100%', height: '50%', backgroundColor: '#1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>Luisa Amberger Profile</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Click to view profile info & logs</div>
          </div>

          <div style={{ width: '26%', marginLeft: '30%', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.5 }}>
            <div style={{ width: '100%', height: '50%', backgroundColor: '#1e293b', borderRadius: '4px' }} />
            <div style={{ fontWeight: 600, fontSize: '12px' }}>Workspace Sandbox</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Read-only item</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderProfileLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b0f19', color: '#e2e8f0', padding: '24px' }}>
      <div style={{
        position: 'absolute', left: '3%', top: '3%', width: '10%', height: '6%',
        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)'
      }}>
        <ArrowLeft size={14} /> Back
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px', marginTop: '16px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white', border: '3px solid #1e293b' }}>
          LA
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Luisa Amberger</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Lead UX Researcher</p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px', backgroundColor: '#0d1321', border: '1px solid #1e293b', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Department</span>
            <span style={{ fontWeight: 600 }}>Advanced Agentic Coding</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Status</span>
            <span style={{ fontWeight: 600, color: '#22c55e' }}>Active</span>
          </div>
        </div>

        <div style={{
          position: 'absolute', left: '42%', top: '72%', width: '16%', height: '6%',
          borderRadius: '4px', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)',
          color: '#ef4444', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '6px'
        }}>
          <LogOut size={12} /> Sign Out
        </div>
      </div>
    </div>
  );
}
