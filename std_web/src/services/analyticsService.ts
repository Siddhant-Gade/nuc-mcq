import { Language, PerformanceAnalyticsData, SubjectPerformanceMetric, TestResultModel } from '../types';
import { resultsService } from './resultsService';

export const analyticsService = {
  computeAnalytics(results: TestResultModel[], lang: Language): PerformanceAnalyticsData {
    if (results.length === 0) {
      return {
        totalTests: 0,
        examCount: 0,
        practiceCount: 0,
        averageScore: 0,
        bestScore: 0,
        passRate: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        totalWrong: 0,
        overallAccuracy: 0,
        totalTimeSeconds: 0,
        averageTimeSeconds: 0,
        chronologicalAttempts: [],
        subjectMetrics: [],
        scoreDelta: null,
        trendDescription: null,
        strongestSubject: null,
        weakestSubject: null,
        isEmpty: true,
        hasSingleAttempt: false,
        hasMultipleAttempts: false,
      };
    }

    const totalTests = results.length;
    const examCount = results.filter((r) => r.testMode === 'EXAM').length;
    const practiceCount = results.filter((r) => r.testMode === 'PRACTICE').length;
    const passCount = results.filter((r) => r.totalQuestions > 0 && r.score / r.totalQuestions >= 0.5).length;
    const passRate = (passCount / totalTests) * 100;

    const totalPct = results.reduce(
      (s, r) => s + (r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0),
      0
    );
    const averageScore = totalPct / totalTests;

    const bestScore = results.reduce((best, r) => {
      const pct = r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0;
      return pct > best ? pct : best;
    }, 0);

    const totalCorrect = results.reduce((s, r) => s + r.correctCount, 0);
    const totalWrong = results.reduce((s, r) => s + r.wrongCount, 0);
    const totalQuestionsAnswered = totalCorrect + totalWrong;
    const overallAccuracy =
      totalQuestionsAnswered > 0 ? (totalCorrect / totalQuestionsAnswered) * 100 : 0;

    const totalTimeSeconds = results.reduce((s, r) => s + (r.timeTakenSeconds || 0), 0);
    const averageTimeSeconds = Math.round(totalTimeSeconds / totalTests);

    // Chronological order (oldest to newest)
    const chronological = [...results].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    let delta: number | null = null;
    let trendDesc: string | null = null;
    if (chronological.length >= 2) {
      const latest = chronological[chronological.length - 1];
      const previous = chronological[chronological.length - 2];
      const latestPct = latest.totalQuestions > 0 ? (latest.score / latest.totalQuestions) * 100 : 0;
      const prevPct = previous.totalQuestions > 0 ? (previous.score / previous.totalQuestions) * 100 : 0;
      delta = latestPct - prevPct;

      if (delta > 0) {
        trendDesc = `+${delta.toFixed(1)}% improvement compared to previous attempt`;
      } else if (delta < 0) {
        trendDesc = `${delta.toFixed(1)}% drop compared to previous attempt`;
      } else {
        trendDesc = 'Consistent score compared to previous attempt';
      }
    } else {
      trendDesc = 'Complete at least 2 tests to track your improvement trend.';
    }

    // Group by Subject
    const bySubject = new Map<string, TestResultModel[]>();
    for (const r of results) {
      const subj = resultsService.getDisplaySubject(r, lang);
      const list = bySubject.get(subj) || [];
      list.push(r);
      bySubject.set(subj, list);
    }

    const subjectMetrics: SubjectPerformanceMetric[] = [];
    for (const [subjName, tests] of bySubject.entries()) {
      const sCorrect = tests.reduce((s, r) => s + r.correctCount, 0);
      const sWrong = tests.reduce((s, r) => s + r.wrongCount, 0);
      const sTotalQ = tests.reduce((s, r) => s + r.totalQuestions, 0);
      const sAnswered = sCorrect + sWrong;
      const sAccuracy = sAnswered > 0 ? (sCorrect / sAnswered) * 100 : 0;
      const sAvgScore =
        tests.reduce((s, r) => s + (r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0), 0) /
        tests.length;

      const topicCode = tests.find((r) => r.topicCode)?.topicCode;

      subjectMetrics.push({
        subjectName: subjName,
        topicCode,
        testCount: tests.length,
        totalQuestions: sTotalQ,
        correctCount: sCorrect,
        wrongCount: sWrong,
        averageScore: sAvgScore,
        accuracy: sAccuracy,
        answeredCount: sAnswered,
        hasLimitedData: tests.length < 2,
        isPassed: sAvgScore >= 50,
      });
    }

    subjectMetrics.sort((a, b) => {
      if (b.testCount !== a.testCount) return b.testCount - a.testCount;
      return b.averageScore - a.averageScore;
    });

    let strongest: SubjectPerformanceMetric | null = null;
    let weakest: SubjectPerformanceMetric | null = null;

    if (subjectMetrics.length > 0) {
      strongest = subjectMetrics.reduce((a, b) => (a.averageScore >= b.averageScore ? a : b));
      weakest = subjectMetrics.reduce((a, b) => (a.averageScore <= b.averageScore ? a : b));
      if (subjectMetrics.length === 1 && strongest.averageScore >= 50) {
        weakest = null;
      }
    }

    return {
      totalTests,
      examCount,
      practiceCount,
      averageScore,
      bestScore,
      passRate,
      totalQuestionsAnswered,
      totalCorrect,
      totalWrong,
      overallAccuracy,
      totalTimeSeconds,
      averageTimeSeconds,
      chronologicalAttempts: chronological,
      subjectMetrics,
      scoreDelta: delta,
      trendDescription: trendDesc,
      strongestSubject: strongest,
      weakestSubject: weakest,
      isEmpty: false,
      hasSingleAttempt: totalTests === 1,
      hasMultipleAttempts: totalTests >= 2,
    };
  },

  formatDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSecs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSecs}s`;
    } else {
      return `${remainingSecs}s`;
    }
  },
};
