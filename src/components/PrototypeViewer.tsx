import React, { useState, useRef } from 'react';
import { MOCK_PROTOTYPE_FRAMES } from '../lib/prototype';
import { User, LogOut, Search, ArrowLeft, Sparkles } from 'lucide-react';

interface PrototypeViewerProps {
  frameId: string;
  figmaUrl?: string;
  onNavigate?: (toFrameId: string) => void;
  onClick?: (x: number, y: number, targetName: string, isHotspot: boolean) => void;
  readOnly?: boolean;
}

export const PrototypeViewer: React.FC<PrototypeViewerProps> = ({
  frameId,
  figmaUrl: _figmaUrl,
  onNavigate,
  onClick,
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHints, setShowHints] = useState(false);

  // Find active frame configuration
  const activeFrame = MOCK_PROTOTYPE_FRAMES.find(f => f.id === frameId) || MOCK_PROTOTYPE_FRAMES[0];

  // Flash hints when user clicks on a non-hotspot area
  const triggerHintsFlash = () => {
    if (readOnly) return;
    setShowHints(true);
    const timer = setTimeout(() => setShowHints(false), 500);
    return () => clearTimeout(timer);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Check if the click lies inside any hotspot boundary
    const hitHotspot = activeFrame.hotspots.find(hs => {
      return (
        clickX >= hs.x &&
        clickX <= hs.x + hs.width &&
        clickY >= hs.y &&
        clickY <= hs.y + hs.height
      );
    });

    if (hitHotspot) {
      if (onClick) {
        onClick(clickX, clickY, hitHotspot.name, true);
      }
      if (onNavigate) {
        onNavigate(hitHotspot.targetFrameId);
      }
    } else {
      if (onClick) {
        onClick(clickX, clickY, 'Missed Hotspot', false);
      }
      triggerHintsFlash();
    }
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
        flexDirection: 'column',
        cursor: readOnly ? 'default' : 'pointer'
      }}
    >
      {/* Mock Layout Renders */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeFrame.layoutType === 'home' && renderHomeLayout()}
        {activeFrame.layoutType === 'dashboard' && renderDashboardLayout()}
        {activeFrame.layoutType === 'search' && renderSearchLayout()}
        {activeFrame.layoutType === 'profile' && renderProfileLayout()}
      </div>

      {/* Hotspots Visual Overlay Hints (Flashes blue on missed clicks) */}
      {!readOnly && showHints && activeFrame.hotspots.map(hs => (
        <div
          key={hs.id}
          style={{
            position: 'absolute',
            left: `${hs.x * 100}%`,
            top: `${hs.y * 100}%`,
            width: `${hs.width * 100}%`,
            height: `${hs.height * 100}%`,
            backgroundColor: 'rgba(59, 130, 246, 0.4)',
            border: '2px solid var(--primary)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 999,
            transition: 'background-color 0.15s ease'
          }}
        />
      ))}
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

      {/* Login Button Area (Aligned to Hotspot bounds: x: 0.4, y: 0.52, width: 0.2, height: 0.07) */}
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
      {/* Sidebar (width: 15%) */}
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

        {/* Aligned to Hotspot: Sign Out Link x: 0.02, y: 0.92, width: 0.1, height: 0.05 */}
        <div style={{
          position: 'absolute', left: '2%', top: '92%', width: '10%', height: '5%',
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444',
          fontWeight: 600
        }}>
          <LogOut size={12} /> Sign Out
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
          {/* Aligned to Search Nav hotspot: x: 0.38, y: 0.02, width: 0.08, height: 0.05 */}
          <div style={{
            position: 'absolute', left: '38%', top: '2%', width: '8%', height: '5%',
            border: '1px solid #1e293b', borderRadius: '4px', backgroundColor: '#0d1321',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8'
          }}>
            <Search size={10} /> Search
          </div>

          <div style={{ flex: 1 }} />

          {/* Aligned to Profile Nav hotspot: x: 0.88, y: 0.015, width: 0.05, height: 0.06 */}
          <div style={{
            position: 'absolute', left: '88%', top: '1.5%', width: '5%', height: '6%',
            borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '11px'
          }}>
            LA
          </div>
        </header>

        {/* Dashboard Grid */}
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

        {/* Analytics Summary */}
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
      {/* Header bar with breadcrumbs */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b', backgroundColor: '#0d1321' }}>
        {/* Aligned to hotspot: Dashboard Breadcrumb Link: x: 0.08, y: 0.02, width: 0.12, height: 0.05 */}
        <div style={{
          position: 'absolute', left: '8%', top: '2%', width: '12%', height: '5%',
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)',
          fontWeight: 600
        }}>
          ⬅ Dashboard
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '24%' }}>/ Catalog Search</span>
      </header>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '12px', border: '1px solid #1e293b', borderRadius: '4px', backgroundColor: '#0d1321', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Search TraceKit database...</span>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 600 }}>Active Search Results</div>

        {/* Product Cards Row */}
        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          {/* Card 1: Aligned to hotspot first product: x: 0.08, y: 0.26, width: 0.26, height: 0.3 */}
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

          {/* Dummy visual cards */}
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
      {/* Aligned to hotspot Back Arrow: x: 0.03, y: 0.03, width: 0.1, height: 0.06 */}
      <div style={{
        position: 'absolute', left: '3%', top: '3%', width: '10%', height: '6%',
        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)'
      }}>
        <ArrowLeft size={14} /> Back
      </div>

      {/* Main Profile Info */}
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

        {/* Aligned to hotspot Logout Button: x: 0.42, y: 0.72, width: 0.16, height: 0.06 */}
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
