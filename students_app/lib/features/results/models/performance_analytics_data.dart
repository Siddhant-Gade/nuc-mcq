import '../models/test_result_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';

/// Performance metrics for a single subject or topic
class SubjectPerformanceMetric {
  const SubjectPerformanceMetric({
    required this.subjectName,
    this.topicCode,
    required this.testCount,
    required this.totalQuestions,
    required this.correctCount,
    required this.wrongCount,
    required this.averageScore,
    required this.accuracy,
  });

  final String subjectName;
  final String? topicCode;
  final int testCount;
  final int totalQuestions;
  final int correctCount;
  final int wrongCount;
  final double averageScore; // percentage (0.0 - 100.0)
  final double accuracy; // percentage (0.0 - 100.0)

  int get answeredCount => correctCount + wrongCount;
  bool get hasLimitedData => testCount < 2;
  bool get isPassed => averageScore >= 50.0;
}

/// Pure computation model for detailed student performance analytics.
/// Reliably derives all metrics from actual [TestResultModel] records with zero fabricated data.
class PerformanceAnalyticsData {
  const PerformanceAnalyticsData({
    required this.totalTests,
    required this.examCount,
    required this.practiceCount,
    required this.averageScore,
    required this.bestScore,
    required this.passRate,
    required this.totalQuestionsAnswered,
    required this.totalCorrect,
    required this.totalWrong,
    required this.overallAccuracy,
    required this.totalTimeSeconds,
    required this.averageTimeSeconds,
    required this.chronologicalAttempts,
    required this.subjectMetrics,
    this.scoreDelta,
    this.trendDescription,
    this.strongestSubject,
    this.weakestSubject,
  });

  final int totalTests;
  final int examCount;
  final int practiceCount;
  final double averageScore;
  final double bestScore;
  final double passRate;
  final int totalQuestionsAnswered;
  final int totalCorrect;
  final int totalWrong;
  final double overallAccuracy;
  final int totalTimeSeconds;
  final int averageTimeSeconds;
  final List<TestResultModel> chronologicalAttempts;
  final List<SubjectPerformanceMetric> subjectMetrics;
  final double? scoreDelta;
  final String? trendDescription;
  final SubjectPerformanceMetric? strongestSubject;
  final SubjectPerformanceMetric? weakestSubject;

  bool get isEmpty => totalTests == 0;
  bool get hasSingleAttempt => totalTests == 1;
  bool get hasMultipleAttempts => totalTests >= 2;

  /// Factory constructor to compute all metrics cleanly from a list of test results.
  factory PerformanceAnalyticsData.fromResults(
    List<TestResultModel> results, {
    required String langCode,
    QuestionBankRepository? questionBank,
  }) {
    if (results.isEmpty) {
      return const PerformanceAnalyticsData(
        totalTests: 0,
        examCount: 0,
        practiceCount: 0,
        averageScore: 0.0,
        bestScore: 0.0,
        passRate: 0.0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        totalWrong: 0,
        overallAccuracy: 0.0,
        totalTimeSeconds: 0,
        averageTimeSeconds: 0,
        chronologicalAttempts: [],
        subjectMetrics: [],
        scoreDelta: null,
        trendDescription: null,
        strongestSubject: null,
        weakestSubject: null,
      );
    }

    final totalTests = results.length;
    final examCount = results.where((r) => r.testMode.code == 'EXAM').length;
    final practiceCount = results.where((r) => r.testMode.code == 'PRACTICE').length;
    final passCount = results.where((r) => r.isPassed).length;
    final passRate = (passCount / totalTests) * 100.0;

    final totalPercentage = results.fold<double>(0.0, (s, r) => s + r.percentage);
    final averageScore = totalPercentage / totalTests;

    final bestScore = results.fold<double>(0.0, (best, r) => r.percentage > best ? r.percentage : best);

    final totalCorrect = results.fold<int>(0, (s, r) => s + r.correctCount);
    final totalWrong = results.fold<int>(0, (s, r) => s + r.wrongCount);
    final totalQuestionsAnswered = totalCorrect + totalWrong;
    final overallAccuracy = totalQuestionsAnswered > 0
        ? (totalCorrect / totalQuestionsAnswered) * 100.0
        : 0.0;

    final totalTimeSeconds = results.fold<int>(0, (s, r) => s + r.timeTakenSeconds);
    final averageTimeSeconds = totalTimeSeconds ~/ totalTests;

    // Sort chronologically (oldest to newest) for timeline & trend analysis
    final chronological = List<TestResultModel>.from(results)
      ..sort((a, b) => a.completedAt.compareTo(b.completedAt));

    // Progress and Improvement trend
    double? delta;
    String? trendDesc;
    if (chronological.length >= 2) {
      final latest = chronological.last;
      final previous = chronological[chronological.length - 2];
      delta = latest.percentage - previous.percentage;

      if (delta > 0) {
        trendDesc = '+${delta.toStringAsFixed(1)}% improvement compared to previous attempt';
      } else if (delta < 0) {
        trendDesc = '${delta.toStringAsFixed(1)}% drop compared to previous attempt';
      } else {
        trendDesc = 'Consistent score compared to previous attempt';
      }
    } else {
      trendDesc = 'Complete at least 2 tests to track your improvement trend.';
    }

    // Group by Subject
    final Map<String, List<TestResultModel>> bySubject = {};
    for (final r in results) {
      final subj = r.getDisplaySubject(
        langCode: langCode,
        questionBank: questionBank,
      );
      bySubject.putIfAbsent(subj, () => []).add(r);
    }

    final List<SubjectPerformanceMetric> metrics = [];
    for (final entry in bySubject.entries) {
      final sName = entry.key;
      final tests = entry.value;
      final sCorrect = tests.fold<int>(0, (s, r) => s + r.correctCount);
      final sWrong = tests.fold<int>(0, (s, r) => s + r.wrongCount);
      final sTotalQ = tests.fold<int>(0, (s, r) => s + r.totalQuestions);
      final sAnswered = sCorrect + sWrong;
      final sAccuracy = sAnswered > 0 ? (sCorrect / sAnswered) * 100.0 : 0.0;
      final sAvgScore = tests.fold<double>(0.0, (s, r) => s + r.percentage) / tests.length;

      String? topicCode;
      for (final r in tests) {
        if (r.topicCode != null && r.topicCode!.isNotEmpty) {
          topicCode = r.topicCode;
          break;
        }
      }

      metrics.add(SubjectPerformanceMetric(
        subjectName: sName,
        topicCode: topicCode,
        testCount: tests.length,
        totalQuestions: sTotalQ,
        correctCount: sCorrect,
        wrongCount: sWrong,
        averageScore: sAvgScore,
        accuracy: sAccuracy,
      ));
    }

    // Sort by test count descending, then by average score descending
    metrics.sort((a, b) {
      final cmp = b.testCount.compareTo(a.testCount);
      if (cmp != 0) return cmp;
      return b.averageScore.compareTo(a.averageScore);
    });

    SubjectPerformanceMetric? strongest;
    SubjectPerformanceMetric? weakest;

    if (metrics.isNotEmpty) {
      // Find highest average score
      strongest = metrics.reduce((a, b) => a.averageScore >= b.averageScore ? a : b);
      // Find lowest average score
      weakest = metrics.reduce((a, b) => a.averageScore <= b.averageScore ? a : b);

      // If they are the same metric (e.g. only 1 subject was ever tested), don't flag it redundantly as weakest
      if (metrics.length == 1 && strongest.averageScore >= 50.0) {
        weakest = null;
      }
    }

    return PerformanceAnalyticsData(
      totalTests: totalTests,
      examCount: examCount,
      practiceCount: practiceCount,
      averageScore: averageScore,
      bestScore: bestScore,
      passRate: passRate,
      totalQuestionsAnswered: totalQuestionsAnswered,
      totalCorrect: totalCorrect,
      totalWrong: totalWrong,
      overallAccuracy: overallAccuracy,
      totalTimeSeconds: totalTimeSeconds,
      averageTimeSeconds: averageTimeSeconds,
      chronologicalAttempts: chronological,
      subjectMetrics: metrics,
      scoreDelta: delta,
      trendDescription: trendDesc,
      strongestSubject: strongest,
      weakestSubject: weakest,
    );
  }

  /// Formats duration seconds into readable string (e.g. "45m 20s" or "1h 12m")
  static String formatDuration(int seconds) {
    if (seconds <= 0) return '0s';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final remainingSecs = seconds % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else if (minutes > 0) {
      return '${minutes}m ${remainingSecs}s';
    } else {
      return '${remainingSecs}s';
    }
  }
}
