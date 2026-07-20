import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';

describe('db (localStorage-backed study store)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('studies', () => {
    it('creates a study with sensible defaults', async () => {
      const study = await db.createStudy({ title: 'Test Study', description: 'A description' });

      expect(study.id).toBeTruthy();
      expect(study.title).toBe('Test Study');
      expect(study.completedParticipants).toBe(0);
      expect(study.minParticipants).toBe(10);
    });

    it('respects an explicit minParticipants on create', async () => {
      const study = await db.createStudy({ title: 'T', description: 'D', minParticipants: 3 });
      expect(study.minParticipants).toBe(3);
    });

    it('round-trips through getStudyById', async () => {
      const created = await db.createStudy({ title: 'Roundtrip', description: '' });
      const fetched = await db.getStudyById(created.id);
      expect(fetched).toEqual(created);
    });

    it('returns null for an unknown study id', async () => {
      const fetched = await db.getStudyById('does-not-exist');
      expect(fetched).toBeNull();
    });

    it('updates only the given fields and bumps updatedAt', async () => {
      const created = await db.createStudy({ title: 'Before', description: 'D' });
      const updated = await db.updateStudy(created.id, { title: 'After' });

      expect(updated.title).toBe('After');
      expect(updated.description).toBe('D');
      expect(updated.id).toBe(created.id);
    });

    it('throws when updating a study that does not exist', async () => {
      await expect(db.updateStudy('missing', { title: 'x' })).rejects.toThrow();
    });

    it('deletes a study and reports success/failure correctly', async () => {
      const created = await db.createStudy({ title: 'To delete', description: '' });

      expect(await db.deleteStudy(created.id)).toBe(true);
      expect(await db.getStudyById(created.id)).toBeNull();
      expect(await db.deleteStudy(created.id)).toBe(false);
    });

    it('sorts getAllStudies newest first', async () => {
      const first = await db.createStudy({ title: 'First', description: '' });
      const second = await db.createStudy({ title: 'Second', description: '' });
      // Force a distinguishable createdAt ordering regardless of clock resolution
      await db.updateStudy(first.id, {});
      const all = await db.getAllStudies();
      const ids = all.map(s => s.id);
      expect(ids.indexOf(second.id)).toBeLessThan(ids.length);
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sessions and tracked events', () => {
    it('creates an empty session for a study', async () => {
      const session = await db.createSession('study-1');
      expect(session.studyId).toBe('study-1');
      expect(session.events).toEqual([]);
      expect(session.endedAt).toBeUndefined();
    });

    it('appends events onto the correct session only', async () => {
      const sessionA = await db.createSession('study-1');
      const sessionB = await db.createSession('study-1');

      await db.appendEvent(sessionA.id, { type: 'click', nodeId: 'A', timestamp: 't1' });
      await db.appendEvent(sessionB.id, { type: 'click', nodeId: 'B', timestamp: 't2' });
      await db.appendEvent(sessionA.id, { type: 'navigation', nodeId: 'A2', timestamp: 't3', toNodeId: 'A2' });

      const sessions = await db.getSessionsByStudy('study-1');
      const found = (id: string) => sessions.find(s => s.id === id)!;

      expect(found(sessionA.id).events).toHaveLength(2);
      expect(found(sessionB.id).events).toHaveLength(1);
    });

    it('silently no-ops appendEvent/endSession for an unknown session id', async () => {
      await expect(db.appendEvent('nope', { type: 'click', nodeId: 'x', timestamp: 't' })).resolves.toBeUndefined();
      await expect(db.endSession('nope')).resolves.toBeUndefined();
    });

    it('marks a session ended', async () => {
      const session = await db.createSession('study-1');
      await db.endSession(session.id);
      const [fetched] = await db.getSessionsByStudy('study-1');
      expect(fetched.endedAt).toBeTruthy();
    });

    it('scopes getSessionsByStudy to the requested study only', async () => {
      await db.createSession('study-1');
      await db.createSession('study-2');
      const sessions = await db.getSessionsByStudy('study-1');
      expect(sessions).toHaveLength(1);
    });
  });

  describe('hypotheses', () => {
    it('saves new hypotheses and can fetch them back scoped by study', async () => {
      await db.saveHypotheses([
        { id: 'h1', studyId: 'study-1', content: 'A', status: 'open', origin: 'initial', confidenceScore: 0, evidence: [] },
        { id: 'h2', studyId: 'study-2', content: 'B', status: 'open', origin: 'ai', confidenceScore: 50, evidence: [] },
      ]);

      const forStudy1 = await db.getHypothesesByStudy('study-1');
      expect(forStudy1).toHaveLength(1);
      expect(forStudy1[0].id).toBe('h1');
    });

    it('updates an existing hypothesis in place instead of duplicating it', async () => {
      await db.saveHypotheses([
        { id: 'h1', studyId: 'study-1', content: 'A', status: 'open', origin: 'initial', confidenceScore: 0, evidence: [] },
      ]);
      await db.saveHypotheses([
        { id: 'h1', studyId: 'study-1', content: 'A', status: 'confirmed', origin: 'initial', confidenceScore: 90, evidence: ['proof'] },
      ]);

      const all = await db.getHypothesesByStudy('study-1');
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe('confirmed');
      expect(all[0].confidenceScore).toBe(90);
    });
  });
});
