import React, { useState, useEffect } from 'react';
import { X, Globe, Key, Database, Server } from 'lucide-react';
import { getAiConfig, saveAiConfig, type AiProviderConfig, DEFAULT_AI_CONFIG } from '../lib/config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AiProviderConfig>(DEFAULT_AI_CONFIG);
  const [figmaToken, setFigmaToken] = useState('');
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getAiConfig();
      setConfig(current);
      setFigmaToken(localStorage.getItem('tracekit_figma_token') || '');
      if (current.providerType === 'openai-compatible') {
        setHasConsented(true); // If already saved as external, they already consented
      } else {
        setHasConsented(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAiConfig(config);
    localStorage.setItem('tracekit_figma_token', figmaToken.trim());
    onClose();
  };

  const isExternal = config.providerType === 'openai-compatible';
  const canSave = !isExternal || (isExternal && hasConsented && config.baseUrl && config.modelName);

  return (
    <div className="details-overlay" style={{ zIndex: 100 }} role="dialog" aria-modal="true" onClick={onClose}>
      <div className="details-modal" style={{ maxWidth: '500px', padding: '24px' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            System & Provider Settings
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          
          <div style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            AI Provider
          </div>

          {/* Provider Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              border: `1px solid ${!isExternal ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              backgroundColor: !isExternal ? 'var(--primary-light)' : 'transparent',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="provider" 
                checked={!isExternal} 
                onChange={() => setConfig({ ...config, providerType: 'ollama' })}
                style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={14} /> Local Ollama (Default)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Runs entirely on your device. Maximum privacy. No data leaves your machine. Requires Ollama running in the background.
                </div>
              </div>
            </label>
 
            <label style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              border: `1px solid ${isExternal ? 'var(--warning)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              backgroundColor: isExternal ? 'var(--warning-bg)' : 'transparent',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="provider" 
                checked={isExternal} 
                onChange={() => setConfig({ ...config, providerType: 'openai-compatible' })}
                style={{ marginTop: '2px', accentColor: 'var(--warning)' }}
              />
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={14} /> External AI Provider (BYOK)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Use any OpenAI-compatible API (OpenAI, Groq, OpenRouter). Study session data will be transmitted to this endpoint.
                </div>
              </div>
            </label>
          </div>

          {/* Configuration Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} /> Base URL
              </label>
              <input
                type="text"
                className="form-control"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder={isExternal ? "https://api.openai.com" : "http://localhost:11434"}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={14} /> Model Name
              </label>
              <input
                type="text"
                className="form-control"
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                placeholder={isExternal ? "gpt-4o-mini" : "llama3"}
              />
            </div>

            {isExternal && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} /> API Key (Optional for some endpoints)
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Stored locally in your browser. Never synced.
                </div>
              </div>
            )}
          </div>

          {/* Explicit Consent Dialog */}
          {isExternal && (
            <label style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '16px', 
              backgroundColor: 'var(--error-bg)', 
              color: 'var(--error)', 
              borderRadius: 'var(--radius-md)', 
              alignItems: 'flex-start',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--error)' }}
              />
              <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                <strong>Privacy Acknowledgment</strong><br/>
                I understand that by using an external AI provider, the raw click tracking data, participant paths, and my initial hypotheses will be transmitted over the internet to the configured endpoint.
              </div>
            </label>
          )}

          <div style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Figma Integration
          </div>

          {/* Figma API configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} /> Figma Personal Access Token
              </label>
              <input
                type="password"
                className="form-control"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                placeholder="figd_..."
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                Required to import real frames and transition connections natively. Generate a token inside your <strong>Figma account settings &gt; Personal Access Tokens</strong>.
              </div>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
};
