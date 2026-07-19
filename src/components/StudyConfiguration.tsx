import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ClipboardList, Smartphone, HelpCircle, Loader2, Save, AlertCircle, Trash2, ExternalLink, AlertTriangle, Plus, X, ChevronUp, ChevronDown, Edit2, Monitor, Tablet, Link2, Check } from 'lucide-react';
import { db, type Study, type SurveyQuestion, type StudyTask, type ClickedElement, type RecordedPath } from '../db/db';

const DEFAULT_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    text: 'What is your age group?',
    type: 'single_choice',
    options: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65 or older']
  },
  {
    id: 'q2',
    text: 'What is your gender? (Optional)',
    type: 'dropdown',
    options: ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other']
  },
  {
    id: 'q3',
    text: 'What is your experience level with similar products/tools?',
    type: 'single_choice',
    options: ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert']
  },
  {
    id: 'q4',
    text: 'How familiar are you with this topic?',
    type: 'rating',
    ratingMin: 1,
    ratingMax: 5,
    ratingMinLabel: 'Not familiar at all',
    ratingMaxLabel: 'Extremely familiar'
  },
  {
    id: 'q5',
    text: 'How often do you use similar tools/products?',
    type: 'single_choice',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never']
  },
  {
    id: 'q6',
    text: 'Rate your general technical expertise level:',
    type: 'rating',
    ratingMin: 1,
    ratingMax: 5,
    ratingMinLabel: 'Novice',
    ratingMaxLabel: 'Expert'
  },
  {
    id: 'q7',
    text: 'What is your professional background or industry?',
    type: 'short_text'
  }
];

interface StandardizedQuestionnaire {
  key: string;
  name: string;
  description: string;
  items: string[];
}

const STANDARDIZED_QUESTIONNAIRES: StandardizedQuestionnaire[] = [
  {
    key: 'sus',
    name: 'System Usability Scale (SUS)',
    description: '10-item standardized usability questionnaire using a 5-point Likert scale (1 = Strongly disagree, 5 = Strongly agree) measuring perceived usability of a system.',
    items: [
      'I think that I would like to use this system frequently.',
      'I found the system unnecessarily complex.',
      'I thought the system was easy to use.',
      'I think that I would need the support of a technical person to be able to use this system.',
      'I found the various functions in this system were well integrated.',
      'I thought there was too much inconsistency in this system.',
      'I would imagine that most people would learn to use this system very quickly.',
      'I found the system very cumbersome to use.',
      'I felt very confident using the system.',
      'I needed to learn a lot of things before I could get going with this system.'
    ]
  },
  {
    key: 'ueq',
    name: 'User Experience Questionnaire (UEQ) - Short Version',
    description: 'Measures user experience dimensions including attractiveness, perspicuity, efficiency, dependability, stimulation, and novelty using a 7-point semantic differential scale.',
    items: [
      'Complicated vs. Simple',
      'Unpredictable vs. Predictable',
      'Inefficient vs. Efficient',
      'Clear vs. Confusing',
      'Boring vs. Exciting',
      'Conventional vs. Inventive',
      'Obstructive vs. Supportive',
      'Inferior vs. Valuable'
    ]
  },
  {
    key: 'umux_lite',
    name: 'UMUX-Lite',
    description: 'Short 2-item usability questionnaire measuring perceived usefulness and ease of use, suitable for shorter studies.',
    items: [
      'The system\'s capabilities meet my requirements.',
      'The system is easy to use.'
    ]
  },
  {
    key: 'nasa_tlx',
    name: 'NASA-TLX (Workload)',
    description: 'Measures perceived mental, physical, and temporal demands, performance, effort, and frustration level to evaluate workload.',
    items: [
      'Mental Demand (How mentally demanding was the task?)',
      'Physical Demand (How physically demanding was the task?)',
      'Temporal Demand (How hurried or rushed was the pace of the task?)',
      'Performance (How successful were you in accomplishing what you were asked to do?)',
      'Effort (How hard did you have to work to accomplish your level of performance?)',
      'Frustration (How insecure, discouraged, irritated, stressed, or annoyed were you?)'
    ]
  }
];

const standardScreens = [
  { id: 'Home View', name: 'Home View', desc: 'Landing / Splash frame' },
  { id: 'Dashboard View', name: 'Dashboard View', desc: 'Main app overview dashboard' },
  { id: 'Search View', name: 'Search View', desc: 'Search & filter listing frame' },
  { id: 'Profile View', name: 'Profile View', desc: 'User profile settings frame' }
];

interface StudyConfigurationProps {
  studyId: string;
  mode: 'create' | 'edit';
  onBack: () => void;
}

export const StudyConfiguration: React.FC<StudyConfigurationProps> = ({ studyId, mode, onBack }) => {
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Figma config state
  const [figmaUrlInput, setFigmaUrlInput] = useState('');
  const [isSavingFigma, setIsSavingFigma] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [figmaFeedback, setFigmaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ref to hold current active frame name during task recording
  const activeFrameRef = useRef<string>('Home View');

  // Load study details on mount or ID change
  useEffect(() => {
    const fetchStudy = async () => {
      setIsLoading(true);
      try {
        const data = await db.getStudyById(studyId);
        if (data) {
          // Initialize post-study configs and tasks if undefined or empty
          const needsPostInit = !data.postSurveyQuestionsMode;
          const preQuestionsEmpty = !data.preSurveyQuestions || data.preSurveyQuestions.length === 0;
          const tasksEmpty = !data.tasks || data.tasks.length === 0;

          if (preQuestionsEmpty || needsPostInit || tasksEmpty) {
            const updates: Partial<Study> = {};
            if (preQuestionsEmpty) {
              updates.preSurveyQuestions = DEFAULT_QUESTIONS;
            }
            if (needsPostInit) {
              updates.postSurveyQuestionsMode = 'none';
              updates.postSurveyStandardizedKeys = [];
              updates.postSurveyQuestions = [];
            }
            if (tasksEmpty) {
              let defaultTasks: StudyTask[] = [];
              if (studyId === '1') {
                defaultTasks = [
                  { id: 'task_1', title: 'Add red running shoes to cart', instruction: 'Find the shoes section, locate the red running shoes, select size 9, and click "Add to Cart".' },
                  { id: 'task_2', title: 'Check out shopping cart', instruction: 'Open your shopping cart, fill out shipping details, select standard shipping, and place the order.' }
                ];
              } else if (studyId === '2') {
                defaultTasks = [
                  { id: 'task_3', title: 'Inspect Ollama settings status', instruction: 'Go to the AI provider settings panel and check if local Ollama model connection has loaded.' }
                ];
              } else {
                defaultTasks = [
                  { id: 'task_4', title: 'Search for anxiety exercise', instruction: 'Open search, search for "anxiety relief meditation", click the exercise, and run a 5-minute breathing session.' },
                  { id: 'task_5', title: 'Log a mood event', instruction: 'Click the "+" button in navigation, choose mood logging, select "Calm", and click save.' }
                ];
              }
              updates.tasks = defaultTasks;
            }
            const seededData = await db.updateStudy(studyId, updates);
            setStudy(seededData);
            setFigmaUrlInput(seededData.figmaUrl || '');
          } else {
            setStudy(data);
            setFigmaUrlInput(data.figmaUrl || '');
          }
        }
      } catch (e) {
        console.error('Failed to load study for configuration:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudy();
  }, [studyId]);

  // Convert standard Figma links to official embed URLs
  const getEmbedUrl = (url: string, nodeId?: string): string => {
    if (!url) return '';
    let targetUrl = url;
    if (nodeId) {
      const separator = url.includes('?') ? '&' : '?';
      if (!url.includes('node-id=')) {
        targetUrl = `${url}${separator}node-id=${encodeURIComponent(nodeId)}`;
      }
    }
    if (targetUrl.includes('figma.com/embed')) {
      return targetUrl;
    }
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(targetUrl)}`;
  };

  // Check if URL is valid Figma link
  const isValidFigmaUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('figma.com');
    } catch (_) {
      return false;
    }
  };

  // Modal states for Question Builder
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [activeQuestionScope, setActiveQuestionScope] = useState<'pre' | 'post'>('pre');
  
  // Question form states
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'number' | 'rating' | 'yes_no' | 'dropdown'>('single_choice');
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState('');
  const [ratingMin, setRatingMin] = useState(1);
  const [ratingMax, setRatingMax] = useState(5);
  const [ratingMinLabel, setRatingMinLabel] = useState('');
  const [ratingMaxLabel, setRatingMaxLabel] = useState('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Post-study configurations state
  const [expandedPreviews, setExpandedPreviews] = useState<string[]>([]);

  const resetQuestionForm = () => {
    setQuestionText('');
    setQuestionType('single_choice');
    setOptions([]);
    setNewOptionText('');
    setRatingMin(1);
    setRatingMax(5);
    setRatingMinLabel('');
    setRatingMaxLabel('');
    setEditingQuestion(null);
    setModalFeedback(null);
  };

  const handleOpenEditQuestion = (q: SurveyQuestion, scope: 'pre' | 'post') => {
    setActiveQuestionScope(scope);
    setEditingQuestion(q);
    setQuestionText(q.text);
    setQuestionType(q.type);
    setOptions(q.options || []);
    setNewOptionText('');
    setRatingMin(q.ratingMin || 1);
    setRatingMax(q.ratingMax || 5);
    setRatingMinLabel(q.ratingMinLabel || '');
    setRatingMaxLabel(q.ratingMaxLabel || '');
    setModalFeedback(null);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);
    
    if (!questionText.trim()) {
      setModalFeedback('Question text is required.');
      return;
    }

    const isChoiceType = ['single_choice', 'multiple_choice', 'dropdown'].includes(questionType);
    if (isChoiceType && options.length === 0) {
      setModalFeedback('Please add at least one answer option.');
      return;
    }

    const currentQuestions = activeQuestionScope === 'pre'
      ? study?.preSurveyQuestions || []
      : study?.postSurveyQuestions || [];
      
    let updatedQuestions: SurveyQuestion[] = [];

    if (editingQuestion) {
      updatedQuestions = currentQuestions.map(q => {
        if (q.id === editingQuestion.id) {
          return {
            id: q.id,
            text: questionText.trim(),
            type: questionType,
            options: isChoiceType ? options : undefined,
            ratingMin: questionType === 'rating' ? ratingMin : undefined,
            ratingMax: questionType === 'rating' ? ratingMax : undefined,
            ratingMinLabel: questionType === 'rating' ? ratingMinLabel.trim() : undefined,
            ratingMaxLabel: questionType === 'rating' ? ratingMaxLabel.trim() : undefined
          };
        }
        return q;
      });
    } else {
      const newQuestion: SurveyQuestion = {
        id: 'q_' + Date.now().toString(),
        text: questionText.trim(),
        type: questionType,
        options: isChoiceType ? options : undefined,
        ratingMin: questionType === 'rating' ? ratingMin : undefined,
        ratingMax: questionType === 'rating' ? ratingMax : undefined,
        ratingMinLabel: questionType === 'rating' ? ratingMinLabel.trim() : undefined,
        ratingMaxLabel: questionType === 'rating' ? ratingMaxLabel.trim() : undefined
      };
      updatedQuestions = [...currentQuestions, newQuestion];
    }

    try {
      const updateData = activeQuestionScope === 'pre'
        ? { preSurveyQuestions: updatedQuestions }
        : { postSurveyQuestions: updatedQuestions };
        
      const updated = await db.updateStudy(studyId, updateData);
      setStudy(updated);
      setIsQuestionModalOpen(false);
      resetQuestionForm();
    } catch (err) {
      setModalFeedback('Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (id: string, scope: 'pre' | 'post') => {
    if (!study) return;
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    const currentQuestions = scope === 'pre'
      ? study.preSurveyQuestions || []
      : study.postSurveyQuestions || [];
      
    const updatedQuestions = currentQuestions.filter(q => q.id !== id);
    try {
      const updateData = scope === 'pre'
        ? { preSurveyQuestions: updatedQuestions }
        : { postSurveyQuestions: updatedQuestions };
      const updated = await db.updateStudy(studyId, updateData);
      setStudy(updated);
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down', scope: 'pre' | 'post') => {
    if (!study) return;
    const currentQuestions = scope === 'pre'
      ? study.preSurveyQuestions || []
      : study.postSurveyQuestions || [];
      
    const list = [...currentQuestions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    
    try {
      const updateData = scope === 'pre'
        ? { preSurveyQuestions: list }
        : { postSurveyQuestions: list };
      const updated = await db.updateStudy(studyId, updateData);
      setStudy(updated);
    } catch (err) {
      console.error('Failed to reorder questions:', err);
    }
  };

  const handleSelectPostMode = async (mode: 'none' | 'standardized' | 'custom') => {
    try {
      const updated = await db.updateStudy(studyId, { 
        postSurveyQuestionsMode: mode,
        postSurveyStandardizedKeys: mode === 'standardized' ? (study?.postSurveyStandardizedKeys || []) : undefined
      });
      setStudy(updated);
    } catch (err) {
      console.error('Failed to update post-study mode:', err);
    }
  };

  const handleToggleStandardized = async (key: string) => {
    if (!study) return;
    const currentKeys = study.postSurveyStandardizedKeys || [];
    let updatedKeys: string[] = [];
    if (currentKeys.includes(key)) {
      updatedKeys = currentKeys.filter(k => k !== key);
    } else {
      updatedKeys = [...currentKeys, key];
    }
    try {
      const updated = await db.updateStudy(studyId, { postSurveyStandardizedKeys: updatedKeys });
      setStudy(updated);
    } catch (err) {
      console.error('Failed to update selected questionnaires:', err);
    }
  };

  const togglePreview = (key: string) => {
    if (expandedPreviews.includes(key)) {
      setExpandedPreviews(expandedPreviews.filter(k => k !== key));
    } else {
      setExpandedPreviews([...expandedPreviews, key]);
    }
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    if (options.includes(newOptionText.trim())) {
      setModalFeedback('This option already exists.');
      return;
    }
    setOptions([...options, newOptionText.trim()]);
    setNewOptionText('');
    setModalFeedback(null);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const getQuestionTypeLabel = (type: SurveyQuestion['type']) => {
    switch (type) {
      case 'single_choice': return 'Single Choice';
      case 'multiple_choice': return 'Multiple Choice';
      case 'dropdown': return 'Dropdown';
      case 'rating': return 'Rating Scale';
      case 'short_text': return 'Short Text';
      case 'long_text': return 'Long Text';
      case 'number': return 'Numeric Input';
      case 'yes_no': return 'Yes/No';
      default: return type;
    }
  };

  const getQuestionTypeColor = (type: SurveyQuestion['type']) => {
    switch (type) {
      case 'single_choice':
      case 'multiple_choice':
      case 'dropdown':
        return { bg: 'rgba(59, 130, 246, 0.08)', text: 'var(--primary)' };
      case 'rating':
        return { bg: 'rgba(249, 115, 22, 0.08)', text: '#f97316' };
      case 'yes_no':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--success)' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.08)', text: 'var(--text-muted)' };
    }
  };

  // Wizard navigation state
  const [activeStep, setActiveStep] = useState<'general' | 'tasks'>('general');

  // Task Configuration states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [taskTitleInput, setTaskTitleInput] = useState('');
  const [taskInstructionInput, setTaskInstructionInput] = useState('');
  const [taskStartingFrameNodeIdInput, setTaskStartingFrameNodeIdInput] = useState('');
  const [taskFeedback, setTaskFeedback] = useState<string | null>(null);

  // Task Starting Frame Visual Selector states
  const [isVisualSelectorOpen, setIsVisualSelectorOpen] = useState(false);
  const [activeSelectorFrame, setActiveSelectorFrame] = useState<string>('');
  const [selectorIframeLoading, setSelectorIframeLoading] = useState(false);

  // Recording expected solution states
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [recordingTask, setRecordingTask] = useState<StudyTask | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [recordingSteps, setRecordingSteps] = useState<ClickedElement[]>([]);
  const [recordingFrames, setRecordingFrames] = useState<string[]>([]);
  const [customFrameInput, setCustomFrameInput] = useState('');
  const [customClickInput, setCustomClickInput] = useState('');
  const [recordingIframeLoading, setRecordingIframeLoading] = useState(false);

  // Viewport and Link copying states
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyParticipantLink = () => {
    const participantUrl = `${window.location.origin}${window.location.pathname}?session=${studyId}`;
    navigator.clipboard.writeText(participantUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy participant link:', err);
      });
  };

  // Listen for Figma message events during expected path recording
  useEffect(() => {
    if (!isRecordingModalOpen || !recordingTask) return;

    const handleFigmaMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.figma.com') return;
      const { type, data } = event.data || {};

      if (type === 'MOUSE_PRESS_OR_RELEASE' && data) {
        const timeElapsed = Date.now() - recordingStartTime;
        const currentFrame = activeFrameRef.current;
        const targetName = data.targetNodeId || 'Figma Node';
        
        const newClick: ClickedElement = {
          targetName,
          timestamp: timeElapsed,
          frameName: currentFrame
        };
        setRecordingSteps(prev => [...prev, newClick]);
      } else if (type === 'PRESENTED_NODE_CHANGED' && data) {
        const toNodeId = data.presentedNodeId;
        if (!toNodeId) return;

        activeFrameRef.current = toNodeId;
        setRecordingFrames(prev => {
          if (prev.length === 0) {
            return [toNodeId];
          }
          if (prev[prev.length - 1] === toNodeId) {
            return prev;
          }
          return [...prev, toNodeId];
        });
      }
    };

    window.addEventListener('message', handleFigmaMessage);
    return () => window.removeEventListener('message', handleFigmaMessage);
  }, [isRecordingModalOpen, recordingTask, recordingStartTime]);

  // Listen for Figma message events during visual frame selection in task modal
  useEffect(() => {
    if (!isVisualSelectorOpen || !study?.figmaUrl) return;

    const handleSelectorMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.figma.com') return;
      const { type, data } = event.data || {};

      if (type === 'PRESENTED_NODE_CHANGED' && data) {
        const toNodeId = data.presentedNodeId;
        if (toNodeId) {
          setActiveSelectorFrame(toNodeId);
        }
      }
    };

    window.addEventListener('message', handleSelectorMessage);
    return () => window.removeEventListener('message', handleSelectorMessage);
  }, [isVisualSelectorOpen, study?.figmaUrl]);

  // Tasks operations
  const resetTaskForm = () => {
    setTaskTitleInput('');
    setTaskInstructionInput('');
    setTaskStartingFrameNodeIdInput('');
    setIsVisualSelectorOpen(false);
    setActiveSelectorFrame('');
    setSelectorIframeLoading(false);
    setEditingTask(null);
    setTaskFeedback(null);
  };

  const handleOpenEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskTitleInput(task.title);
    setTaskInstructionInput(task.instruction);
    setTaskStartingFrameNodeIdInput(task.startingFrameNodeId || '');
    setTaskFeedback(null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFeedback(null);

    if (!taskTitleInput.trim()) {
      setTaskFeedback('Task title is required.');
      return;
    }
    if (!taskInstructionInput.trim()) {
      setTaskFeedback('Task instruction is required.');
      return;
    }

    const currentTasks = study?.tasks || [];
    let updatedTasks: StudyTask[] = [];

    if (editingTask) {
      updatedTasks = currentTasks.map(t => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            title: taskTitleInput.trim(),
            instruction: taskInstructionInput.trim(),
            startingFrameNodeId: taskStartingFrameNodeIdInput.trim() || undefined
          };
        }
        return t;
      });
    } else {
      const newTask: StudyTask = {
        id: 'task_' + Date.now().toString(),
        title: taskTitleInput.trim(),
        instruction: taskInstructionInput.trim(),
        startingFrameNodeId: taskStartingFrameNodeIdInput.trim() || undefined
      };
      updatedTasks = [...currentTasks, newTask];
    }

    try {
      const updated = await db.updateStudy(studyId, { tasks: updatedTasks });
      setStudy(updated);
      setIsTaskModalOpen(false);
      resetTaskForm();
    } catch (err) {
      setTaskFeedback('Failed to save task.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!study) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    const updatedTasks = (study.tasks || []).filter(t => t.id !== id);
    try {
      const updated = await db.updateStudy(studyId, { tasks: updatedTasks });
      setStudy(updated);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    if (!study || !study.tasks) return;
    const list = [...study.tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    try {
      const updated = await db.updateStudy(studyId, { tasks: list });
      setStudy(updated);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
    }
  };

  // Recording operations
  const handleStartRecording = (task: StudyTask) => {
    setRecordingTask(task);
    setRecordingStartTime(Date.now());
    setRecordingSteps([]);
    if (task.startingFrameNodeId) {
      setRecordingFrames([task.startingFrameNodeId]);
      activeFrameRef.current = task.startingFrameNodeId;
    } else {
      setRecordingFrames([]);
      activeFrameRef.current = 'Home View';
    }
    setCustomFrameInput('');
    setCustomClickInput('');
    setRecordingIframeLoading(true);
    setIsRecordingModalOpen(true);
  };

  const handleLogFrameChange = (frameName: string) => {
    if (!frameName.trim()) return;
    activeFrameRef.current = frameName.trim();
    setRecordingFrames([...recordingFrames, frameName.trim()]);
    setCustomFrameInput('');
  };

  const handleLogClickEvent = (targetName: string) => {
    if (!targetName.trim()) return;
    const currentFrame = recordingFrames[recordingFrames.length - 1] || 'Home View';
    const click: ClickedElement = {
      targetName: targetName.trim(),
      timestamp: Date.now() - recordingStartTime,
      frameName: currentFrame
    };
    setRecordingSteps([...recordingSteps, click]);
    setCustomClickInput('');
  };

  const handleRemoveRecordedStep = (idx: number) => {
    setRecordingSteps(recordingSteps.filter((_, i) => i !== idx));
  };

  const handleRemoveRecordedFrame = (idx: number) => {
    if (idx === 0) return; // Keep starting frame
    setRecordingFrames(recordingFrames.filter((_, i) => i !== idx));
  };

  const handleFinishRecording = async () => {
    if (!study || !recordingTask) return;
    if (recordingFrames.length === 0) {
      alert('Please record at least the starting frame.');
      return;
    }

    const recordedPath: RecordedPath = {
      startingFrame: recordingFrames[0],
      framesVisited: recordingFrames,
      navigationPath: recordingFrames,
      clickedElements: recordingSteps,
      orderOfInteractions: [
        `Started at ${recordingFrames[0]}`,
        ...recordingSteps.map(c => `Clicked "${c.targetName}" on ${c.frameName}`),
        `Finished flow`
      ],
      completedStatus: true
    };

    const updatedTasks = (study.tasks || []).map(t => {
      if (t.id === recordingTask.id) {
        return {
          ...t,
          expectedPath: recordedPath
        };
      }
      return t;
    });

    try {
      const updated = await db.updateStudy(studyId, { tasks: updatedTasks });
      setStudy(updated);
      setIsRecordingModalOpen(false);
      setRecordingTask(null);
    } catch (err) {
      alert('Failed to save recorded path.');
    }
  };

  const handleDeleteExpectedPath = async (taskId: string) => {
    if (!study) return;
    if (!window.confirm('Are you sure you want to clear the expected solution for this task?')) return;

    const updatedTasks = (study.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          expectedPath: undefined
        };
      }
      return t;
    });

    try {
      const updated = await db.updateStudy(studyId, { tasks: updatedTasks });
      setStudy(updated);
    } catch (err) {
      console.error('Failed to clear expected path:', err);
    }
  };

  // Handle Save Figma Link
  const handleSaveFigma = async (e: React.FormEvent) => {
    e.preventDefault();
    setFigmaFeedback(null);

    if (!figmaUrlInput.trim()) {
      setFigmaFeedback({ type: 'error', text: 'URL cannot be empty. Click "Remove" if you want to clear the prototype.' });
      return;
    }

    if (!isValidFigmaUrl(figmaUrlInput)) {
      setFigmaFeedback({ 
        type: 'error', 
        text: 'Please enter a valid Figma URL (e.g., figma.com/proto/... or figma.com/file/...)' 
      });
      return;
    }

    setIsSavingFigma(true);
    setIframeLoading(true);
    try {
      const updated = await db.updateStudy(studyId, { figmaUrl: figmaUrlInput });
      setStudy(updated);
      setFigmaFeedback({ type: 'success', text: 'Prototype URL saved successfully.' });
    } catch (err) {
      setFigmaFeedback({ type: 'error', text: 'Failed to save prototype link.' });
    } finally {
      setIsSavingFigma(false);
    }
  };

  // Handle Clear Figma Link
  const handleClearFigma = async () => {
    if (!window.confirm('Are you sure you want to remove the Figma prototype link from this study?')) return;
    
    setFigmaFeedback(null);
    setIsSavingFigma(true);
    try {
      const updated = await db.updateStudy(studyId, { figmaUrl: '' });
      setStudy(updated);
      setFigmaUrlInput('');
      setFigmaFeedback({ type: 'success', text: 'Prototype URL removed.' });
    } catch (err) {
      setFigmaFeedback({ type: 'error', text: 'Failed to clear prototype.' });
    } finally {
      setIsSavingFigma(false);
    }
  };

  // Trigger iframe loader trigger on figmaUrl change
  useEffect(() => {
    if (study?.figmaUrl) {
      setIframeLoading(true);
    } else {
      setIframeLoading(false);
    }
  }, [study?.figmaUrl]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading study configuration...</span>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="placeholder-container" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h2 className="placeholder-title" style={{ color: 'var(--error)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Study Not Found</h2>
        <p className="placeholder-desc" style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The usability study you are configuring does not exist in local storage.</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header and Navigation */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={onBack} 
          style={{ marginBottom: '16px' }}
          aria-label="Go back to Dashboard"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div>
          <span className="details-section-label">Module 2: Study Setup</span>
          <h1 style={{ fontSize: '28px', marginTop: '2px', letterSpacing: '-0.5px' }}>
            Study Configuration — {study.title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Set up questions and prototype embeds for your usability study sessions.
          </p>
        </div>
      </div>

      {/* Wizard Progress Tracker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '16px'
      }}>
        {/* Step 1 */}
        <div 
          onClick={() => setActiveStep('general')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeStep === 'general' ? 'var(--primary-light)' : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: activeStep === 'general' ? 'var(--primary)' : 'var(--border)',
            color: activeStep === 'general' ? 'white' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700
          }}>
            1
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: activeStep === 'general' ? 'var(--primary)' : 'var(--text-muted)'
          }}>
            Surveys & Prototype Link
          </span>
        </div>

        {/* Arrow Connector */}
        <div style={{ color: 'var(--border)', fontSize: '18px' }}>➔</div>

        {/* Step 2 */}
        <div 
          onClick={() => setActiveStep('tasks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeStep === 'tasks' ? 'var(--primary-light)' : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: activeStep === 'tasks' ? 'var(--primary)' : 'var(--border)',
            color: activeStep === 'tasks' ? 'white' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700
          }}>
            2
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: activeStep === 'tasks' ? 'var(--primary)' : 'var(--text-muted)'
          }}>
            Task Configuration & Recording
          </span>
        </div>
      </div>

      {/* Warning Alert Banner (only shown in edit mode) */}
      {mode === 'edit' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          fontSize: '13px',
          color: 'var(--warning)',
          lineHeight: '1.5'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Changing the study configuration after a study has been created is not recommended, as it may affect the consistency of collected data. Proceed only if you understand the implications.
          </div>
        </div>
      )}

      {/* Main Configuration Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {activeStep === 'general' && (
          <>
            {/* Section 1: Pre-Study Questions */}
        <section 
          aria-labelledby="pre-study-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-sm)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ClipboardList size={18} />
              </div>
              <div>
                <h2 id="pre-study-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  1. Pre-Study Questions
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                  Screen participants or gather initial demographic and context questions before the usability test begins.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                resetQuestionForm();
                setActiveQuestionScope('pre');
                setIsQuestionModalOpen(true);
              }}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                height: 'auto'
              }}
            >
              <Plus size={14} />
              <span>Add Question</span>
            </button>
          </div>

          {/* List of configured questions */}
          {study && study.preSurveyQuestions && study.preSurveyQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {study.preSurveyQuestions.map((q, idx) => {
                const colors = getQuestionTypeColor(q.type);
                return (
                  <div 
                    key={q.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      backgroundColor: 'var(--bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Q{idx + 1}
                        </span>
                        <span style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {getQuestionTypeLabel(q.type)}
                        </span>
                      </div>

                      {/* Question Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'up', 'pre')}
                          disabled={idx === 0}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === 0 ? 'var(--border)' : 'var(--text-muted)',
                            cursor: idx === 0 ? 'default' : 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Move Question Up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'down', 'pre')}
                          disabled={idx === (study.preSurveyQuestions?.length || 0) - 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === (study.preSurveyQuestions?.length || 0) - 1 ? 'var(--border)' : 'var(--text-muted)',
                            cursor: idx === (study.preSurveyQuestions?.length || 0) - 1 ? 'default' : 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Move Question Down"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q, 'pre')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '4px'
                          }}
                          title="Edit Question"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id, 'pre')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.4' }}>
                      {q.text}
                    </div>

                    {/* Meta info like options or rating ranges */}
                    {['single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && q.options && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {q.options.map((opt, oIdx) => (
                          <span key={oIdx} style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {q.type === 'rating' && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Scale: {q.ratingMin} to {q.ratingMax} 
                        {q.ratingMinLabel || q.ratingMaxLabel ? ` (${q.ratingMinLabel || 'min'} to ${q.ratingMaxLabel || 'max'})` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              marginTop: '16px'
            }}>
              <HelpCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                No questions configured
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
                Click "Add Question" to create background or screening questions for your participants.
              </p>
            </div>
          )}
        </section>

        {/* Section 2: Prototype */}
        <section 
          aria-labelledby="prototype-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-sm)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Smartphone size={18} />
              </div>
              <div>
                <h2 id="prototype-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  2. Prototype
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                  Embed the target Figma prototype link that participants will interact with during the usability test.
                </p>
              </div>
            </div>

            {study.figmaUrl && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleClearFigma}
                disabled={isSavingFigma}
                style={{ fontSize: '12px', height: '32px', padding: '0 12px', gap: '6px' }}
              >
                <Trash2 size={13} /> Remove Link
              </button>
            )}
          </div>

          {/* Link configuration state */}
          {!study.figmaUrl ? (
            <div style={{ marginTop: '16px' }}>
              <form onSubmit={handleSaveFigma} style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Paste Figma prototype or file URL, e.g. https://www.figma.com/proto/..."
                    value={figmaUrlInput}
                    onChange={(e) => { setFigmaUrlInput(e.target.value); if (figmaFeedback) setFigmaFeedback(null); }}
                    disabled={isSavingFigma}
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSavingFigma}
                  style={{ height: '38px', gap: '6px' }}
                >
                  <Save size={15} /> Save Link
                </button>
              </form>

              {figmaFeedback && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '12px',
                  backgroundColor: figmaFeedback.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                  color: figmaFeedback.type === 'success' ? 'var(--success)' : 'var(--error)',
                  border: `1px solid ${figmaFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
                }}>
                  <AlertCircle size={16} />
                  <span>{figmaFeedback.text}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '13px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', marginRight: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>Active Embed:</span>
                  <a 
                    href={study.figmaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: 'var(--primary)', textDecoration: 'underline', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {study.figmaUrl}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <a 
                    href={study.figmaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-secondary" 
                    style={{ fontSize: '11px', height: '26px', padding: '0 8px', gap: '4px', border: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    Open in Figma <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Preview controls (Viewport select & Link copying) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
                {/* Viewport controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Device Viewport:</span>
                  <div style={{ display: 'flex', backgroundColor: 'rgba(0, 0, 0, 0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setViewport('desktop')}
                      className={`btn btn-secondary`}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        height: 'auto',
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: viewport === 'desktop' ? 'var(--card-bg)' : 'transparent',
                        color: viewport === 'desktop' ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Monitor size={12} style={{ marginRight: '4px' }} /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('tablet')}
                      className={`btn btn-secondary`}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        height: 'auto',
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: viewport === 'tablet' ? 'var(--card-bg)' : 'transparent',
                        color: viewport === 'tablet' ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Tablet size={12} style={{ marginRight: '4px' }} /> Tablet
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('mobile')}
                      className={`btn btn-secondary`}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        height: 'auto',
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: viewport === 'mobile' ? 'var(--card-bg)' : 'transparent',
                        color: viewport === 'mobile' ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Smartphone size={12} style={{ marginRight: '4px' }} /> Mobile
                    </button>
                  </div>
                </div>

                {/* Copy Participant Link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyParticipantLink}
                    style={{ fontSize: '11px', height: '28px', padding: '0 10px', gap: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    {linkCopied ? <Check size={12} /> : <Link2 size={12} />}
                    {linkCopied ? 'Link copied!' : 'Copy Participant Link'}
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    For tracked testing sessions.
                  </span>
                </div>
              </div>

              {/* Preview Canvas (Dynamic viewport width frame layout) */}
              <div style={{
                position: 'relative',
                backgroundColor: 'black',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
                height: '500px',
                margin: '0 auto',
                transition: 'width 0.3s ease'
              }}>
                {iframeLoading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#0a0a0a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    gap: '12px',
                    color: '#9ca3af'
                  }}>
                    <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '11px' }}>Connecting to Figma Embed Player...</span>
                  </div>
                )}

                <iframe
                  src={getEmbedUrl(study.figmaUrl || '')}
                  title="Figma Prototype Preview"
                  allowFullScreen
                  onLoad={() => setIframeLoading(false)}
                  style={{
                    border: 'none',
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </>
    )}

    {activeStep === 'tasks' && (
      <>
        {/* Task Configuration Section */}
        <section 
          aria-labelledby="task-config-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-sm)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Smartphone size={18} />
              </div>
              <div>
                <h2 id="task-config-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Task Configuration & Reference Solution
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                  Define tasks for participants to complete in the Figma prototype and record the successful expected user journey.
                </p>
              </div>
            </div>

            {study.figmaUrl && (
              <button
                type="button"
                onClick={() => {
                  resetTaskForm();
                  setIsTaskModalOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  height: 'auto'
                }}
              >
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            )}
          </div>

          {!study.figmaUrl ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--error)',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Prototype embed link required:</strong> Please paste and save a Figma prototype URL in Section 2 above to begin configuring tasks and recording their expected flows.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {study.tasks && study.tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {study.tasks.map((task, idx) => (
                    <div 
                      key={task.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '18px',
                        backgroundColor: 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                              TASK {idx + 1}
                            </span>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                              {task.title}
                            </h3>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: '1.4' }}>
                            <strong>Instruction:</strong> {task.instruction}
                          </p>
                        </div>

                        {/* Task Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleMoveTask(idx, 'up')}
                            disabled={idx === 0}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: idx === 0 ? 'var(--border)' : 'var(--text-muted)',
                              cursor: idx === 0 ? 'default' : 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Move Task Up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTask(idx, 'down')}
                            disabled={idx === (study.tasks?.length || 0) - 1}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: idx === (study.tasks?.length || 0) - 1 ? 'var(--border)' : 'var(--text-muted)',
                              cursor: idx === (study.tasks?.length || 0) - 1 ? 'default' : 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Move Task Down"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTask(task)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              marginLeft: '4px'
                            }}
                            title="Edit Task"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Delete Task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Define Expected Solution Section */}
                      <div style={{
                        borderTop: '1px dashed var(--border)',
                        paddingTop: '12px',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Define Expected Solution
                          </span>
                          {task.expectedPath ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--success)',
                              backgroundColor: 'var(--success-bg)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              🟢 Expected flow defined ({task.expectedPath.clickedElements.length} interactions)
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--danger)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              🔴 Expected flow not defined
                            </span>
                          )}
                        </div>

                        {task.expectedPath ? (
                          <div style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 14px',
                            fontSize: '13px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div>
                              <strong>Starting Frame:</strong> <code style={{ backgroundColor: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>{task.expectedPath.startingFrame}</code>
                            </div>
                            <div>
                              <strong>Visited Flow Path:</strong>{' '}
                              <span style={{ color: 'var(--text-muted)' }}>
                                {task.expectedPath.framesVisited.join(' ➔ ')}
                              </span>
                            </div>
                            {task.expectedPath.clickedElements.length > 0 && (
                              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                <strong>Recorded clicks timeline:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                  {task.expectedPath.clickedElements.map((click, cIdx) => (
                                    <span key={cIdx} style={{
                                      backgroundColor: 'var(--primary-light)',
                                      color: 'var(--primary)',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(59, 130, 246, 0.1)'
                                    }}>
                                      {cIdx + 1}. Click "{click.targetName}" on <code style={{ fontSize: '11px' }}>{click.frameName}</code> ({Math.round(click.timestamp / 100) / 10}s)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleStartRecording(task)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', gap: '4px' }}
                              >
                                Redo Recording
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpectedPath(task.id)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', color: 'var(--danger)', gap: '4px' }}
                              >
                                Clear Flow
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleStartRecording(task)}
                              className="btn btn-primary"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                height: 'auto',
                                backgroundColor: 'var(--danger)',
                                borderColor: 'var(--danger)'
                              }}
                            >
                              <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', animation: 'spin 1.5s infinite ease-in-out' }}></span>
                              <span>Start Task Recording</span>
                            </button>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Perform the task yourself in the prototype to record clicks, visited frames, and interaction order.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }}>
                  <HelpCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    No tasks configured
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
                    Click "Add Task" to create task instructions and configure their expected completion paths.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </>
    )}

    {activeStep === 'general' && (
      <>
        {/* Section 3: Post-Study Questions */}
        <section 
          aria-labelledby="post-study-heading"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 id="post-study-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                3. Post-Study Questions
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                Gather feedback, user satisfaction ratings, and final remarks after participants complete the prototype tasks.
              </p>
            </div>
          </div>

          {/* Mode Selection Grid */}
          {study && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Option 1: None */}
              <div 
                onClick={() => handleSelectPostMode('none')}
                style={{
                  border: study.postSurveyQuestionsMode === 'none' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  backgroundColor: study.postSurveyQuestionsMode === 'none' ? 'var(--primary-light)' : 'var(--bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    checked={study.postSurveyQuestionsMode === 'none'}
                    onChange={() => handleSelectPostMode('none')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>No Post-Study Questions</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Do not display any questionnaire to participants after task completion.
                </span>
              </div>

              {/* Option 2: Standardized */}
              <div 
                onClick={() => handleSelectPostMode('standardized')}
                style={{
                  border: study.postSurveyQuestionsMode === 'standardized' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  backgroundColor: study.postSurveyQuestionsMode === 'standardized' ? 'var(--primary-light)' : 'var(--bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    checked={study.postSurveyQuestionsMode === 'standardized'}
                    onChange={() => handleSelectPostMode('standardized')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Standardized Questionnaires</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Select from common UX evaluations like SUS, UEQ, UMUX-Lite, or NASA-TLX.
                </span>
              </div>

              {/* Option 3: Custom */}
              <div 
                onClick={() => handleSelectPostMode('custom')}
                style={{
                  border: study.postSurveyQuestionsMode === 'custom' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  backgroundColor: study.postSurveyQuestionsMode === 'custom' ? 'var(--primary-light)' : 'var(--bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    checked={study.postSurveyQuestionsMode === 'custom'}
                    onChange={() => handleSelectPostMode('custom')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Custom Questions</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Create and manage your own custom feedback forms for this study.
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Post-Study Sub-Panels */}
          {study && study.postSurveyQuestionsMode === 'none' && (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}>
              No post-study questions will be shown to participants.
            </div>
          )}

          {study && study.postSurveyQuestionsMode === 'standardized' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {STANDARDIZED_QUESTIONNAIRES.map((q) => {
                const isSelected = (study.postSurveyStandardizedKeys || []).includes(q.key);
                const isExpanded = expandedPreviews.includes(q.key);
                return (
                  <div 
                    key={q.key}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      backgroundColor: 'var(--card-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }} onClick={() => handleToggleStandardized(q.key)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handler handled by card click
                          style={{ marginTop: '4px', cursor: 'pointer' }}
                        />
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                            {q.name}
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                            {q.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePreview(q.key)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          height: 'auto',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isExpanded ? 'Hide Items' : 'Preview Questions'}
                      </button>
                    </div>

                    {/* Expandable Preview Section */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '12px',
                        backgroundColor: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: 'var(--text)'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                          Questionnaire Items Preview
                        </div>
                        <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {q.items.map((item, idx) => (
                            <li key={idx} style={{ lineHeight: '1.4', fontSize: '13px' }}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {study && study.postSurveyQuestionsMode === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Configure your own custom questionnaire to show at the end of the session.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetQuestionForm();
                    setActiveQuestionScope('post');
                    setIsQuestionModalOpen(true);
                  }}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    height: 'auto'
                  }}
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>

              {study.postSurveyQuestions && study.postSurveyQuestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {study.postSurveyQuestions.map((q, idx) => {
                    const colors = getQuestionTypeColor(q.type);
                    return (
                      <div 
                        key={q.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '16px',
                          backgroundColor: 'var(--bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                              PQ{idx + 1}
                            </span>
                            <span style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {getQuestionTypeLabel(q.type)}
                            </span>
                          </div>

                          {/* Question Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up', 'post')}
                              disabled={idx === 0}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: idx === 0 ? 'var(--border)' : 'var(--text-muted)',
                                cursor: idx === 0 ? 'default' : 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Move Question Up"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down', 'post')}
                              disabled={idx === (study.postSurveyQuestions?.length || 0) - 1}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: idx === (study.postSurveyQuestions?.length || 0) - 1 ? 'var(--border)' : 'var(--text-muted)',
                                cursor: idx === (study.postSurveyQuestions?.length || 0) - 1 ? 'default' : 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Move Question Down"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(q, 'post')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '4px'
                              }}
                              title="Edit Question"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id, 'post')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Delete Question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', lineHeight: '1.4' }}>
                          {q.text}
                        </div>

                        {/* Meta info like options or rating ranges */}
                        {['single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && q.options && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {q.options.map((opt, oIdx) => (
                              <span key={oIdx} style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.type === 'rating' && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Scale: {q.ratingMin} to {q.ratingMax} 
                            {q.ratingMinLabel || q.ratingMaxLabel ? ` (${q.ratingMinLabel || 'min'} to ${q.ratingMaxLabel || 'max'})` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  marginTop: '16px'
                }}>
                  <HelpCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    No custom questions configured
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.4' }}>
                    Click "Add Question" to build follow-up questions for this usability test session.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </>
    )}

    {/* Footer navigation buttons */}
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
      {activeStep === 'general' ? (
        <>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={onBack}
            aria-label="Cancel study configuration"
          >
            Cancel
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => setActiveStep('tasks')}
            aria-label="Proceed to task configuration"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Next: Configure Tasks</span>
            <span>➔</span>
          </button>
        </>
      ) : (
        <>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => setActiveStep('general')}
            aria-label="Back to general settings"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⬅ Back to Setup</span>
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => {
              alert("Configuration saved successfully.");
              onBack();
            }}
            aria-label="Save and finish study configuration"
            style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
          >
            Save & Finish
          </button>
        </>
      )}
    </div>

      {/* Question Builder Modal */}
      {isQuestionModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 48px)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {editingQuestion ? 'Edit Pre-Study Question' : 'Add Pre-Study Question'}
              </h3>
              <button 
                type="button"
                onClick={() => { setIsQuestionModalOpen(false); resetQuestionForm(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {modalFeedback && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={14} />
                    <span>{modalFeedback}</span>
                  </div>
                )}

                {/* Question Text */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    Question text
                  </label>
                  <input
                    type="text"
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    placeholder='e.g., "What is your experience level with similar applications?"'
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>

                {/* Question Type selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    Question type
                  </label>
                  <select
                    value={questionType}
                    onChange={e => {
                      const val = e.target.value as any;
                      setQuestionType(val);
                      setModalFeedback(null);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="single_choice">Single choice (one answer)</option>
                    <option value="multiple_choice">Multiple choice (multiple answers allowed)</option>
                    <option value="dropdown">Dropdown selection</option>
                    <option value="rating">Rating scale (e.g., 1-5)</option>
                    <option value="short_text">Short text answer</option>
                    <option value="long_text">Long text answer</option>
                    <option value="number">Numeric input</option>
                    <option value="yes_no">Yes/No question</option>
                  </select>
                </div>

                {/* Dynamic Choice Options */}
                {['single_choice', 'multiple_choice', 'dropdown'].includes(questionType) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Answer options
                    </label>
                    
                    {options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        {options.map((opt, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: 'var(--text)'
                          }}>
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
                        No options added yet. Add at least one option below.
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={newOptionText}
                        onChange={e => setNewOptionText(e.target.value)}
                        placeholder="Add new option text..."
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '13px',
                          outline: 'none',
                          flexGrow: 1
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="btn btn-secondary"
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          height: 'auto'
                        }}
                      >
                        Add option
                      </button>
                    </div>
                  </div>
                )}

                {/* Dynamic Rating Configurations */}
                {questionType === 'rating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          Minimum Value
                        </label>
                        <select
                          value={ratingMin}
                          onChange={e => setRatingMin(parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="0">0</option>
                          <option value="1">1</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          Maximum Value
                        </label>
                        <select
                          value={ratingMax}
                          onChange={e => setRatingMax(parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="3">3</option>
                          <option value="5">5</option>
                          <option value="7">7</option>
                          <option value="10">10</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          Min value label
                        </label>
                        <input
                          type="text"
                          value={ratingMinLabel}
                          onChange={e => setRatingMinLabel(e.target.value)}
                          placeholder='e.g., "Novice"'
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          Max value label
                        </label>
                        <input
                          type="text"
                          value={ratingMaxLabel}
                          onChange={e => setRatingMaxLabel(e.target.value)}
                          placeholder='e.g., "Expert"'
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
              
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'var(--bg)'
              }}>
                <button
                  type="button"
                  onClick={() => { setIsQuestionModalOpen(false); resetQuestionForm(); }}
                  className="btn btn-secondary"
                  style={{ minWidth: '80px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minWidth: '100px' }}
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation/Editing Modal */}
      {isTaskModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: isVisualSelectorOpen ? '900px' : '500px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'max-width 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {editingTask ? 'Edit Task' : 'Add Usability Task'}
              </h3>
              <button 
                type="button"
                onClick={() => { setIsTaskModalOpen(false); resetTaskForm(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: isVisualSelectorOpen ? 'row' : 'column', 
                gap: '24px',
                overflow: 'hidden'
              }}>
                {/* Form Fields Column */}
                <div style={{ 
                  flex: isVisualSelectorOpen ? '0 0 380px' : '1', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px' 
                }}>
                  {taskFeedback && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={14} />
                      <span>{taskFeedback}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskTitleInput}
                      onChange={e => setTaskTitleInput(e.target.value)}
                      placeholder='e.g., "Add running shoes to cart"'
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        width: '100%'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Instruction to Participant
                    </label>
                    <textarea
                      value={taskInstructionInput}
                      onChange={e => setTaskInstructionInput(e.target.value)}
                      placeholder='e.g., "Browse the shoes catalog, click on the red running shoes, select size 9, and click Add to Cart."'
                      rows={4}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        width: '100%',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Select Start Screen Frame Card Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Select Start Screen Frame
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '10px',
                      marginBottom: '4px'
                    }}>
                      {standardScreens.map(scr => {
                        const isSelected = taskStartingFrameNodeIdInput === scr.id;
                        return (
                          <div
                            key={scr.id}
                            onClick={() => setTaskStartingFrameNodeIdInput(scr.id)}
                            style={{
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px',
                              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              position: 'relative',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{
                              height: '48px',
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '4px',
                              gap: '3px'
                            }}>
                              {scr.id === 'Home View' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', height: '100%' }}>
                                  <div style={{ height: '5px', width: '40%', backgroundColor: 'var(--text-muted)', borderRadius: '1px' }} />
                                  <div style={{ flex: 1, border: '1px dashed var(--border)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ height: '6px', width: '20px', backgroundColor: 'var(--primary)', borderRadius: '1px' }} />
                                  </div>
                                </div>
                              )}
                              {scr.id === 'Dashboard View' && (
                                <div style={{ display: 'flex', gap: '3px', height: '100%' }}>
                                  <div style={{ width: '10px', backgroundColor: 'var(--border)', borderRadius: '1px' }} />
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '1px' }} />
                                    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                                      <div style={{ flex: 1, backgroundColor: 'var(--primary)', opacity: 0.15, borderRadius: '1px' }} />
                                      <div style={{ flex: 1, backgroundColor: 'var(--primary)', opacity: 0.3, borderRadius: '1px' }} />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {scr.id === 'Search View' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', height: '100%' }}>
                                  <div style={{ height: '6px', border: '1px solid var(--border)', borderRadius: '2px', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                                    <div style={{ height: '2px', width: '10px', backgroundColor: 'var(--text-muted)', borderRadius: '1px' }} />
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', flex: 1 }}>
                                    <div style={{ backgroundColor: 'var(--border)', borderRadius: '1px' }} />
                                    <div style={{ backgroundColor: 'var(--border)', borderRadius: '1px' }} />
                                    <div style={{ backgroundColor: 'var(--border)', borderRadius: '1px' }} />
                                  </div>
                                </div>
                              )}
                              {scr.id === 'Profile View' && (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '100%', padding: '0 2px' }}>
                                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--border)', flexShrink: 0 }} />
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ height: '4px', width: '60%', backgroundColor: 'var(--text)', borderRadius: '1px' }} />
                                    <div style={{ height: '3px', width: '40%', backgroundColor: 'var(--text-muted)', borderRadius: '1px' }} />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {scr.name}
                              </span>
                              {isSelected && (
                                <span style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  fontWeight: 'bold'
                                }}>
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Or Custom Starting Frame Node ID (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={taskStartingFrameNodeIdInput}
                        onChange={e => setTaskStartingFrameNodeIdInput(e.target.value)}
                        placeholder="e.g. 1:12"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          outline: 'none',
                          flexGrow: 1
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!study?.figmaUrl}
                        onClick={() => {
                          setIsVisualSelectorOpen(!isVisualSelectorOpen);
                          setSelectorIframeLoading(true);
                        }}
                        style={{ fontSize: '12px', whiteSpace: 'nowrap', padding: '0 12px' }}
                      >
                        {isVisualSelectorOpen ? 'Close Live Selector' : '🔍 Choose Visually'}
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {!study?.figmaUrl ? 'Please configure a Figma link in Step 1 first.' : 'Loads this specific frame as the start screen for the task.'}
                    </span>
                  </div>
                </div>

                {/* Right Side: Visual Frame Selector Player */}
                {isVisualSelectorOpen && study?.figmaUrl && (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    borderLeft: '1px solid var(--border)',
                    paddingLeft: '24px',
                    minWidth: '400px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Live Frame Selector
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Navigate in the player to set active frame.
                      </span>
                    </div>

                    <div style={{ 
                      position: 'relative', 
                      backgroundColor: 'black', 
                      borderRadius: 'var(--radius-md)', 
                      overflow: 'hidden', 
                      height: '320px', 
                      border: '1px solid var(--border)' 
                    }}>
                      {selectorIframeLoading && (
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9ca3af',
                          backgroundColor: '#0a0a0a', zIndex: 5
                        }}>
                          <Loader2 size={20} className="spinner" />
                          <span style={{ fontSize: '11px' }}>Loading prototype...</span>
                        </div>
                      )}
                      <iframe
                        src={getEmbedUrl(study.figmaUrl)}
                        title="Visual Start Frame Selector"
                        allowFullScreen
                        onLoad={() => setSelectorIframeLoading(false)}
                        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                      />
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--bg)', 
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      gap: '8px'
                    }}>
                      <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>
                          Active Node:
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block', whiteSpace: 'nowrap' }}>
                          {activeSelectorFrame || 'Navigate in player to detect...'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!activeSelectorFrame}
                        onClick={() => {
                          setTaskStartingFrameNodeIdInput(activeSelectorFrame);
                          setIsVisualSelectorOpen(false);
                        }}
                        style={{ fontSize: '11px', padding: '6px 12px', height: 'auto', whiteSpace: 'nowrap', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        ✔ Select Current Frame
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'var(--bg)'
              }}>
                <button
                  type="button"
                  onClick={() => { setIsTaskModalOpen(false); resetTaskForm(); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expected Path Recording Modal */}
      {isRecordingModalOpen && recordingTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '95vw',
            height: '90vh',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: 'var(--card-bg)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger)',
                    animation: 'spin 1.2s infinite ease-in-out'
                  }}></div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Recording Expected Flow
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>|</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    Task: {recordingTask.title}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  <strong>Instruction:</strong> {recordingTask.instruction}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setIsRecordingModalOpen(false); setRecordingTask(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px', height: 'auto' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinishRecording}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', height: 'auto', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                >
                  Finish & Save Recording
                </button>
              </div>
            </div>

            {/* Split Screen Panel */}
            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
              
              {/* Left Panel: Log Controller */}
              <div style={{
                width: '380px',
                borderRight: '1px solid var(--border)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                flexShrink: 0
              }}>
                {/* Section A: Running Steps Log */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Recorded Flow Path ({recordingFrames.length} frames, {recordingSteps.length} clicks)
                  </h4>
                  
                  {recordingFrames.length === 0 && recordingSteps.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0' }}>
                      Interact with the controller or prototype to start recording steps.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {recordingFrames.map((frame, fIdx) => {
                        const frameClicks = recordingSteps.filter(c => c.frameName === frame);
                        return (
                          <div 
                            key={fIdx}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                              backgroundColor: 'var(--bg)',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {fIdx === 0 ? 'Starting Frame:' : `Step {fIdx}:`} {frame}
                              </span>
                              {fIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecordedFrame(fIdx)}
                                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                                  title="Remove Frame"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>

                            {/* Clicks logged on this frame */}
                            {frameClicks.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                                {frameClicks.map((click, cIdx) => {
                                  const realIdx = recordingSteps.findIndex(c => c.timestamp === click.timestamp);
                                  return (
                                    <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '4px 8px', borderRadius: '3px', fontSize: '11px' }}>
                                      <span>🖱️ Clicked <strong>"{click.targetName}"</strong> ({Math.round(click.timestamp / 100) / 10}s)</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRecordedStep(realIdx)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '1px' }}
                                        title="Remove Click"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No clicks recorded in this frame.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section B: Manual Log Inputs */}
                <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(0, 0, 0, 0.01)', flexShrink: 0 }}>
                  
                  {/* Toggle frame change */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔗 Log Frame Navigation
                    </label>
                    
                    {/* Pre-populated Quick Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                      {['Home View', 'Product Details', 'Cart Page', 'Checkout Details', 'Success Screen'].map(fName => (
                        <button
                          key={fName}
                          type="button"
                          onClick={() => handleLogFrameChange(fName)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '10px', height: 'auto' }}
                        >
                          + {fName}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={customFrameInput}
                        onChange={e => setCustomFrameInput(e.target.value)}
                        placeholder="Enter target frame name..."
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          outline: 'none',
                          flexGrow: 1
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLogFrameChange(customFrameInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleLogFrameChange(customFrameInput)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', height: 'auto', whiteSpace: 'nowrap' }}
                      >
                        Log
                      </button>
                    </div>
                  </div>

                  {/* Toggle click event */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🖱️ Log Click Event
                    </label>

                    {/* Pre-populated Quick Click Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                      {['Sign In', 'Add to Cart', 'Go to Checkout', 'Pay Now', 'Close Modal'].map(cName => (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => handleLogClickEvent(cName)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '10px', height: 'auto' }}
                        >
                          + Click {cName}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={customClickInput}
                        onChange={e => setCustomClickInput(e.target.value)}
                        placeholder="Enter element clicked..."
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          outline: 'none',
                          flexGrow: 1
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLogClickEvent(customClickInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleLogClickEvent(customClickInput)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', height: 'auto', whiteSpace: 'nowrap' }}
                      >
                        Log
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Panel: Figma Embed Player */}
              <div style={{
                flexGrow: 1,
                backgroundColor: 'black',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {recordingIframeLoading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#0a0a0a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    gap: '12px',
                    color: '#9ca3af'
                  }}>
                    <Loader2 size={24} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '12px' }}>Connecting to Figma Embed Player...</span>
                  </div>
                )}

                <iframe
                  src={getEmbedUrl(study.figmaUrl || '', recordingTask.startingFrameNodeId)}
                  title="Recording Figma Embed Prototype"
                  allowFullScreen
                  onLoad={() => setRecordingIframeLoading(false)}
                  style={{
                    border: 'none',
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                />
              </div>

            </div>

          </div>
        </div>
      )}

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
