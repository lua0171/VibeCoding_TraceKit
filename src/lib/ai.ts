/**
 * ai.ts
 * ---------------------------------------------------------
 * Connects to a local Ollama instance to generate UX hypotheses
 * from click tracking data.
 */

import { getAiConfig } from './config';

/**
 * generateFromAi
 * ---------------------------------------------------------
 * Connects to either a local Ollama instance or an external 
 * OpenAI-compatible API to generate UX hypotheses.
 */
export async function generateFromAi(prompt: string, systemContext: string): Promise<string> {
  const config = getAiConfig();

  try {
    if (config.providerType === 'openai-compatible') {
      // OpenAI Chat Completions Format
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" } // Best effort to enforce JSON on generic endpoints
        }),
      });

      if (!response.ok) {
        throw new Error(`External AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } else {
      // Default Ollama Format
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.modelName,
          system: systemContext,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.2,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    }
  } catch (error) {
    console.error('Failed to generate from AI:', error);
    throw error;
  }
}
