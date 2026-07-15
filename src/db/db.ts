export interface Study {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  completedParticipants: number;
  minParticipants: number;
  figmaUrl?: string;
  preSurveyQuestions?: any[];
  postSurveyQuestions?: any[];
}

const STORAGE_KEY = 'tracekit_studies';
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
      },
      {
        id: '2',
        title: 'TraceKit Dashboard V1 Validation',
        description: 'Usability study focusing on the initial dashboard experience of TraceKit. Specifically tracking how fast UX researchers find and interpret the AI-generated hypotheses.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        completedParticipants: 0,
        minParticipants: 5,
      },
      {
        id: '3',
        title: 'Calm Health App - Navigation Structure Study',
        description: 'Evaluating the discoverability of search and quick meditation logs. Participants will complete 3 core tasks: search for anxiety exercises, log a mood, and check weekly progress.',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        completedParticipants: 4,
        minParticipants: 12,
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
  async createStudy(studyData: Omit<Study, 'id' | 'createdAt' | 'updatedAt' | 'completedParticipants' | 'minParticipants'>): Promise<Study> {
    await delay(DELAY_MS);
    const studies = getRawStudies();
    const now = new Date().toISOString();
    const newStudy: Study = {
      ...studyData,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      createdAt: now,
      updatedAt: now,
      completedParticipants: 0,
      minParticipants: 10
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
  }
};
