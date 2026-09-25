import 'package:dio/dio.dart';
import '../../results/models/test_result_model.dart';
import '../../results/repository/results_repository.dart';

class SyncResultSummary {
  const SyncResultSummary({
    required this.totalAttempted,
    required this.syncedCount,
    required this.failedCount,
    this.errorMessage,
  });

  final int totalAttempted;
  final int syncedCount;
  final int failedCount;
  final String? errorMessage;

  bool get hasErrors => failedCount > 0 || errorMessage != null;
}

/// Offline Result Sync Repository (implementing Section 13 & 14 of system_design.md).
/// Uses client_event_id for idempotency.
class SyncRepository {
  SyncRepository({
    required ResultsRepository resultsRepository,
    required Dio dio,
  })  : _resultsRepository = resultsRepository,
        _dio = dio;

  final ResultsRepository _resultsRepository;
  final Dio _dio;

  /// Syncs all pending test results to backend API with idempotency and retry handling.
  Future<SyncResultSummary> syncPendingResults() async {
    final pending = await _resultsRepository.getPendingResults();
    if (pending.isEmpty) {
      return const SyncResultSummary(
        totalAttempted: 0,
        syncedCount: 0,
        failedCount: 0,
      );
    }

    int synced = 0;
    int failed = 0;

    for (final result in pending) {
      // Mark as SYNCING locally
      await _resultsRepository.updateSyncStatus(
        result.clientEventId,
        SyncStatus.syncing,
      );

      try {
        final payload = {
          'clientEventId': result.clientEventId,
          'testId': result.testId,
          'mode': result.testMode.code,
          'questionBankVersion': result.questionBankVersion,
          'blueprintVersion': result.blueprintVersion,
          'totalQuestions': result.totalQuestions,
          'correctCount': result.correctCount,
          'wrongCount': result.wrongCount,
          'score': result.score,
          'wrongQuestionIds': result.wrongQuestionIds,
          'completedAt': result.completedAt.toUtc().toIso8601String(),
        };

        final response = await _dio.post(
          '/api/v1/results/sync',
          data: payload,
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.synced,
          );
          synced++;
        } else {
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.failed,
            errorMessage: 'Server responded with status ${response.statusCode}',
          );
          failed++;
        }
      } on DioException catch (dioErr) {
        // If the backend sync route is not mounted yet in development or network is offline,
        // we mark as pending/failed gracefully without crashing.
        await _resultsRepository.updateSyncStatus(
          result.clientEventId,
          SyncStatus.pending,
          errorMessage: dioErr.message ?? 'Network offline',
        );
        failed++;
      } catch (err) {
        await _resultsRepository.updateSyncStatus(
          result.clientEventId,
          SyncStatus.failed,
          errorMessage: err.toString(),
        );
        failed++;
      }
    }

    return SyncResultSummary(
      totalAttempted: pending.length,
      syncedCount: synced,
      failedCount: failed,
    );
  }
}
