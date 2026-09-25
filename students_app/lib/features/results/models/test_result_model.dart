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
    return TestResultModel(
      clientEventId: map['client_event_id'] as String,
      testId: map['test_id'] as String,
      testMode: map['test_mode'] == 'EXAM' ? TestMode.exam : TestMode.practice,
      questionBankVersion: map['question_bank_version'] as String? ?? '1.0.0',
      blueprintVersion: map['blueprint_version'] as String? ?? '1.0.0',
      totalQuestions: map['total_questions'] as int,
      correctCount: map['correct_count'] as int,
      wrongCount: map['wrong_count'] as int,
      score: map['score'] as int,
      wrongQuestionIds: List<String>.from(map['wrong_question_ids'] as List? ?? []),
      completedAt: DateTime.parse(map['completed_at'] as String),
      timeTakenSeconds: map['time_taken_seconds'] as int? ?? 0,
      studentAnswers: (map['student_answers'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v as int),
          ) ??
          {},
      syncStatus: SyncStatus.values.firstWhere(
        (s) => s.code == map['sync_status'],
        orElse: () => SyncStatus.pending,
      ),
      errorMessage: map['error_message'] as String?,
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
