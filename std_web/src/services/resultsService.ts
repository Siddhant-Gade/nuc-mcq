import { Language, StudentStats, SyncStatus, TestMode, TestResultModel, TOPIC_CONFIG, QuestionTopicCode, LeaderboardEntry } from '../types';
import { apiClient } from './apiClient';

const BASE_RESULTS_STORAGE_KEY = 'student_app_test_results_v1';

export function normalizeTestResult(raw: any, existingLocal?: TestResultModel): TestResultModel {
  const modeStr = (raw.testMode || raw.mode || raw.test_mode || 'PRACTICE').toString().toUpperCase();
  const testMode: TestMode = modeStr === 'EXAM' ? 'EXAM' : 'PRACTICE';

  const clientEventId = String(raw.clientEventId || raw.client_event_id || raw.id || `EVENT_${Date.now()}`);
  const testId = String(raw.testId || raw.test_id || '');

  // Extract or infer subject/topicCode
  let subject: string | undefined = raw.subject || raw.topic_name || raw.topic || existingLocal?.subject;
  let topicCode: string | undefined = raw.topicCode || raw.topic_code || existingLocal?.topicCode;

  // Infer subject from testId if missing (matching Flutter reference app logic)
  const upperTestId = testId.toUpperCase();
  if (!subject) {
    if (upperTestId.startsWith('MSCIT_FINAL_')) {
      subject = 'MS-CIT Final Assessment';
    } else if (upperTestId.startsWith('EXAM_') || testMode === 'EXAM') {
      subject = 'MS-CIT Comprehensive Exam';
    } else if (upperTestId.startsWith('CUSTOM_PRAC_')) {
      subject = 'Bookmarked Questions';
    } else if (topicCode && TOPIC_CONFIG[topicCode as QuestionTopicCode]) {
      subject = TOPIC_CONFIG[topicCode as QuestionTopicCode].label;
    } else {
      subject = 'MS-CIT Practice Test';
    }
  }

  const wrongQuestionIds = Array.isArray(raw.wrongQuestionIds)
    ? raw.wrongQuestionIds.map(String)
    : Array.isArray(raw.wrong_question_ids)
    ? raw.wrong_question_ids.map(String)
    : existingLocal?.wrongQuestionIds || [];

  const totalQuestions = Number(raw.totalQuestions ?? raw.total_questions ?? existingLocal?.totalQuestions ?? 0);
  const correctCount = Number(raw.correctCount ?? raw.correct_count ?? existingLocal?.correctCount ?? 0);
  const wrongCount = Number(raw.wrongCount ?? raw.wrong_count ?? existingLocal?.wrongCount ?? 0);
  const score = Number(raw.score ?? existingLocal?.score ?? correctCount);
  const completedAt = raw.completedAt || raw.completed_at || existingLocal?.completedAt || new Date().toISOString();
  const timeTakenSeconds = Number(raw.timeTakenSeconds ?? raw.time_taken_seconds ?? existingLocal?.timeTakenSeconds ?? 0);
  const studentAnswers = raw.studentAnswers || raw.student_answers || existingLocal?.studentAnswers || {};
  const syncStatus: SyncStatus = raw.syncStatus === 'PENDING' || raw.syncStatus === 'SYNCING' ? raw.syncStatus : 'SYNCED';

  return {
    clientEventId,
    testId,
    testMode,
    subject,
    topicCode,
    questionBankVersion: String(raw.questionBankVersion || raw.question_bank_version || '1.0.0'),
    blueprintVersion: String(raw.blueprintVersion || raw.blueprint_version || '1.0.0'),
    totalQuestions,
    correctCount,
    wrongCount,
    score,
    wrongQuestionIds,
    completedAt: typeof completedAt === 'string' ? completedAt : new Date(completedAt).toISOString(),
    timeTakenSeconds,
    studentAnswers,
    syncStatus,
    errorMessage: raw.errorMessage || raw.error_message,
  };
}

type ResultsListener = (results: TestResultModel[]) => void;

class ResultsService {
  private results: TestResultModel[] = [];
  private isLoaded = false;
  private currentStudentKey = '';
  private listeners = new Set<ResultsListener>();
  private syncInProgress = false;

  private getStorageKey(): string {
    return this.currentStudentKey
      ? `${BASE_RESULTS_STORAGE_KEY}_${this.currentStudentKey}`
      : BASE_RESULTS_STORAGE_KEY;
  }

  /**
   * Scopes local storage and state to the authenticated student,
   * guaranteeing no cross-contamination between different student accounts.
   */
  setStudentContext(studentIdentifier?: string | null): void {
    const cleanKey = (studentIdentifier || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (this.currentStudentKey !== cleanKey) {
      this.currentStudentKey = cleanKey;
      this.isLoaded = false;
      this.loadFromLocalStorage();
      this.notify();
    }
  }

  /**
   * Subscribe to results changes across any page / component.
   */
  subscribe(listener: ResultsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = [...this.results];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('[ResultsService] Listener threw error:', err);
      }
    }
  }

  private loadFromLocalStorage(): void {
    if (this.isLoaded) return;
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.results = parsed.map((item) => normalizeTestResult(item));
        } else {
          this.results = [];
        }
      } else {
        this.results = [];
      }
      this.isLoaded = true;
    } catch {
      this.results = [];
      this.isLoaded = true;
    }
  }

  private persistToLocalStorage(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.results));
    } catch (err) {
      console.warn('[ResultsService] LocalStorage persist failed:', err);
    }
  }

  async getAllResults(): Promise<TestResultModel[]> {
    this.loadFromLocalStorage();
    return [...this.results];
  }

  async saveResult(result: TestResultModel): Promise<void> {
    this.loadFromLocalStorage();
    const normalized = normalizeTestResult(result);
    // Prevent duplicate entries by clientEventId
    this.results = this.results.filter((r) => r.clientEventId !== normalized.clientEventId);
    this.results.unshift(normalized); // Newest first
    this.persistToLocalStorage();
    this.notify();
  }

  async updateSyncStatus(
    clientEventId: string,
    status: SyncStatus,
    errorMessage?: string
  ): Promise<void> {
    this.loadFromLocalStorage();
    const index = this.results.findIndex((r) => r.clientEventId === clientEventId);
    if (index !== -1) {
      this.results[index] = {
        ...this.results[index],
        syncStatus: status,
        errorMessage,
      };
      this.persistToLocalStorage();
      this.notify();
    }
  }

  /**
   * Authoritative cloud-to-web synchronization:
   * 1. Fetches backend persisted test records (/api/v1/results)
   * 2. Normalizes mode to testMode, derives subjects, and overlays cloud records
   * 3. Retains any local detailed answers / timers
   * 4. Idempotently pushes any pending local attempts to the cloud
   * 5. Notifies all dashboard / results subscribers
   */
  async syncFromBackend(force = false): Promise<TestResultModel[]> {
    this.loadFromLocalStorage();

    if (this.syncInProgress && !force) {
      return [...this.results];
    }

    this.syncInProgress = true;

    try {
      let cloudResults: any[] = [];
      try {
        const res = await apiClient.get('/api/v1/results');
        if (Array.isArray(res.data?.data)) {
          cloudResults = res.data.data;
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          try {
            const resFallback = await apiClient.get('/api/v1/student/results');
            if (Array.isArray(resFallback.data?.data)) {
              cloudResults = resFallback.data.data;
            }
          } catch (_) {}
        }
      }

      if (cloudResults.length > 0) {
        const localMap = new Map<string, TestResultModel>();
        for (const r of this.results) {
          localMap.set(r.clientEventId, r);
        }

        // Overlay cloud results onto local map
        for (const cr of cloudResults) {
          const existing = localMap.get(cr.clientEventId);
          const normalized = normalizeTestResult(cr, existing);
          localMap.set(normalized.clientEventId, normalized);
        }

        this.results = Array.from(localMap.values()).sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        this.persistToLocalStorage();
        this.notify();
      }

      // Sync pending local results to backend
      await this.syncPendingResults();
    } catch (err) {
      console.warn('[ResultsService] Cloud sync error (degraded to local cache):', err);
    } finally {
      this.syncInProgress = false;
    }

    return [...this.results];
  }

  async syncPendingResults(): Promise<{ synced: number; failed: number }> {
    this.loadFromLocalStorage();
    const pending = this.results.filter(
      (r) => r.syncStatus === 'PENDING' || r.syncStatus === 'FAILED'
    );

    let synced = 0;
    let failed = 0;

    for (const r of pending) {
      await this.updateSyncStatus(r.clientEventId, 'SYNCING');
      try {
        const payload = {
          clientEventId: r.clientEventId,
          testId: r.testId,
          mode: r.testMode,
          questionBankVersion: r.questionBankVersion,
          blueprintVersion: r.blueprintVersion,
          totalQuestions: r.totalQuestions,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          score: r.score,
          wrongQuestionIds: r.wrongQuestionIds,
          completedAt: new Date(r.completedAt).toISOString(),
        };

        let postSuccess = false;
        try {
          const res = await apiClient.post('/api/v1/results/sync', payload);
          postSuccess = res.status === 200 || res.status === 201;
        } catch (postErr: unknown) {
          const st = (postErr as { response?: { status?: number } })?.response?.status;
          if (st === 404) {
            const resFallback = await apiClient.post('/api/v1/student/results/sync', payload);
            postSuccess = resFallback.status === 200 || resFallback.status === 201;
          }
        }

        if (postSuccess) {
          await this.updateSyncStatus(r.clientEventId, 'SYNCED');
          synced++;
        } else {
          await this.updateSyncStatus(r.clientEventId, 'FAILED', 'Sync failed');
          failed++;
        }
      } catch (e: unknown) {
        await this.updateSyncStatus(
          r.clientEventId,
          'FAILED',
          e instanceof Error ? e.message : 'Network error'
        );
        failed++;
      }
    }

    return { synced, failed };
  }

  getStudentStats(): StudentStats {
    this.loadFromLocalStorage();
    const totalTests = this.results.length;
    if (totalTests === 0) {
      return {
        totalTests: 0,
        examCount: 0,
        practiceCount: 0,
        averageScore: 0,
        passCount: 0,
        passRate: 0,
        pendingSyncCount: 0,
        totalXp: 0,
        level: 1,
        levelTitle: 'Novice Learner',
        currentStreak: 0,
        unlockedBadges: [],
        currentLevelXp: 0,
        xpForNextLevel: 150,
        levelProgress: 0,
      };
    }

    const examCount = this.results.filter((r) => r.testMode === 'EXAM').length;
    const practiceCount = this.results.filter((r) => r.testMode === 'PRACTICE').length;
    const passCount = this.results.filter((r) => (r.score / (r.totalQuestions || 1)) >= 0.5).length;
    const totalPct = this.results.reduce(
      (sum, r) => sum + (r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0),
      0
    );
    const averageScore = totalPct / totalTests;
    const passRate = (passCount / totalTests) * 100;
    const pendingSyncCount = this.results.filter((r) => r.syncStatus === 'PENDING').length;

    // Gamification
    const totalCorrect = this.results.reduce((sum, r) => sum + r.correctCount, 0);
    const totalXp = totalCorrect * 10 + passCount * 50;
    const level = Math.floor(totalXp / 150) + 1;
    let levelTitle = 'Novice Learner';
    if (level >= 10) levelTitle = 'MS-CIT Grandmaster';
    else if (level >= 7) levelTitle = 'Computer Expert';
    else if (level >= 5) levelTitle = 'Speed Master';
    else if (level >= 3) levelTitle = 'Rising Scholar';
    else if (level >= 2) levelTitle = 'Active Learner';

    // Streak calculation
    const activeDates = new Set<string>();
    for (const r of this.results) {
      const d = new Date(r.completedAt);
      activeDates.add(d.toISOString().split('T')[0]);
    }

    let currentStreak = 0;
    const checkDate = new Date();
    const todayStr = checkDate.toISOString().split('T')[0];

    if (activeDates.has(todayStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (activeDates.has(yesterdayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Badges
    const badges: string[] = [];
    if (totalTests >= 1) badges.push('First Test Taken 🎯');
    if (passCount >= 1) badges.push('First Win 🏆');
    if (totalTests >= 5) badges.push('Practice Pro ⚡');
    if (passCount >= 5) badges.push('High Achiever 🌟');
    if (currentStreak >= 3) badges.push('On Fire! 🔥');
    if (this.results.some((r) => r.totalQuestions > 0 && r.score / r.totalQuestions >= 0.9)) {
      badges.push('Genius (90%+) 🧠');
    }

    const currentLevelXp = totalXp % 150;
    const levelProgress = Math.min(Math.max(currentLevelXp / 150, 0), 1);

    return {
      totalTests,
      examCount,
      practiceCount,
      averageScore,
      passCount,
      passRate,
      pendingSyncCount,
      totalXp,
      level,
      levelTitle,
      currentStreak,
      unlockedBadges: badges,
      currentLevelXp,
      xpForNextLevel: level * 150,
      levelProgress,
    };
  }

  getDisplaySubject(result: TestResultModel, lang: Language): string {
    // 1. Topic code
    if (result.topicCode && TOPIC_CONFIG[result.topicCode as QuestionTopicCode]) {
      const topic = TOPIC_CONFIG[result.topicCode as QuestionTopicCode];
      return lang === 'mr' ? topic.labelMr : lang === 'hi' ? topic.labelHi : topic.label;
    }

    // 2. Explicit subject
    if (result.subject && result.subject.trim().length > 0) {
      const s = result.subject.trim();
      if (s.includes('Comprehensive Exam') || s === 'MS-CIT Comprehensive') {
        return lang === 'mr'
          ? 'एमएस-सीआयटी संपूर्ण परीक्षा'
          : lang === 'hi'
          ? 'एमएस-सीआईटी संपूर्ण परीक्षा'
          : 'MS-CIT Comprehensive Exam';
      }
      if (s.includes('Final') || s.includes('Assessment')) {
        return lang === 'mr'
          ? 'एमएस-सीआयटी अंतिम मूल्यमापन'
          : lang === 'hi'
          ? 'एमएस-सीआईटी अंतिम मूल्यांकन'
          : 'MS-CIT Final Assessment';
      }
      if (s.includes('Comprehensive Practice') || s === 'All Topics') {
        return lang === 'mr'
          ? 'सर्व विषयांचा सराव'
          : lang === 'hi'
          ? 'सभी विषयों का अभ्यास'
          : 'Comprehensive Practice';
      }
      if (s.includes('Bookmark')) {
        return lang === 'mr'
          ? 'जतन केलेले प्रश्न'
          : lang === 'hi'
          ? 'बुकमार्क किए गए प्रश्न'
          : 'Bookmarked Questions';
      }
      return s;
    }

    // 3. Infer from testId
    const tid = (result.testId || '').toUpperCase();
    if (tid.startsWith('MSCIT_FINAL_')) {
      return lang === 'mr' ? 'एमएस-सीआयटी अंतिम मूल्यमापन' : lang === 'hi' ? 'एमएस-सीआईटी अंतिम मूल्यांकन' : 'MS-CIT Final Assessment';
    }
    if (tid.startsWith('EXAM_') || result.testMode === 'EXAM') {
      return lang === 'mr' ? 'एमएस-सीआयटी संपूर्ण परीक्षा' : lang === 'hi' ? 'एमएस-सीआईटी संपूर्ण परीक्षा' : 'MS-CIT Comprehensive Exam';
    }
    if (tid.startsWith('CUSTOM_PRAC_')) {
      return lang === 'mr' ? 'जतन केलेले प्रश्न' : lang === 'hi' ? 'बुकमार्क किए गए प्रश्न' : 'Bookmarked Questions';
    }

    return lang === 'mr' ? 'एमएस-सीआयटी सराव' : lang === 'hi' ? 'एमएस-सीआईटी अभ्यास' : 'MS-CIT Practice';
  }

  async getLeaderboard(scope?: 'batch' | 'institute'): Promise<LeaderboardEntry[]> {
    try {
      const params = scope ? { scope } : {};
      let rows: LeaderboardEntry[] = [];
      try {
        const res = await apiClient.get('/api/v1/results/leaderboard', { params });
        if (Array.isArray(res.data?.data)) {
          rows = res.data.data;
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          const resFallback = await apiClient.get('/api/v1/student/results/leaderboard', { params });
          if (Array.isArray(resFallback.data?.data)) {
            rows = resFallback.data.data;
          }
        } else {
          throw err;
        }
      }
      return rows;
    } catch (err) {
      console.warn('[ResultsService] Could not fetch real leaderboard:', err);
      return [];
    }
  }

  clear(): void {
    this.results = [];
    this.isLoaded = true;
    try {
      localStorage.removeItem(this.getStorageKey());
    } catch {
      // Ignore
    }
    this.notify();
  }
}

export const resultsService = new ResultsService();
