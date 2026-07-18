/**
 * ai.ts
 * ---------------------------------------------------------
 * Connects to a local Ollama instance to generate UX hypotheses
 * from click tracking data.
 */

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3'; // Default lightweight model

export async function generateFromOllama(prompt: string, systemContext: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        system: systemContext,
        prompt: prompt,
        stream: false,
        format: 'json', // Force JSON output for structural parsing
        options: {
          temperature: 0.2, // Low temp for more analytical, less creative responses
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Failed to generate from Ollama:', error);
    throw error;
  }
}
