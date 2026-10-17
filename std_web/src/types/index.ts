export type Language = 'en' | 'mr' | 'hi';

export type QuestionTopicCode =
  | 'computerFundamentals'
  | 'os'
  | 'excel'
  | 'word'
  | 'powerpoint'
  | 'outlook'
  | 'internet'
  | 'pagemaker';

export interface TopicInfo {
  code: QuestionTopicCode;
  label: string;
  labelMr: string;
  labelHi: string;
  description: string;
  imagePath: string;
}

export const TOPIC_CONFIG: Record<QuestionTopicCode, TopicInfo> = {
  computerFundamentals: {
    code: 'computerFundamentals',
    label: 'Computer Fundamentals',
    labelMr: 'कॉम्प्युटर फंडामेंटल्स',
    labelHi: 'कंप्यूटर फंडामेंटल्स',
    description: 'Hardware, Memory, CPU & Architecture',
    imagePath: '/subjects/computer_fundamentals.png',
  },
  os: {
    code: 'os',
    label: 'Operating System',
    labelMr: 'ऑपरेटिंग सिस्टीम (OS)',
    labelHi: 'ऑपरेटिंग सिस्टम (OS)',
    description: 'Windows, File System, OS Settings',
    imagePath: '/subjects/os.png',
  },
  excel: {
    code: 'excel',
    label: 'MS Excel',
    labelMr: 'एमएस एक्सेल',
    labelHi: 'एमएस एक्सेल',
    description: 'Formulas, Spreadsheets, Functions & Charts',
    imagePath: '/subjects/excel.png',
  },
  word: {
    code: 'word',
    label: 'MS Word',
    labelMr: 'एमएस वर्ड',
    labelHi: 'एमएस वर्ड',
    description: 'Documents, Formatting, Layout & Tables',
    imagePath: '/subjects/word.png',
  },
  powerpoint: {
    code: 'powerpoint',
    label: 'PowerPoint',
    labelMr: 'पॉवरपॉईंट',
    labelHi: 'पावरपॉइंट',
    description: 'Slides, Design, Animations & Transitions',
    imagePath: '/subjects/powerpoint.png',
  },
  outlook: {
    code: 'outlook',
    label: 'MS Outlook',
    labelMr: 'एमएस आउटलुक',
    labelHi: 'एमएस आउटलुक',
    description: 'Emails, Calendars, Contacts & Scheduling',
    imagePath: '/subjects/outlook.png',
  },
  internet: {
    code: 'internet',
    label: 'Internet',
    labelMr: 'इंटरनेट',
    labelHi: 'इंटरनेट',
    description: 'Browsing, Web Safety, Cloud & Search',
    imagePath: '/subjects/internet.png',
  },
  pagemaker: {
    code: 'pagemaker',
    label: 'PageMaker',
    labelMr: 'पेजमेकर',
    labelHi: 'पेजमेकर',
    description: 'Desktop Publishing, Layouts & Typography',
    imagePath: '/subjects/pagemaker.png',
  },
};

export interface QuestionModel {
  id: string;
  topic: QuestionTopicCode;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  questionTextMr?: string;
  optionsMr?: string[];
  explanationMr?: string;
  questionTextHi?: string;
  optionsHi?: string[];
  explanationHi?: string;
}

export type TestMode = 'PRACTICE' | 'EXAM';

export interface GeneratedTest {
  testId: string;
  mode: TestMode;
  questions: QuestionModel[];
  durationMinutes: number;
  blueprintVersion: string;
  questionBankVersion: string;
  subject?: string;
  topicCode?: string;
}

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface TestResultModel {
  clientEventId: string;
  testId: string;
  testMode: TestMode;
  subject?: string;
  topicCode?: string;
  questionBankVersion: string;
  blueprintVersion: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  wrongQuestionIds: string[];
  completedAt: string; // ISO date string
  timeTakenSeconds: number;
  studentAnswers: Record<string, number>; // questionId -> selectedOptionIndex
  syncStatus: SyncStatus;
  errorMessage?: string;
}

export interface StudentIdentity {
  authUserId: string;
  email?: string | null;
  name?: string | null;
  studentId?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  accessStatus?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  roles: string[];
}

export interface StudentStats {
  totalTests: number;
  examCount: number;
  practiceCount: number;
  averageScore: number;
  passCount: number;
  passRate: number;
  pendingSyncCount: number;
  totalXp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  unlockedBadges: string[];
  currentLevelXp: number;
  xpForNextLevel: number;
  levelProgress: number;
}

export interface SubjectPerformanceMetric {
  subjectName: string;
  topicCode?: string;
  testCount: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  averageScore: number;
  accuracy: number;
  answeredCount: number;
  hasLimitedData: boolean;
  isPassed: boolean;
}

export interface PerformanceAnalyticsData {
  totalTests: number;
  examCount: number;
  practiceCount: number;
  averageScore: number;
  bestScore: number;
  passRate: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  chronologicalAttempts: TestResultModel[];
  subjectMetrics: SubjectPerformanceMetric[];
  scoreDelta?: number | null;
  trendDescription?: string | null;
  strongestSubject?: SubjectPerformanceMetric | null;
  weakestSubject?: SubjectPerformanceMetric | null;
  isEmpty: boolean;
  hasSingleAttempt: boolean;
  hasMultipleAttempts: boolean;
}

export type StudyDocType = 'PDF' | 'DOCX' | 'PPTX' | 'GUIDE';

export interface StudyMaterialModel {
  id: string;
  title: string;
  category: string;
  description: string;
  type: StudyDocType;
  readTimeMinutes: number;
  content: string;
  keyPoints: string[];
  fileName?: string | null;
  fileSize?: number | null;
  kind?: string;
  documentType?: string | null;
  embedUrl?: string | null;
  createdAt?: string | null;
  titleMr?: string | null;
  categoryMr?: string | null;
  descriptionMr?: string | null;
  contentMr?: string | null;
  titleHi?: string | null;
  categoryHi?: string | null;
  descriptionHi?: string | null;
  contentHi?: string | null;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  category?: string;
  priority?: 'NORMAL' | 'URGENT' | 'HIGH' | 'LOW';
  publishedAt: string;
  readAt?: string | null;
  isRead?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  badge: string;
  studentProfileId: string;
  name: string;
  studentId: string;
  initial: string;
  score: number;
  accuracy: number;
  totalTests: number;
  batchName?: string | null;
  isCurrent: boolean;
}

