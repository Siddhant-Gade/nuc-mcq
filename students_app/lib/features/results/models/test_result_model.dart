import '../../test_engine/services/test_generator.dart';

enum SyncStatus {
  pending('PENDING', 'Pending Sync'),
  syncing('SYNCING', 'Syncing...'),
  synced('SYNCED', 'Synced to Cloud'),
  failed('FAILED', 'Sync Failed');

  const SyncStatus(this.code, this.label);
  final String code;
  final String label;
}

/// Durable Compact Test Result Model (defined in Section 11 of system_design.md).
/// Never stores full question texts; keeps wrong_question_ids array for offline review.
class TestResultModel {
  const TestResultModel({
    required this.clientEventId,
    required this.testId,
    required this.testMode,
    required this.questionBankVersion,
    required this.blueprintVersion,
    required this.totalQuestions,
    required this.correctCount,
    required this.wrongCount,
    required this.score,
    required this.wrongQuestionIds,
    required this.completedAt,
    required this.timeTakenSeconds,
    this.studentAnswers = const {},
    this.syncStatus = SyncStatus.pending,
    this.errorMessage,
  });

  /// Unique client event UUID/timestamp identifier generated before first sync attempt
  final String clientEventId;
  final String testId;
  final TestMode testMode;
  final String questionBankVersion;
  final String blueprintVersion;
  final int totalQuestions;
  final int correctCount;
  final int wrongCount;
  final int score;
  final List<String> wrongQuestionIds;
  final DateTime completedAt;
  final int timeTakenSeconds;
  final Map<String, int> studentAnswers; // questionId -> selectedOptionIndex
  final SyncStatus syncStatus;
  final String? errorMessage;

  double get percentage => totalQuestions > 0 ? (score / totalQuestions) * 100 : 0.0;
  bool get isPassed => percentage >= 50.0;

  TestResultModel copyWith({
    SyncStatus? syncStatus,
    String? errorMessage,
  }) {
    return TestResultModel(
      clientEventId: clientEventId,
      testId: testId,
      testMode: testMode,
      questionBankVersion: questionBankVersion,
      blueprintVersion: blueprintVersion,
      totalQuestions: totalQuestions,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: score,
      wrongQuestionIds: wrongQuestionIds,
      completedAt: completedAt,
      timeTakenSeconds: timeTakenSeconds,
      studentAnswers: studentAnswers,
      syncStatus: syncStatus ?? this.syncStatus,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  factory TestResultModel.fromMap(Map<String, dynamic> map) {
    final modeStr = (map['mode'] ?? map['test_mode'] ?? 'PRACTICE').toString().toUpperCase();
    final completedAtRaw = map['completedAt'] ?? map['completed_at'];
    return TestResultModel(
      clientEventId: (map['clientEventId'] ?? map['client_event_id'] ?? map['id'] ?? '').toString(),
      testId: (map['testId'] ?? map['test_id'] ?? '').toString(),
      testMode: modeStr == 'EXAM' ? TestMode.exam : TestMode.practice,
      questionBankVersion: (map['questionBankVersion'] ?? map['question_bank_version'] ?? '1.0.0').toString(),
      blueprintVersion: (map['blueprintVersion'] ?? map['blueprint_version'] ?? '1.0.0').toString(),
      totalQuestions: (map['totalQuestions'] ?? map['total_questions'] as num?)?.toInt() ?? 0,
      correctCount: (map['correctCount'] ?? map['correct_count'] as num?)?.toInt() ?? 0,
      wrongCount: (map['wrongCount'] ?? map['wrong_count'] as num?)?.toInt() ?? 0,
      score: (map['score'] as num?)?.toInt() ?? 0,
      wrongQuestionIds: List<String>.from((map['wrongQuestionIds'] ?? map['wrong_question_ids'] as List?) ?? []),
      completedAt: completedAtRaw != null
          ? DateTime.parse(completedAtRaw.toString())
          : DateTime.now(),
      timeTakenSeconds: (map['timeTakenSeconds'] ?? map['time_taken_seconds'] as num?)?.toInt() ?? 0,
      studentAnswers: ((map['studentAnswers'] ?? map['student_answers']) as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as num).toInt()),
          ) ??
          {},
      syncStatus: SyncStatus.values.firstWhere(
        (s) => s.code == (map['syncStatus'] ?? map['sync_status']),
        orElse: () => SyncStatus.synced,
      ),
      errorMessage: (map['errorMessage'] ?? map['error_message']) as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'client_event_id': clientEventId,
      'test_id': testId,
      'test_mode': testMode.code,
      'question_bank_version': questionBankVersion,
      'blueprint_version': blueprintVersion,
      'total_questions': totalQuestions,
      'correct_count': correctCount,
      'wrong_count': wrongCount,
      'score': score,
      'wrong_question_ids': wrongQuestionIds,
      'completed_at': completedAt.toIso8601String(),
      'time_taken_seconds': timeTakenSeconds,
      'student_answers': studentAnswers,
      'sync_status': syncStatus.code,
      if (errorMessage != null) 'error_message': errorMessage,
    };
  }
}
