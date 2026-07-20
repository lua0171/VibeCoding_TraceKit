/**
 * config.ts
 * ---------------------------------------------------------
 * Manages global application settings, specifically the AI provider config.
 */

export interface AiProviderConfig {
  providerType: 'ollama' | 'openai-compatible';
  baseUrl: string;
  modelName: string;
  apiKey?: string;
}

export const DEFAULT_AI_CONFIG: AiProviderConfig = {
  providerType: 'ollama',
  baseUrl: 'http://localhost:11434',
  // Small model on purpose: keeps the default usable on modest hardware
  // (e.g. 8GB RAM machines, where an 8B model like llama3 swaps heavily).
  // Users with more headroom can pick a larger model in Settings.
  modelName: 'llama3.2:1b',
};

const CONFIG_STORAGE_KEY = 'tracekit_ai_config';

export function getAiConfig(): AiProviderConfig {
  const data = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!data) return DEFAULT_AI_CONFIG;
  try {
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(data) };
  } catch (e) {
    console.error('Failed to parse AI config:', e);
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiProviderConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Dispatch a custom event so the global header can update reactively
  window.dispatchEvent(new Event('ai-config-changed'));
}


