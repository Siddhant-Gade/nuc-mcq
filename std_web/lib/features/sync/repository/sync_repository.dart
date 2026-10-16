import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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

        Response<dynamic> response;
        try {
          response = await _dio.post(
            '/api/v1/results/sync',
            data: payload,
          );
        } on DioException catch (postErr) {
          if (postErr.response?.statusCode == 404) {
            // Attempt fallback route on servers mounting student result routes under /api/v1/student/results/sync
            response = await _dio.post(
              '/api/v1/student/results/sync',
              data: payload,
            );
          } else {
            rethrow;
          }
        }

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
        // Handle terminal HTTP failures distinctly — never mask 404/401/403
        // as an offline/network issue and never retry them blindly.
        final statusCode = dioErr.response?.statusCode;
        if (statusCode == 404) {
          // History/sync route not deployed on the connected server.
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.failed,
            errorMessage:
                'Sync endpoint returned 404 on the connected server; deploy the updated backend, then retry.',
          );
          debugPrint(
            '[SyncRepository] Upload ${result.clientEventId} failed: HTTP 404 — '
            'route missing on the connected server, not a network outage.',
          );
          failed++;
        } else if (statusCode == 401 || statusCode == 403) {
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.failed,
            errorMessage:
                'Authorization failed (HTTP $statusCode); sign in again with an ACTIVE student account.',
          );
          debugPrint(
            '[SyncRepository] Upload ${result.clientEventId} failed: HTTP $statusCode — '
            'auth/authorization issue, not a network outage.',
          );
          failed++;
        } else if (dioErr.type == DioExceptionType.connectionError ||
            dioErr.type == DioExceptionType.connectionTimeout ||
            dioErr.type == DioExceptionType.sendTimeout ||
            dioErr.type == DioExceptionType.receiveTimeout) {
          // Genuinely offline: keep pending so a later retry can succeed.
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.pending,
            errorMessage: dioErr.message ?? 'Network offline',
          );
          failed++;
        } else {
          await _resultsRepository.updateSyncStatus(
            result.clientEventId,
            SyncStatus.failed,
            errorMessage:
                'Server responded with status $statusCode: ${dioErr.message ?? 'request failed'}',
          );
          failed++;
        }
      } catch (err) {
        await _resultsRepository.updateSyncStatus(
          result.clientEventId,
          SyncStatus.failed,
          errorMessage: err.toString(),
        );
        failed++;
      }
    }

    if (synced > 0) {
      try {
        await _resultsRepository.syncFromBackend();
      } catch (_) {}
    }

    return SyncResultSummary(
      totalAttempted: pending.length,
      syncedCount: synced,
      failedCount: failed,
    );
  }
}
