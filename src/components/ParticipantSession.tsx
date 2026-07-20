import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck, ClipboardList } from 'lucide-react';
import { db, type Study, type SurveyQuestion, type SurveyResponse } from '../db/db';
import { PrototypeViewer } from './PrototypeViewer';

interface ParticipantSessionProps {
  studyId: string;
}

type Stage = 'loading' | 'not-found' | 'intro' | 'pre-survey' | 'active' | 'post-survey' | 'done';

const STANDARDIZED_QUESTIONNAIRES = {
  sus: {
    name: 'System Usability Scale (SUS)',
    items: [
      { id: 'sus_1', text: 'I think that I would like to use this system frequently.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_2', text: 'I found the system unnecessarily complex.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_3', text: 'I thought the system was easy to use.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_4', text: 'I think that I would need the support of a technical person to be able to use this system.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_5', text: 'I found the various functions in this system were well integrated.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_6', text: 'I thought there was too much inconsistency in this system.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_7', text: 'I would imagine that most people would learn to use this system very quickly.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_8', text: 'I found the system very cumbersome to use.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_9', text: 'I felt very confident using the system.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'sus_10', text: 'I needed to learn a lot of things before I could get going with this system.', type: 'rating' as const, ratingMin: 1, ratingMax: 5, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' }
    ]
  },
  ueq: {
    name: 'User Experience Questionnaire (UEQ) - Short Version',
    items: [
      { id: 'ueq_1', text: 'Complicated vs. Simple', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Complicated', ratingMaxLabel: 'Simple' },
      { id: 'ueq_2', text: 'Unpredictable vs. Predictable', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Unpredictable', ratingMaxLabel: 'Predictable' },
      { id: 'ueq_3', text: 'Inefficient vs. Efficient', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Inefficient', ratingMaxLabel: 'Efficient' },
      { id: 'ueq_4', text: 'Clear vs. Confusing', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Clear', ratingMaxLabel: 'Confusing' },
      { id: 'ueq_5', text: 'Boring vs. Exciting', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Boring', ratingMaxLabel: 'Exciting' },
      { id: 'ueq_6', text: 'Conventional vs. Inventive', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Conventional', ratingMaxLabel: 'Inventive' },
      { id: 'ueq_7', text: 'Obstructive vs. Supportive', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Obstructive', ratingMaxLabel: 'Supportive' },
      { id: 'ueq_8', text: 'Inferior vs. Valuable', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Inferior', ratingMaxLabel: 'Valuable' }
    ]
  },
  umux_lite: {
    name: 'UMUX-Lite',
    items: [
      { id: 'umux_1', text: "The system's capabilities meet my requirements.", type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' },
      { id: 'umux_2', text: 'The system is easy to use.', type: 'rating' as const, ratingMin: 1, ratingMax: 7, ratingMinLabel: 'Strongly disagree', ratingMaxLabel: 'Strongly agree' }
    ]
  },
  nasa_tlx: {
    name: 'NASA-TLX (Workload)',
    items: [
      { id: 'nasa_1', text: 'Mental Demand (How mentally demanding was the task?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Low', ratingMaxLabel: 'High' },
      { id: 'nasa_2', text: 'Physical Demand (How physically demanding was the task?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Low', ratingMaxLabel: 'High' },
      { id: 'nasa_3', text: 'Temporal Demand (How hurried or rushed was the pace of the task?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Low', ratingMaxLabel: 'High' },
      { id: 'nasa_4', text: 'Performance (How successful were you in accomplishing what you were asked to do?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Perfect', ratingMaxLabel: 'Failure' },
      { id: 'nasa_5', text: 'Effort (How hard did you have to work to accomplish your level of performance?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Low', ratingMaxLabel: 'High' },
      { id: 'nasa_6', text: 'Frustration (How insecure, discouraged, irritated, stressed, or annoyed were you?)', type: 'rating' as const, ratingMin: 1, ratingMax: 10, ratingMinLabel: 'Low', ratingMaxLabel: 'High' }
    ]
  }
};

const getPostSurveyQuestions = (study: Study): SurveyQuestion[] => {
  if (study.postSurveyQuestionsMode === 'custom') {
    return study.postSurveyQuestions || [];
  }
  if (study.postSurveyQuestionsMode === 'standardized') {
    const keys = study.postSurveyStandardizedKeys || [];
    const questions: SurveyQuestion[] = [];
    keys.forEach(key => {
      const q = STANDARDIZED_QUESTIONNAIRES[key as keyof typeof STANDARDIZED_QUESTIONNAIRES];
      if (q) {
        questions.push(...q.items);
      }
    });
    return questions;
  }
  return [];
};

export const ParticipantSession: React.FC<ParticipantSessionProps> = ({ studyId }) => {
  const [stage, setStage] = useState<Stage>('loading');
  const [study, setStudy] = useState<Study | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);
  const [currentFrameId, setCurrentFrameId] = useState<string>('Home View');
  const [preSurveyAnswers, setPreSurveyAnswers] = useState<SurveyResponse[]>([]);
  const previousNodeId = useRef<string | null>(null);

  useEffect(() => {
    const fetchStudy = async () => {
      const data = await db.getStudyById(studyId);
      if (!data || !data.figmaUrl) {
        setStage('not-found');
        return;
      }
      setStudy(data);
      setStage('intro');
    };
    fetchStudy();
  }, [studyId]);

  const activeTask = study?.tasks && study.tasks.length > 0 ? study.tasks[activeTaskIndex] : null;

  const handleNavigate = (toFrameId: string) => {
    if (sessionId) {
      db.appendEvent(sessionId, {
        type: 'navigation',
        nodeId: toFrameId,
        timestamp: new Date().toISOString(),
        fromNodeId: previousNodeId.current || undefined,
        toNodeId: toFrameId,
        taskId: activeTask?.id
      });
    }
    previousNodeId.current = toFrameId;
    setCurrentFrameId(toFrameId);
  };

  const handleViewerClick = (x: number, y: number, targetName: string, isHotspot: boolean) => {
    if (sessionId) {
      db.appendEvent(sessionId, {
        type: 'click',
        nodeId: targetName,
        timestamp: new Date().toISOString(),
        x,
        y,
        isHotspot,
        taskId: activeTask?.id,
        screenId: currentFrameId
      });
    }
  };

  const handleStart = async () => {
    const session = await db.createSession(studyId);
    setSessionId(session.id);
    setActiveTaskIndex(0);
    
    if (study?.preSurveyQuestions && study.preSurveyQuestions.length > 0) {
      setStage('pre-survey');
    } else {
      const firstTask = study?.tasks && study.tasks.length > 0 ? study.tasks[0] : null;
      const startFrame = firstTask?.startingFrameNodeId || 'Home View';
      setCurrentFrameId(startFrame);
      previousNodeId.current = startFrame;
      setStage('active');
    }
  };

  const handlePreSurveySubmit = (answers: SurveyResponse[]) => {
    setPreSurveyAnswers(answers);
    const firstTask = study?.tasks && study.tasks.length > 0 ? study.tasks[0] : null;
    const startFrame = firstTask?.startingFrameNodeId || 'Home View';
    setCurrentFrameId(startFrame);
    previousNodeId.current = startFrame;
    setStage('active');
  };

  const handleActiveFinish = async () => {
    if (study) {
      const postQuestions = getPostSurveyQuestions(study);
      if (postQuestions.length > 0) {
        setStage('post-survey');
      } else {
        if (sessionId) {
          await db.saveSurveyAnswers(sessionId, preSurveyAnswers, []);
          await db.endSession(sessionId);
        }
        await db.updateStudy(study.id, { completedParticipants: study.completedParticipants + 1 });
        setStage('done');
      }
    }
  };

  const handlePostSurveySubmit = async (postAnswers: SurveyResponse[]) => {
    if (study && sessionId) {
      await db.saveSurveyAnswers(sessionId, preSurveyAnswers, postAnswers);
      await db.endSession(sessionId);
      await db.updateStudy(study.id, { completedParticipants: study.completedParticipants + 1 });
    }
    setStage('done');
  };

  if (stage === 'loading') {
    return (
      <CenteredMessage>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading study…</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </CenteredMessage>
    );
  }

  if (stage === 'not-found') {
    return (
      <CenteredMessage>
        <h1 style={{ fontSize: '20px' }}>This study isn't ready yet</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '360px', textAlign: 'center' }}>
          The link you followed doesn't point to an active usability study with a configured prototype. Please check the link with the person who shared it.
        </p>
      </CenteredMessage>
    );
  }

  if (stage === 'intro' && study) {
    return (
      <CenteredMessage>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '13px', fontWeight: 500 }}>
          <ShieldCheck size={16} /> Your interactions stay on this device
        </div>
        <h1 style={{ fontSize: '24px', textAlign: 'center' }}>{study.title}</h1>
        {study.description && (
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', textAlign: 'center', lineHeight: 1.5 }}>
            {study.description}
          </p>
        )}
        
        {study.tasks && study.tasks.length > 0 && (
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Tasks to complete ({study.tasks.length})
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              {study.tasks.map(t => (
                <li key={t.id} style={{ marginBottom: '4px' }}>
                  <strong>{t.title}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Click through the prototype as instructed. When you're done, complete the tasks.
        </p>
        <button className="btn btn-primary" onClick={handleStart}>
          Start Usability Study
        </button>
      </CenteredMessage>
    );
  }

  if (stage === 'pre-survey' && study) {
    return (
      <SurveyForm
        title="Pre-Study Questionnaire"
        subtitle="Please answer the following questions before starting the tasks."
        questions={study.preSurveyQuestions || []}
        onSubmit={handlePreSurveySubmit}
      />
    );
  }

  if (stage === 'post-survey' && study) {
    return (
      <SurveyForm
        title="Post-Study Questionnaire"
        subtitle="Please answer the following questions to help us evaluate the prototype."
        questions={getPostSurveyQuestions(study)}
        onSubmit={handlePostSurveySubmit}
      />
    );
  }

  if (stage === 'done') {
    return (
      <CenteredMessage>
        <h1 style={{ fontSize: '24px' }}>Thanks for taking part!</h1>
        <p style={{ color: 'var(--text-muted)' }}>You can close this tab now.</p>
      </CenteredMessage>
    );
  }

  // stage === 'active'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--card-bg)',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usability Study</span>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{study?.title}</span>
        </div>

        {activeTask && (
          <div style={{ 
            flex: 1, 
            maxWidth: '600px', 
            backgroundColor: 'var(--bg)', 
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              TASK {activeTaskIndex + 1} OF {study?.tasks?.length || 0}: <strong style={{ color: 'var(--text)' }}>{activeTask.title}</strong>
            </span>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {activeTask.instruction}
            </p>
          </div>
        )}

        <div>
          {study?.tasks && activeTaskIndex < study.tasks.length - 1 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                const nextIndex = activeTaskIndex + 1;
                setActiveTaskIndex(nextIndex);
                const nextTask = study?.tasks ? study.tasks[nextIndex] : null;
                const startFrame = nextTask?.startingFrameNodeId || 'Home View';
                setCurrentFrameId(startFrame);
                previousNodeId.current = startFrame;
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Next Task ➔
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleActiveFinish}>
              Finish Study
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', backgroundColor: 'black' }}>
        <PrototypeViewer
          frameId={currentFrameId}
          importedPrototype={study?.importedPrototype}
          figmaUrl={study?.figmaUrl}
          onNavigate={handleNavigate}
          onClick={handleViewerClick}
        />
      </div>
    </div>
  );
};

interface SurveyFormProps {
  title: string;
  subtitle: string;
  questions: SurveyQuestion[];
  onSubmit: (answers: SurveyResponse[]) => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ title, subtitle, questions, onSubmit }) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const unanswered = questions.filter(q => {
      const ans = answers[q.id];
      if (ans === undefined || ans === '') return true;
      if (Array.isArray(ans) && ans.length === 0) return true;
      return false;
    });

    if (unanswered.length > 0) {
      setValidationError(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    const responses: SurveyResponse[] = questions.map(q => ({
      questionId: q.id,
      questionText: q.text,
      answer: answers[q.id]
    }));
    onSubmit(responses);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '640px',
        width: '100%',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '12px' }}>
          <ClipboardList size={24} />
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Survey</span>
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 32px 0', lineHeight: 1.5 }}>{subtitle}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {questions.map((q, idx) => (
            <div 
              key={q.id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                paddingBottom: '24px',
                borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none'
              }}
            >
              <label htmlFor={`question-${q.id}`} style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                {idx + 1}. {q.text}
              </label>

              {q.type === 'short_text' && (
                <input
                  id={`question-${q.id}`}
                  type="text"
                  className="form-control"
                  value={(answers[q.id] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your response here…"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              )}

              {q.type === 'long_text' && (
                <textarea
                  id={`question-${q.id}`}
                  className="form-control"
                  value={(answers[q.id] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your response here…"
                  rows={4}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    resize: 'vertical'
                  }}
                />
              )}

              {q.type === 'number' && (
                <input
                  id={`question-${q.id}`}
                  type="number"
                  className="form-control"
                  value={(answers[q.id] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="e.g. 25"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              )}

              {q.type === 'yes_no' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['Yes', 'No'].map(opt => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'dropdown' && (
                <select
                  id={`question-${q.id}`}
                  className="form-control"
                  value={(answers[q.id] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value="">-- Select an option --</option>
                  {q.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {q.type === 'single_choice' && (
                <div role="radiogroup" aria-label={q.text} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options?.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className="survey-option-btn"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        style={{
                          padding: '12px 16px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          color: 'var(--text)'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'multiple_choice' && (
                <div role="group" aria-label={q.text} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options?.map(opt => {
                    const current = (answers[q.id] as string[]) || [];
                    const isSelected = current.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        className="survey-option-btn"
                        onClick={() => {
                          const updated = isSelected
                            ? current.filter(x => x !== opt)
                            : [...current, opt];
                          setAnswers(prev => ({ ...prev, [q.id]: updated }));
                        }}
                        style={{
                          padding: '12px 16px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                          color: 'var(--text)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          tabIndex={-1}
                          aria-hidden="true"
                          style={{ pointerEvents: 'none' }}
                        />
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'rating' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    <span>{q.ratingMinLabel || 'Strongly Disagree'}</span>
                    <span>{q.ratingMaxLabel || 'Strongly Agree'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    {Array.from({ length: (q.ratingMax || 5) - (q.ratingMin || 1) + 1 }).map((_, i) => {
                      const val = (q.ratingMin || 1) + i;
                      const isSelected = Number(answers[q.id]) === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: String(val) }))}
                          style={{
                            flex: 1,
                            height: '42px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg)',
                            color: isSelected ? 'white' : 'var(--text)',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {validationError && (
            <div role="alert" aria-live="polite" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500
            }}>
              {validationError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Questionnaire ➔'}
          </button>
        </form>
      </div>
    </div>
  );
};

const CenteredMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '16px', minHeight: '100vh', padding: '24px', textAlign: 'center',
  }}>
    {children}
  </div>
);
