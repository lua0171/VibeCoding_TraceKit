import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/db';
import { runAnalysisLoop } from './analysis';

vi.mock('./ai', () => ({
  generateFromAi: vi.fn(),
}));

import { generateFromAi } from './ai';
const mockGenerateFromAi = vi.mocked(generateFromAi);

describe('runAnalysisLoop (two-pass hypothesis validation)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGenerateFromAi.mockReset();
  });

  it('seeds initial hypotheses from the study even with zero sessions, without calling the AI', async () => {
    const study = await db.createStudy({
      title: 'No sessions yet',
      description: '',
      initialHypotheses: 'Users will miss the CTA.\nUsers will use search instead of browsing.',
    });

    const result = await runAnalysisLoop(study.id);

    expect(mockGenerateFromAi).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result.every(h => h.origin === 'initial' && h.status === 'open' && h.confidenceScore === 0)).toBe(true);
  });

  it('does not re-seed initial hypotheses on a second run', async () => {
    const study = await db.createStudy({
      title: 'Re-run',
      description: '',
      initialHypotheses: 'Users will miss the CTA.',
    });

    await runAnalysisLoop(study.id);
    const result = await runAnalysisLoop(study.id);

    expect(result.filter(h => h.origin === 'initial')).toHaveLength(1);
  });

  it('runs pass 1 (biased) against open hypotheses and merges the verdict when session data exists', async () => {
    const study = await db.createStudy({ title: 'Pass 1 test', description: '' });
    // Pre-seed a hypothesis directly (rather than via study.initialHypotheses)
    // so its id is known up front for the mocked evaluation to reference.
    await db.saveHypotheses([
      { id: 'seeded-1', studyId: study.id, content: 'Users will miss the CTA.', status: 'open', origin: 'initial', confidenceScore: 0, evidence: [] },
    ]);
    const session = await db.createSession(study.id);
    await db.appendEvent(session.id, { type: 'click', nodeId: 'CTA', timestamp: 't1' });

    mockGenerateFromAi.mockImplementation(async (_prompt: string, system: string) => {
      if (system.includes('Evaluate')) {
        return JSON.stringify({
          evaluations: [
            { hypothesisId: 'seeded-1', status: 'confirmed', confidenceScore: 85, evidence: ['1 click on CTA'] },
          ],
        });
      }
      return JSON.stringify({ newHypotheses: [] });
    });

    const result = await runAnalysisLoop(study.id);

    const initial = result.find(h => h.origin === 'initial')!;
    expect(initial.status).toBe('confirmed');
    expect(initial.confidenceScore).toBe(85);
    expect(initial.evidence).toEqual(['1 click on CTA']);
  });

  it('runs pass 2 (unbiased) and adds newly discovered hypotheses', async () => {
    const study = await db.createStudy({ title: 'Pass 2 test', description: '' });
    const session = await db.createSession(study.id);
    await db.appendEvent(session.id, { type: 'click', nodeId: 'Home', timestamp: 't1' });

    mockGenerateFromAi.mockResolvedValue(JSON.stringify({
      newHypotheses: [
        { content: 'Users click Home repeatedly before proceeding.', confidenceScore: 65, evidence: ['3 clicks on Home'] },
      ],
    }));

    const result = await runAnalysisLoop(study.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      origin: 'ai',
      status: 'open',
      content: 'Users click Home repeatedly before proceeding.',
      confidenceScore: 65,
    });
  });

  it('excludes closed hypotheses from the biased pass', async () => {
    const study = await db.createStudy({ title: 'Closed exclusion', description: '' });
    await db.saveHypotheses([
      { id: 'closed-1', studyId: study.id, content: 'Already resolved', status: 'closed', origin: 'initial', confidenceScore: 90, evidence: [] },
    ]);
    const session = await db.createSession(study.id);
    await db.appendEvent(session.id, { type: 'click', nodeId: 'X', timestamp: 't1' });

    mockGenerateFromAi.mockResolvedValue(JSON.stringify({ newHypotheses: [] }));

    await runAnalysisLoop(study.id);

    // Only Pass 2's system prompt should have been sent -- Pass 1 is skipped
    // entirely when there are no *open* hypotheses to evaluate.
    expect(mockGenerateFromAi).toHaveBeenCalledTimes(1);
    const [, systemPrompt] = mockGenerateFromAi.mock.calls[0];
    expect(systemPrompt).not.toContain('Evaluate');
  });

  it('persists the merged result via db.saveHypotheses so a later fetch sees it', async () => {
    const study = await db.createStudy({ title: 'Persistence check', description: '' });
    const session = await db.createSession(study.id);
    await db.appendEvent(session.id, { type: 'click', nodeId: 'X', timestamp: 't1' });

    mockGenerateFromAi.mockResolvedValue(JSON.stringify({
      newHypotheses: [{ content: 'Persisted hypothesis', confidenceScore: 40, evidence: [] }],
    }));

    await runAnalysisLoop(study.id);

    const fetched = await db.getHypothesesByStudy(study.id);
    expect(fetched.some(h => h.content === 'Persisted hypothesis')).toBe(true);
  });

  it('throws for an unknown study id', async () => {
    await expect(runAnalysisLoop('missing-study')).rejects.toThrow('Study not found');
  });
});
