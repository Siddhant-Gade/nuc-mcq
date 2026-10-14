import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/features/results/models/performance_analytics_data.dart';
import 'package:student_app/features/results/models/test_result_model.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  group('PerformanceAnalyticsData - Unit Tests', () {
    test('returns clean empty statistics when result list is empty', () {
      final data = PerformanceAnalyticsData.fromResults([], langCode: 'en');

      expect(data.isEmpty, isTrue);
      expect(data.hasSingleAttempt, isFalse);
      expect(data.hasMultipleAttempts, isFalse);
      expect(data.totalTests, equals(0));
      expect(data.examCount, equals(0));
      expect(data.practiceCount, equals(0));
      expect(data.averageScore, equals(0.0));
      expect(data.bestScore, equals(0.0));
      expect(data.passRate, equals(0.0));
      expect(data.totalQuestionsAnswered, equals(0));
      expect(data.totalCorrect, equals(0));
      expect(data.totalWrong, equals(0));
      expect(data.overallAccuracy, equals(0.0));
      expect(data.totalTimeSeconds, equals(0));
      expect(data.averageTimeSeconds, equals(0));
      expect(data.chronologicalAttempts, isEmpty);
      expect(data.subjectMetrics, isEmpty);
      expect(data.scoreDelta, isNull);
      expect(data.strongestSubject, isNull);
      expect(data.weakestSubject, isNull);
    });

    test('accurately calculates metrics for a single attempt', () {
      final r1 = TestResultModel(
        clientEventId: 'test-1',
        testId: 'EXAM_1',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 20,
        wrongCount: 5,
        score: 20,
        wrongQuestionIds: const ['q1', 'q2', 'q3', 'q4', 'q5'],
        completedAt: DateTime(2026, 10, 10, 10, 0),
        timeTakenSeconds: 600,
        subject: 'MS-CIT Comprehensive Exam',
      );

      final data = PerformanceAnalyticsData.fromResults([r1], langCode: 'en');

      expect(data.isEmpty, isFalse);
      expect(data.hasSingleAttempt, isTrue);
      expect(data.hasMultipleAttempts, isFalse);
      expect(data.totalTests, equals(1));
      expect(data.examCount, equals(1));
      expect(data.practiceCount, equals(0));
      expect(data.averageScore, equals(80.0)); // 20/25 * 100
      expect(data.bestScore, equals(80.0));
      expect(data.passRate, equals(100.0));
      expect(data.totalQuestionsAnswered, equals(25));
      expect(data.totalCorrect, equals(20));
      expect(data.totalWrong, equals(5));
      expect(data.overallAccuracy, equals(80.0));
      expect(data.totalTimeSeconds, equals(600));
      expect(data.averageTimeSeconds, equals(600));
      expect(data.chronologicalAttempts.length, equals(1));
      expect(data.scoreDelta, isNull);
      expect(data.trendDescription, contains('at least 2 tests'));
      expect(data.subjectMetrics.length, equals(1));
      expect(data.subjectMetrics.first.subjectName, equals('MS-CIT Comprehensive Exam'));
      expect(data.subjectMetrics.first.hasLimitedData, isTrue);
      expect(data.strongestSubject, isNotNull);
      expect(data.strongestSubject!.averageScore, equals(80.0));
      expect(data.weakestSubject, isNull); // single passed subject not flagged as weakest
    });

    test('accurately calculates metrics, trend delta, and subject breakdown across multiple attempts', () {
      final rOld = TestResultModel(
        clientEventId: 'test-old',
        testId: 'PRAC_1',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 10,
        correctCount: 4,
        wrongCount: 6,
        score: 4,
        wrongQuestionIds: const ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
        completedAt: DateTime(2026, 10, 1, 9, 0),
        timeTakenSeconds: 300,
        subject: 'Computer Basics',
        topicCode: 'BASICS',
      );

      final rMid = TestResultModel(
        clientEventId: 'test-mid',
        testId: 'PRAC_2',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 10,
        correctCount: 7,
        wrongCount: 3,
        score: 7,
        wrongQuestionIds: const ['q7', 'q8', 'q9'],
        completedAt: DateTime(2026, 10, 5, 14, 0),
        timeTakenSeconds: 240,
        subject: 'Word Processing',
        topicCode: 'WORD',
      );

      final rNew = TestResultModel(
        clientEventId: 'test-new',
        testId: 'EXAM_2',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 20,
        correctCount: 18,
        wrongCount: 2,
        score: 18,
        wrongQuestionIds: const ['q10', 'q11'],
        completedAt: DateTime(2026, 10, 12, 16, 0),
        timeTakenSeconds: 660,
        subject: 'MS-CIT Final Assessment',
      );

      // Pass intentionally unordered list to test chronological sorting
      final data = PerformanceAnalyticsData.fromResults(
        [rMid, rNew, rOld],
        langCode: 'en',
      );

      expect(data.totalTests, equals(3));
      expect(data.examCount, equals(1));
      expect(data.practiceCount, equals(2));

      // Percentages:
      // rOld: 4/10 = 40% (Fail)
      // rMid: 7/10 = 70% (Pass)
      // rNew: 18/20 = 90% (Pass)
      // Average: (40 + 70 + 90) / 3 = 66.6666...%
      expect(data.averageScore, closeTo(66.67, 0.01));
      expect(data.bestScore, equals(90.0));
      expect(data.passRate, closeTo(66.67, 0.01)); // 2 out of 3 passed

      // Questions:
      // Correct: 4 + 7 + 18 = 29
      // Wrong: 6 + 3 + 2 = 11
      // Total: 40
      // Accuracy: (29 / 40) * 100 = 72.5%
      expect(data.totalQuestionsAnswered, equals(40));
      expect(data.totalCorrect, equals(29));
      expect(data.totalWrong, equals(11));
      expect(data.overallAccuracy, equals(72.5));

      // Time: 300 + 240 + 660 = 1200 seconds
      // Average: 1200 / 3 = 400 seconds
      expect(data.totalTimeSeconds, equals(1200));
      expect(data.averageTimeSeconds, equals(400));

      // Chronological order: rOld, rMid, rNew
      expect(data.chronologicalAttempts.first.clientEventId, equals('test-old'));
      expect(data.chronologicalAttempts[1].clientEventId, equals('test-mid'));
      expect(data.chronologicalAttempts.last.clientEventId, equals('test-new'));

      // Progress & Score Delta:
      // latest (rNew: 90%) - previous (rMid: 70%) = +20.0%
      expect(data.scoreDelta, equals(20.0));
      expect(data.trendDescription, contains('+20.0% improvement'));

      // Subject breakdown: 3 subjects
      expect(data.subjectMetrics.length, equals(3));
      expect(data.strongestSubject?.subjectName, equals('MS-CIT Final Assessment'));
      expect(data.strongestSubject?.averageScore, equals(90.0));
      expect(data.weakestSubject?.subjectName, equals('Computer Basics'));
      expect(data.weakestSubject?.averageScore, equals(40.0));
    });

    test('formatDuration formats times cleanly', () {
      expect(PerformanceAnalyticsData.formatDuration(0), equals('0s'));
      expect(PerformanceAnalyticsData.formatDuration(45), equals('45s'));
      expect(PerformanceAnalyticsData.formatDuration(150), equals('2m 30s'));
      expect(PerformanceAnalyticsData.formatDuration(3665), equals('1h 1m'));
    });
  });
}
