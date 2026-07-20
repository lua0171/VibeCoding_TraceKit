import type { Study, Session, SurveyResponse } from '../db/db';

export function getFrameName(study: Study | null, screenId: string): string {
  return study?.importedPrototype?.frames?.find(f => f.id === screenId)?.name || `Figma Node ${screenId}`;
}

export interface TaskBreakdownRow {
  id: string;
  title: string;
  participants: number;
  clicks: number;
}

export function buildTaskBreakdown(study: Study | null, sessions: Session[]): TaskBreakdownRow[] {
  if (!study?.tasks || study.tasks.length === 0) return [];

  return study.tasks.map(t => {
    const sessionIds = new Set<string>();
    let clicks = 0;
    sessions.forEach(s => {
      s.events.forEach(e => {
        if (e.taskId === t.id) {
          sessionIds.add(s.id);
          if (e.type === 'click') clicks++;
        }
      });
    });
    return { id: t.id, title: t.title, participants: sessionIds.size, clicks };
  });
}

export interface SurveyQuestionSummary {
  questionId: string;
  questionText: string;
  answers: { participant: string; answer: string }[];
}

export function summarizeSurveyAnswers(
  sessions: Session[],
  key: 'preSurveyAnswers' | 'postSurveyAnswers'
): SurveyQuestionSummary[] {
  const map = new Map<string, { questionText: string; answers: { participant: string; answer: string }[] }>();

  sessions.forEach(s => {
    const responses: SurveyResponse[] = s[key] || [];
    responses.forEach(r => {
      if (!map.has(r.questionId)) {
        map.set(r.questionId, { questionText: r.questionText, answers: [] });
      }
      map.get(r.questionId)!.answers.push({
        participant: `Participant ${s.id.slice(-4)}`,
        answer: Array.isArray(r.answer) ? r.answer.join(', ') : r.answer
      });
    });
  });

  return Array.from(map.entries()).map(([questionId, v]) => ({ questionId, ...v }));
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(csvEscape).join(',')).join('\n');
}

// One row per tracked click/navigation event, with task/screen ids resolved
// to their human-readable names so the export is usable without cross
// referencing the study config.
export function buildEventsCsv(study: Study | null, sessions: Session[]): string {
  const header = ['Participant', 'Task', 'Screen', 'Event Type', 'Element', 'X', 'Y', 'Is Hotspot', 'Timestamp'];
  const rows: string[][] = [header];

  sessions.forEach(s => {
    const participant = `Participant ${s.id.slice(-4)}`;
    s.events.forEach(e => {
      const task = study?.tasks?.find(t => t.id === e.taskId)?.title || '';
      const screen = e.screenId ? getFrameName(study, e.screenId) : '';
      rows.push([
        participant,
        task,
        screen,
        e.type,
        e.nodeId || '',
        e.x !== undefined ? String(e.x) : '',
        e.y !== undefined ? String(e.y) : '',
        e.isHotspot ? 'true' : 'false',
        e.timestamp
      ]);
    });
  });

  return toCsv(rows);
}

// One row per participant per answered question, covering both pre- and
// post-study surveys.
export function buildSurveyCsv(sessions: Session[]): string {
  const header = ['Participant', 'Survey', 'Question', 'Answer'];
  const rows: string[][] = [header];

  sessions.forEach(s => {
    const participant = `Participant ${s.id.slice(-4)}`;
    (s.preSurveyAnswers || []).forEach(a => {
      rows.push([participant, 'Pre-Study', a.questionText, Array.isArray(a.answer) ? a.answer.join('; ') : a.answer]);
    });
    (s.postSurveyAnswers || []).forEach(a => {
      rows.push([participant, 'Post-Study', a.questionText, Array.isArray(a.answer) ? a.answer.join('; ') : a.answer]);
    });
  });

  return toCsv(rows);
}
