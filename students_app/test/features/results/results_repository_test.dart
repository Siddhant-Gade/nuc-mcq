import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/features/results/models/test_result_model.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  group('ResultsRepository', () {
    late ResultsRepository repository;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      repository = ResultsRepository();
    });

    test('saves test results and computes student stats accurately', () async {
      final result1 = TestResultModel(
        clientEventId: 'EVT_001',
        testId: 'EXAM_001',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 20,
        wrongCount: 5,
        score: 20,
        wrongQuestionIds: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        completedAt: DateTime.now(),
        timeTakenSeconds: 900,
        syncStatus: SyncStatus.pending,
      );

      final result2 = TestResultModel(
        clientEventId: 'EVT_002',
        testId: 'PRAC_001',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 10,
        correctCount: 4,
        wrongCount: 6,
        score: 4,
        wrongQuestionIds: ['Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11'],
        completedAt: DateTime.now(),
        timeTakenSeconds: 300,
        syncStatus: SyncStatus.pending,
      );

      await repository.saveResult(result1);
      await repository.saveResult(result2);

      final all = await repository.getAllResults();
      expect(all.length, 2);

      final stats = await repository.getStudentStats();
      expect(stats.totalTests, 2);
      expect(stats.examCount, 1);
      expect(stats.practiceCount, 1);
      expect(stats.passCount, 1); // 20/25 is 80% (>= 50%) while 4/10 is 40% (< 50%)
      expect(stats.pendingSyncCount, 2);

      // Update sync status
      await repository.updateSyncStatus('EVT_001', SyncStatus.synced);
      final pending = await repository.getPendingResults();
      expect(pending.length, 1);
      expect(pending.first.clientEventId, 'EVT_002');
    });
  });
}
