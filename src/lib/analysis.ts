import { generateFromOllama } from './ai';
import { db, type Hypothesis, type Session } from '../db/db';

/**
 * Two-Pass Analysis Loop
 * 
 * Module 6 Requirement:
 * - Pass 1 (Biased): evaluates existing open hypotheses against new data.
 * - Pass 2 (Unbiased): generates completely new hypotheses from data.
 * - Merge: deduplicate and save.
 */

// Define the expected JSON output structures from Ollama
interface Pass1Result {
  evaluations: {
    hypothesisId: string;
    status: 'open' | 'confirmed' | 'refuted' | 'inconclusive';
    confidenceScore: number;
    evidence: string[];
  }[];
}

interface Pass2Result {
  newHypotheses: {
    content: string;
    confidenceScore: number;
    evidence: string[];
  }[];
}

export async function runAnalysisLoop(studyId: string): Promise<Hypothesis[]> {
  const study = await db.getStudyById(studyId);
  if (!study) throw new Error('Study not found');

  const sessions = await db.getSessionsByStudy(studyId);
  const existingHypotheses = await db.getHypothesesByStudy(studyId);

  // If there are initial hypotheses on the study but they haven't been seeded into 
  // the hypotheses table yet, do it now.
  const seededHypotheses = [...existingHypotheses];
  if (study.initialHypotheses && existingHypotheses.filter(h => h.origin === 'initial').length === 0) {
    const lines = study.initialHypotheses.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      seededHypotheses.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        studyId,
        content: line,
        status: 'open',
        origin: 'initial',
        confidenceScore: 0,
        evidence: []
      });
    }
  }

  // Filter only 'open' hypotheses for the biased pass. We don't re-evaluate closed ones.
  const openHypotheses = seededHypotheses.filter(h => h.status === 'open');
  
  // Format the session data into a compact text format for the LLM context window
  const sessionDataSummary = formatSessionData(sessions);

  // --- PASS 1: Biased Evaluation ---
  const updatedHypotheses = [...seededHypotheses];
  
  if (openHypotheses.length > 0 && sessions.length > 0) {
    console.log("Running Pass 1 (Biased)...");
    const p1System = `You are an expert UX Researcher. Evaluate the given list of hypotheses against the provided click-tracking session data. 
    Respond ONLY in valid JSON matching this schema: { "evaluations": [ { "hypothesisId": "string", "status": "confirmed" | "refuted" | "inconclusive" | "open", "confidenceScore": number (0-100), "evidence": ["string explaining the data points"] } ] }`;
    
    const p1Prompt = `
      SESSION DATA:
      ${sessionDataSummary}

      HYPOTHESES TO EVALUATE:
      ${JSON.stringify(openHypotheses.map(h => ({ id: h.id, content: h.content })))}
    `;

    try {
      const p1Raw = await generateFromOllama(p1Prompt, p1System);
      const p1Data: Pass1Result = JSON.parse(p1Raw);

      // Merge Pass 1 evaluations into our working set
      for (const evalResult of p1Data.evaluations) {
        const index = updatedHypotheses.findIndex(h => h.id === evalResult.hypothesisId);
        if (index !== -1) {
          updatedHypotheses[index] = {
            ...updatedHypotheses[index],
            status: evalResult.status,
            confidenceScore: evalResult.confidenceScore,
            evidence: evalResult.evidence,
          };
        }
      }
    } catch (e) {
      console.error("Pass 1 failed:", e);
      // We continue to Pass 2 even if Pass 1 fails, or maybe just fail gracefully.
    }
  }

  // --- PASS 2: Unbiased Discovery ---
  if (sessions.length > 0) {
    console.log("Running Pass 2 (Unbiased)...");
    const p2System = `You are an expert UX Researcher. Analyze the given click-tracking session data and generate NEW hypotheses about user behavior, pain points, or patterns. 
    Do NOT generate hypotheses that are similar to these existing ones: ${JSON.stringify(updatedHypotheses.map(h => h.content))}
    Respond ONLY in valid JSON matching this schema: { "newHypotheses": [ { "content": "string", "confidenceScore": number (0-100), "evidence": ["string explaining data points"] } ] }`;

    const p2Prompt = `
      SESSION DATA:
      ${sessionDataSummary}
    `;

    try {
      const p2Raw = await generateFromOllama(p2Prompt, p2System);
      const p2Data: Pass2Result = JSON.parse(p2Raw);

      // Merge Pass 2 discoveries into our working set
      for (const newHypothesis of p2Data.newHypotheses) {
        updatedHypotheses.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          studyId,
          content: newHypothesis.content,
          status: 'open',
          origin: 'ai',
          confidenceScore: newHypothesis.confidenceScore,
          evidence: newHypothesis.evidence,
        });
      }
    } catch (e) {
      console.error("Pass 2 failed:", e);
    }
  }

  // Save everything back to the DB
  await db.saveHypotheses(updatedHypotheses);
  return updatedHypotheses;
}

// Utility to compact raw session event streams into a readable summary for the LLM
function formatSessionData(sessions: Session[]): string {
  let output = `Total Sessions: ${sessions.length}\n`;
  
  for (const s of sessions) {
    output += `\nSession ${s.id.substring(0,6)}:\n`;
    
    // Group clicks by node
    const clickCounts: Record<string, number> = {};
    let navSteps: string[] = [];

    for (const e of s.events) {
      if (e.type === 'click') {
        clickCounts[e.nodeId] = (clickCounts[e.nodeId] || 0) + 1;
      } else if (e.type === 'navigation' && e.toNodeId) {
        navSteps.push(e.toNodeId);
      }
    }

    if (navSteps.length > 0) {
      output += `- Navigated: ${navSteps.join(' -> ')}\n`;
    }
    
    const clickSummary = Object.entries(clickCounts).map(([node, count]) => `${count} clicks on ${node}`).join(', ');
    if (clickSummary) {
      output += `- Clicks: ${clickSummary}\n`;
    }
  }
  
  return output;
}
