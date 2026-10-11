import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/api/api_client.dart';
import '../models/test_result_model.dart';

/// Local Durable Test Results Repository with Cloud Synchronization.
/// Persists test results locally first (Section 5.2 & Section 11 of system_design.md)
/// and seamlessly syncs historical test records from the backend API.
/// Durable across browser refreshes and application restarts.
class ResultsRepository {
  ResultsRepository({Dio? dio}) : _dio = dio {
    _loadFromLocalCache();
  }

  final Dio? _dio;
  static const _storageKey = 'student_app_test_results_v1';
  final List<TestResultModel> _results = [];
  bool _isLoaded = false;

  Future<void> _loadFromLocalCache() async {
    if (_isLoaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final rawJson = prefs.getString(_storageKey);
      if (rawJson != null && rawJson.isNotEmpty) {
        final decoded = jsonDecode(rawJson) as List<dynamic>;
        _results.clear();
        for (final item in decoded) {
          if (item is Map<String, dynamic>) {
            _results.add(TestResultModel.fromMap(item));
          } else if (item is Map) {
            _results.add(TestResultModel.fromMap(Map<String, dynamic>.from(item)));
          }
        }
      }
      _isLoaded = true;
    } catch (_) {
      _isLoaded = true;
    }
  }

  Future<void> _persistToLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = _results.map((r) => r.toMap()).toList();
      await prefs.setString(_storageKey, jsonEncode(list));
    } catch (_) {}
  }

  /// Save a completed test result durably
  Future<void> saveResult(TestResultModel result) async {
    await _loadFromLocalCache();
    // Remove if already exists with same clientEventId to prevent duplication
    _results.removeWhere((r) => r.clientEventId == result.clientEventId);
    _results.insert(0, result); // newest first
    await _persistToLocalCache();
  }

  /// Get all past test results
  Future<List<TestResultModel>> getAllResults() async {
    await _loadFromLocalCache();
    return List.unmodifiable(_results);
  }

  /// Get results pending sync
  Future<List<TestResultModel>> getPendingResults() async {
    await _loadFromLocalCache();
    return _results.where((r) => r.syncStatus == SyncStatus.pending || r.syncStatus == SyncStatus.failed).toList();
  }

  /// Update the sync status of a specific result record
  Future<void> updateSyncStatus(String clientEventId, SyncStatus status, {String? errorMessage}) async {
    await _loadFromLocalCache();
    final index = _results.indexWhere((r) => r.clientEventId == clientEventId);
    if (index != -1) {
      _results[index] = _results[index].copyWith(
        syncStatus: status,
        errorMessage: errorMessage,
      );
      await _persistToLocalCache();
    }
  }

  /// Merges results fetched from backend API into local cache without losing pending local tests.
  Future<void> mergeCloudResults(List<TestResultModel> cloudResults) async {
    await _loadFromLocalCache();

    // Preserve local tests not yet confirmed by the cloud: pending, syncing,
    // failed, AND previously synced locals absent from this payload (e.g.
    // offline-first records written before the history endpoint existed).
    // Cloud records win on clientEventId conflicts.
    final localMap = <String, TestResultModel>{
      for (final r in _results) r.clientEventId: r,
    };

    final merged = <String, TestResultModel>{};

    // 1. Keep every local record as the base (no data loss on empty cloud).
    merged.addAll(localMap);

    // 2. Overlay cloud results (ensuring status is synced).
    for (final cr in cloudResults) {
      final syncedModel = cr.copyWith(syncStatus: SyncStatus.synced);
      merged[cr.clientEventId] = syncedModel;
    }

    // 3. Sort by completedAt descending (newest first)
    _results.clear();
    _results.addAll(merged.values);
    _results.sort((a, b) => b.completedAt.compareTo(a.completedAt));

    await _persistToLocalCache();
  }

  /// Syncs down historical test results from the backend API and merges them with local cache.
  ///
  /// Error handling strategy:
  ///  • 404 → the history endpoint is not yet deployed on this server; skip silently and
  ///    fall back to the local cache.  Do NOT treat this as a network outage.
  ///  • 401/403 → auth/authorization issue; log clearly without printing tokens.
  ///  • Connection error / timeout → server unreachable; log as offline.
  ///  • Other HTTP errors → log the status code for diagnosis.
  Future<List<TestResultModel>> syncFromBackend() async {
    if (_dio == null) {
      return getAllResults();
    }

    try {
      final response = await _dio.get<Object?>('/api/v1/results');
      final data = requireSuccessData(response.data);
      if (data is List) {
        final cloudResults = <TestResultModel>[];
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            cloudResults.add(TestResultModel.fromMap(item));
          } else if (item is Map) {
            cloudResults.add(TestResultModel.fromMap(Map<String, dynamic>.from(item)));
          }
        }
        debugPrint('[ResultsRepository] Synced ${cloudResults.length} record(s) from backend.');
        await mergeCloudResults(cloudResults);
      }
    } on DioException catch (dioErr) {
      final statusCode = dioErr.response?.statusCode;
      if (statusCode == 404) {
        // The GET /api/v1/results endpoint is not yet deployed on this backend server.
        // The POST /api/v1/results/sync endpoint (for uploading) may still work.
        // Degrade gracefully: show only local results until the server is updated.
        debugPrint(
          '[ResultsRepository] History endpoint GET /api/v1/results returned 404 — '
          'route not yet deployed on the connected server. '
          'Falling back to local cache. Deploy the updated backend to enable cloud history sync.',
        );
      } else if (statusCode == 401) {
        debugPrint(
          '[ResultsRepository] History sync failed: unauthenticated (401). '
          'The student session may have expired.',
        );
      } else if (statusCode == 403) {
        debugPrint(
          '[ResultsRepository] History sync failed: access denied (403). '
          'The authenticated user may not have STUDENT role on the server.',
        );
      } else if (dioErr.type == DioExceptionType.connectionError ||
          dioErr.type == DioExceptionType.connectionTimeout) {
        debugPrint(
          '[ResultsRepository] History sync failed: server unreachable (${dioErr.type}). '
          'Showing local cache.',
        );
      } else {
        debugPrint(
          '[ResultsRepository] History sync failed: HTTP $statusCode — ${dioErr.message}',
        );
      }
    } catch (e) {
      debugPrint('[ResultsRepository] History sync unexpected error: $e');
    }

    return getAllResults();
  }

  /// Clears in-memory and local durable cache (e.g. when student logs out).
  Future<void> clear() async {
    _results.clear();
    _isLoaded = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKey);
    } catch (_) {}
  }

  /// Get detailed student stats
  Future<StudentStats> getStudentStats() async {
    await _loadFromLocalCache();
    if (_results.isEmpty) {
      return const StudentStats(
        totalTests: 0,
        examCount: 0,
        practiceCount: 0,
        averageScore: 0.0,
        passCount: 0,
        pendingSyncCount: 0,
        totalXp: 0,
        level: 1,
        levelTitle: 'Novice Learner',
        currentStreak: 0,
        unlockedBadges: [],
      );
    }

    final totalTests = _results.length;
    final examCount = _results.where((r) => r.testMode.code == 'EXAM').length;
    final practiceCount = _results.where((r) => r.testMode.code == 'PRACTICE').length;
    final totalPercentage = _results.fold<double>(0, (sum, r) => sum + r.percentage);
    final passCount = _results.where((r) => r.isPassed).length;
    final pendingSyncCount = _results.where((r) => r.syncStatus == SyncStatus.pending).length;

    // Gamification Calculations
    // Correct questions award 10 XP; passing an exam awards 50 bonus XP
    final totalCorrect = _results.fold<int>(0, (sum, r) => sum + r.correctCount);
    final totalXp = (totalCorrect * 10) + (passCount * 50);

    // Levels: Every 150 XP is a level up
    final level = (totalXp ~/ 150) + 1;
    final String levelTitle;
    if (level >= 10) {
      levelTitle = 'MS-CIT Grandmaster';
    } else if (level >= 7) {
      levelTitle = 'Computer Expert';
    } else if (level >= 5) {
      levelTitle = 'Speed Master';
    } else if (level >= 3) {
      levelTitle = 'Rising Scholar';
    } else if (level >= 2) {
      levelTitle = 'Active Learner';
    } else {
      levelTitle = 'Novice Learner';
    }

    // Streak calculation based on test completion dates
    final Set<String> activeDates = {};
    for (final r in _results) {
      final d = r.completedAt;
      activeDates.add('${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}');
    }

    int currentStreak = 0;
    DateTime checkDate = DateTime.now();
    final todayStr = '${checkDate.year}-${checkDate.month.toString().padLeft(2, '0')}-${checkDate.day.toString().padLeft(2, '0')}';
    
    // If completed today or yesterday, count consecutive days backwards
    if (activeDates.contains(todayStr)) {
      currentStreak++;
      checkDate = checkDate.subtract(const Duration(days: 1));
    } else {
      final yesterday = checkDate.subtract(const Duration(days: 1));
      final yesterdayStr = '${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}';
      if (activeDates.contains(yesterdayStr)) {
        checkDate = yesterday;
      }
    }

    while (true) {
      final dStr = '${checkDate.year}-${checkDate.month.toString().padLeft(2, '0')}-${checkDate.day.toString().padLeft(2, '0')}';
      if (activeDates.contains(dStr)) {
        currentStreak++;
        checkDate = checkDate.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }

    // Unlocked Achievements / Badges
    final List<String> badges = [];
    if (totalTests >= 1) badges.add('First Test Taken 🎯');
    if (passCount >= 1) badges.add('First Win 🏆');
    if (totalTests >= 5) badges.add('Practice Pro ⚡');
    if (passCount >= 5) badges.add('High Achiever 🌟');
    if (currentStreak >= 3) badges.add('On Fire! 🔥');
    if (_results.any((r) => r.percentage >= 90)) badges.add('Genius (90%+) 🧠');

    return StudentStats(
      totalTests: totalTests,
      examCount: examCount,
      practiceCount: practiceCount,
      averageScore: totalTests > 0 ? totalPercentage / totalTests : 0.0,
      passCount: passCount,
      pendingSyncCount: pendingSyncCount,
      totalXp: totalXp,
      level: level,
      levelTitle: levelTitle,
      currentStreak: currentStreak,
      unlockedBadges: badges,
    );
  }
}

class StudentStats {
  const StudentStats({
    required this.totalTests,
    required this.examCount,
    required this.practiceCount,
    required this.averageScore,
    required this.passCount,
    required this.pendingSyncCount,
    this.totalXp = 0,
    this.level = 1,
    this.levelTitle = 'Novice Learner',
    this.currentStreak = 0,
    this.unlockedBadges = const [],
  });

  final int totalTests;
  final int examCount;
  final int practiceCount;
  final double averageScore;
  final int passCount;
  final int pendingSyncCount;
  final int totalXp;
  final int level;
  final String levelTitle;
  final int currentStreak;
  final List<String> unlockedBadges;

  double get passRate => totalTests > 0 ? (passCount / totalTests) * 100 : 0.0;
  int get xpForNextLevel => (level * 150);
  int get currentLevelXp => totalXp % 150;
  double get levelProgress => (currentLevelXp / 150).clamp(0.0, 1.0);
}
