import { describe, it, expect } from 'vitest';
import { getFrameName, buildTaskBreakdown, summarizeSurveyAnswers, buildEventsCsv, buildSurveyCsv } from './resultsAnalytics';
import type { Study, Session } from '../db/db';

const baseStudy: Study = {
  id: 's1',
  title: 'Test Study',
  description: '',
  createdAt: '',
  completedParticipants: 0,
  minParticipants: 1,
  tasks: [
    { id: 'task_1', title: 'Complete the card quiz', instruction: '...' },
    { id: 'task_2', title: 'Start and finish a battle', instruction: '...' }
  ],
  importedPrototype: {
    frames: [{ id: '1:1024', name: 'Home', imageUrl: '', hotspots: [] }]
  }
};

describe('getFrameName', () => {
  it('resolves a known frame id to its name', () => {
    expect(getFrameName(baseStudy, '1:1024')).toBe('Home');
  });

  it('falls back to the raw id when unresolved', () => {
    expect(getFrameName(baseStudy, '1:9999')).toBe('Figma Node 1:9999');
  });

  it('falls back to the raw id when the study is null', () => {
    expect(getFrameName(null, '1:1024')).toBe('Figma Node 1:1024');
  });
});

describe('buildTaskBreakdown', () => {
  const sessions: Session[] = [
    {
      id: 'session_abcd1234',
      studyId: 's1',
      startedAt: '',
      events: [
        { type: 'click', nodeId: 'n1', timestamp: 't1', taskId: 'task_1' },
        { type: 'click', nodeId: 'n2', timestamp: 't2', taskId: 'task_1' },
        { type: 'navigation', nodeId: 'n3', timestamp: 't3', taskId: 'task_2' }
      ]
    },
    {
      id: 'session_wxyz5678',
      studyId: 's1',
      startedAt: '',
      events: [
        { type: 'click', nodeId: 'n1', timestamp: 't1', taskId: 'task_1' }
      ]
    }
  ];

  it('counts distinct participants and clicks per task', () => {
    const rows = buildTaskBreakdown(baseStudy, sessions);
    expect(rows).toEqual([
      { id: 'task_1', title: 'Complete the card quiz', participants: 2, clicks: 3 },
      { id: 'task_2', title: 'Start and finish a battle', participants: 1, clicks: 0 }
    ]);
  });

  it('returns an empty array when the study has no tasks', () => {
    expect(buildTaskBreakdown({ ...baseStudy, tasks: [] }, sessions)).toEqual([]);
  });
});

describe('summarizeSurveyAnswers', () => {
  it('groups answers by question across sessions', () => {
    const sessions: Session[] = [
      {
        id: 'session_abcd1234',
        studyId: 's1',
        startedAt: '',
        events: [],
        preSurveyAnswers: [
          { questionId: 'q1', questionText: 'What is your age?', answer: '25–34' }
        ]
      },
      {
        id: 'session_wxyz5678',
        studyId: 's1',
        startedAt: '',
        events: [],
        preSurveyAnswers: [
          { questionId: 'q1', questionText: 'What is your age?', answer: '18–24' }
        ]
      }
    ];

    const result = summarizeSurveyAnswers(sessions, 'preSurveyAnswers');
    expect(result).toEqual([
      {
        questionId: 'q1',
        questionText: 'What is your age?',
        answers: [
          { participant: 'Participant 1234', answer: '25–34' },
          { participant: 'Participant 5678', answer: '18–24' }
        ]
      }
    ]);
  });

  it('joins multi-select answers into a single string', () => {
    const sessions: Session[] = [
      {
        id: 'session_abcd1234',
        studyId: 's1',
        startedAt: '',
        events: [],
        postSurveyAnswers: [
          { questionId: 'q2', questionText: 'Which features did you use?', answer: ['Quiz', 'Battle'] }
        ]
      }
    ];

    const result = summarizeSurveyAnswers(sessions, 'postSurveyAnswers');
    expect(result[0].answers[0].answer).toBe('Quiz, Battle');
  });

  it('returns an empty array when no sessions have answers for that key', () => {
    const sessions: Session[] = [{ id: 'session_a', studyId: 's1', startedAt: '', events: [] }];
    expect(summarizeSurveyAnswers(sessions, 'postSurveyAnswers')).toEqual([]);
  });
});

describe('buildEventsCsv', () => {
  it('resolves task and screen names and includes a header row', () => {
    const sessions: Session[] = [
      {
        id: 'session_abcd1234',
        studyId: 's1',
        startedAt: '',
        events: [
          { type: 'click', nodeId: 'OK', timestamp: '100', taskId: 'task_1', screenId: '1:1024', x: 0.5, y: 0.25, isHotspot: true }
        ]
      }
    ];

    const csv = buildEventsCsv(baseStudy, sessions);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Participant,Task,Screen,Event Type,Element,X,Y,Is Hotspot,Timestamp');
    expect(lines[1]).toBe('Participant 1234,Complete the card quiz,Home,click,OK,0.5,0.25,true,100');
  });

  it('quotes values containing commas', () => {
    const sessions: Session[] = [
      {
        id: 'session_abcd1234',
        studyId: 's1',
        startedAt: '',
        events: [{ type: 'click', nodeId: 'Yes, please', timestamp: '100' }]
      }
    ];
    const csv = buildEventsCsv(null, sessions);
    expect(csv).toContain('"Yes, please"');
  });
});

describe('buildSurveyCsv', () => {
  it('emits one row per pre- and post-study answer', () => {
    const sessions: Session[] = [
      {
        id: 'session_abcd1234',
        studyId: 's1',
        startedAt: '',
        events: [],
        preSurveyAnswers: [{ questionId: 'q1', questionText: 'What is your age?', answer: '25–34' }],
        postSurveyAnswers: [{ questionId: 'q2', questionText: 'Features used?', answer: ['Quiz', 'Battle'] }]
      }
    ];

    const csv = buildSurveyCsv(sessions);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Participant,Survey,Question,Answer');
    expect(lines[1]).toBe('Participant 1234,Pre-Study,What is your age?,25–34');
    expect(lines[2]).toBe('Participant 1234,Post-Study,Features used?,Quiz; Battle');
  });
});
