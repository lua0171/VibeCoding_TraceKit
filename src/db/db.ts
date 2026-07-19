export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'number' | 'rating' | 'yes_no' | 'dropdown';
  options?: string[];
  ratingMin?: number;
  ratingMax?: number;
  ratingMinLabel?: string;
  ratingMaxLabel?: string;
}

export interface ClickedElement {
  targetName: string;
  timestamp: number;
  frameName: string;
}

export interface RecordedPath {
  startingFrame: string;
  framesVisited: string[];
  navigationPath: string[];
  clickedElements: ClickedElement[];
  orderOfInteractions: string[];
  completedStatus: boolean;
}

export interface StudyTask {
  id: string;
  title: string;
  instruction: string;
  startingFrameNodeId?: string;
  expectedPath?: RecordedPath;
}

export interface Study {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  completedParticipants: number;
  minParticipants: number;
  figmaUrl?: string;
  initialHypotheses?: string;
  preSurveyQuestions?: SurveyQuestion[];
  postSurveyQuestionsMode?: 'none' | 'standardized' | 'custom';
  postSurveyStandardizedKeys?: string[];
  postSurveyQuestions?: SurveyQuestion[];
  tasks?: StudyTask[];
  importedPrototype?: {
    frames: {
      id: string;
      name: string;
      imageUrl: string;
      width?: number;
      height?: number;
      hotspots: {
        id: string;
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        targetFrameId: string;
      }[];
    }[];
  };
}

export interface TrackedEvent {
  type: 'click' | 'navigation';
  nodeId: string;
  timestamp: string;
  // click-only
  x?: number;
  y?: number;
  isHotspot?: boolean;
  // navigation-only
  fromNodeId?: string;
  toNodeId?: string;
  taskId?: string;
  screenId?: string;
}

export interface Session {
  id: string;
  studyId: string;
  startedAt: string;
  endedAt?: string;
  events: TrackedEvent[];
}

export interface Hypothesis {
  id: string;
  studyId: string;
  content: string;
  status: 'open' | 'confirmed' | 'refuted' | 'inconclusive' | 'closed';
  origin: 'initial' | 'ai';
  confidenceScore: number;
  evidence: string[];
}

const STORAGE_KEY = 'tracekit_studies';
const SESSIONS_STORAGE_KEY = 'tracekit_sessions';
const HYPOTHESES_STORAGE_KEY = 'tracekit_hypotheses';
const DELAY_MS = 400; // simulated network/DB query latency

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get from localStorage
const getRawStudies = (): Study[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    // Seed with mock data if empty to show a beautiful initial state
    const mockStudies: Study[] = [
      {
        id: '1',
        title: 'Figma E-Commerce Checkout Usability Test',
        description: 'Testing the new 3-step checkout flow against the legacy single-page checkout. Goal is to determine if clear progress indicators reduce cart abandonment rates for mobile users.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        completedParticipants: 8,
        minParticipants: 10,
        tasks: [
          {
            id: 'task_1',
            title: 'Add red running shoes to cart',
            instruction: 'Find the shoes section, locate the red running shoes, select size 9, and click "Add to Cart".'
          },
          {
            id: 'task_2',
            title: 'Check out shopping cart',
            instruction: 'Open your shopping cart, fill out shipping details, select standard shipping, and place the order.'
          }
        ]
      },
      {
        id: '2',
        title: 'TraceKit Dashboard V1 Validation',
        description: 'Usability study focusing on the initial dashboard experience of TraceKit. Specifically tracking how fast UX researchers find and interpret the AI-generated hypotheses.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        completedParticipants: 0,
        minParticipants: 5,
        tasks: [
          {
            id: 'task_3',
            title: 'Inspect Ollama settings status',
            instruction: 'Go to the AI provider settings panel and check if local Ollama model connection has loaded.'
          }
        ]
      },
      {
        id: '3',
        title: 'Calm Health App - Navigation Structure Study',
        description: 'Evaluating the discoverability of search and quick meditation logs. Participants will complete 3 core tasks: search for anxiety exercises, log a mood, and check weekly progress.',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        completedParticipants: 4,
        minParticipants: 12,
        tasks: [
          {
            id: 'task_4',
            title: 'Search for anxiety exercise',
            instruction: 'Open search, search for "anxiety relief meditation", click the exercise, and run a 5-minute breathing session.'
          },
          {
            id: 'task_5',
            title: 'Log a mood event',
            instruction: 'Click the "+" button in navigation, choose mood logging, select "Calm", and click save.'
          }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockStudies));
    return mockStudies;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing stored studies:', e);
    return [];
  }
};

// Helper to save to localStorage
const saveRawStudies = (studies: Study[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
};

// Helper to get sessions from localStorage
const getRawSessions = (): Session[] => {
  const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing stored sessions:', e);
    return [];
  }
};

// Helper to save sessions to localStorage
const saveRawSessions = (sessions: Session[]) => {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
};

// Helper to get hypotheses from localStorage
const getRawHypotheses = (): Hypothesis[] => {
  const data = localStorage.getItem(HYPOTHESES_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing stored hypotheses:', e);
    return [];
  }
};

// Helper to save hypotheses to localStorage
const saveRawHypotheses = (hypotheses: Hypothesis[]) => {
  localStorage.setItem(HYPOTHESES_STORAGE_KEY, JSON.stringify(hypotheses));
};

export const db = {
  /**
   * Fetch all studies
   */
  async getAllStudies(): Promise<Study[]> {
    await delay(DELAY_MS);
    return getRawStudies().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Fetch a single study by ID
   */
  async getStudyById(id: string): Promise<Study | null> {
    await delay(DELAY_MS);
    const studies = getRawStudies();
    return studies.find(s => s.id === id) || null;
  },

  /**
   * Create a new study
   */
  async createStudy(studyData: Omit<Study, 'id' | 'createdAt' | 'updatedAt' | 'completedParticipants' | 'minParticipants'> & { minParticipants?: number }): Promise<Study> {
    await delay(DELAY_MS);
    const studies = getRawStudies();
    const now = new Date().toISOString();
    const newStudy: Study = {
      ...studyData,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      createdAt: now,
      updatedAt: now,
      completedParticipants: 0,
      minParticipants: studyData.minParticipants !== undefined ? studyData.minParticipants : 10
    };
    studies.push(newStudy);
    saveRawStudies(studies);
    return newStudy;
  },

  /**
   * Update an existing study
   */
  async updateStudy(id: string, updatedData: Partial<Omit<Study, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Study> {
    await delay(DELAY_MS);
    const studies = getRawStudies();
    const index = studies.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Study with ID ${id} not found`);
    }
    const updatedStudy = {
      ...studies[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    studies[index] = updatedStudy;
    saveRawStudies(studies);
    return updatedStudy;
  },

  /**
   * Delete a study by ID
   */
  async deleteStudy(id: string): Promise<boolean> {
    await delay(DELAY_MS);
    const studies = getRawStudies();
    const filtered = studies.filter(s => s.id !== id);
    if (filtered.length === studies.length) {
      return false;
    }
    saveRawStudies(filtered);
    return true;
  },

  /**
   * Start a new tracked session for a study
   */
  async createSession(studyId: string): Promise<Session> {
    const sessions = getRawSessions();
    const newSession: Session = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      studyId,
      startedAt: new Date().toISOString(),
      events: [],
    };
    sessions.push(newSession);
    saveRawSessions(sessions);
    return newSession;
  },

  /**
   * Append a tracked event to a session. No artificial delay: clicks can
   * fire in quick succession and shouldn't be throttled by the mock latency.
   */
  async appendEvent(sessionId: string, event: TrackedEvent): Promise<void> {
    const sessions = getRawSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    session.events.push(event);
    saveRawSessions(sessions);
  },

  /**
   * Mark a session as finished
   */
  async endSession(sessionId: string): Promise<void> {
    const sessions = getRawSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    session.endedAt = new Date().toISOString();
    saveRawSessions(sessions);
  },

  /**
   * Fetch all sessions recorded for a study
   */
  async getSessionsByStudy(studyId: string): Promise<Session[]> {
    await delay(DELAY_MS);
    return getRawSessions().filter(s => s.studyId === studyId);
  },

  /**
   * Fetch hypotheses for a study
   */
  async getHypothesesByStudy(studyId: string): Promise<Hypothesis[]> {
    await delay(DELAY_MS);
    return getRawHypotheses().filter(h => h.studyId === studyId);
  },

  /**
   * Save a list of hypotheses (creates or updates them based on ID)
   */
  async saveHypotheses(hypotheses: Hypothesis[]): Promise<void> {
    await delay(DELAY_MS);
    const existing = getRawHypotheses();
    const map = new Map(hypotheses.map(h => [h.id, h]));
    
    const updated = existing.map(h => map.has(h.id) ? map.get(h.id)! : h);
    
    for (const h of hypotheses) {
      if (!existing.some(e => e.id === h.id)) {
        updated.push(h);
      }
    }
    saveRawHypotheses(updated);
  }
};
