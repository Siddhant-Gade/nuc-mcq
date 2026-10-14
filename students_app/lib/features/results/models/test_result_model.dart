import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';
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
    this.subject,
    this.topicCode,
    this.studentAnswers = const {},
    this.syncStatus = SyncStatus.pending,
    this.errorMessage,
  });

  /// Unique client event UUID/timestamp identifier generated before first sync attempt
  final String clientEventId;
  final String testId;
  final TestMode testMode;
  final String? subject;
  final String? topicCode;
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
    Map<String, int>? studentAnswers,
    int? timeTakenSeconds,
    int? score,
    int? correctCount,
    int? wrongCount,
    List<String>? wrongQuestionIds,
    String? subject,
    String? topicCode,
  }) {
    return TestResultModel(
      clientEventId: clientEventId,
      testId: testId,
      testMode: testMode,
      subject: subject ?? this.subject,
      topicCode: topicCode ?? this.topicCode,
      questionBankVersion: questionBankVersion,
      blueprintVersion: blueprintVersion,
      totalQuestions: totalQuestions,
      correctCount: correctCount ?? this.correctCount,
      wrongCount: wrongCount ?? this.wrongCount,
      score: score ?? this.score,
      wrongQuestionIds: wrongQuestionIds ?? this.wrongQuestionIds,
      completedAt: completedAt,
      timeTakenSeconds: timeTakenSeconds ?? this.timeTakenSeconds,
      studentAnswers: studentAnswers ?? this.studentAnswers,
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
      subject: (map['subject'] ?? map['topic_name'] ?? map['topic'])?.toString(),
      topicCode: (map['topicCode'] ?? map['topic_code'])?.toString(),
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
      if (subject != null) 'subject': subject,
      if (topicCode != null) 'topic_code': topicCode,
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

  /// Determines the accurate, localized display subject for this test result.
  /// Seamlessly handles historical results where subject or topicCode was not explicitly stored.
  String getDisplaySubject({
    required String langCode,
    QuestionBankRepository? questionBank,
  }) {
    // 1. Check topicCode first
    if (topicCode != null && topicCode!.trim().isNotEmpty) {
      final code = topicCode!.trim().toLowerCase();
      for (final topic in QuestionTopic.values) {
        if (topic.name.toLowerCase() == code || topic.label.toLowerCase() == code) {
          return topic.localizedLabel(langCode);
        }
      }
    }

    // 2. Check explicit subject string
    if (subject != null && subject!.trim().isNotEmpty) {
      final s = subject!.trim();
      for (final topic in QuestionTopic.values) {
        if (topic.name.toLowerCase() == s.toLowerCase() ||
            topic.label.toLowerCase() == s.toLowerCase() ||
            topic.labelMr.toLowerCase() == s.toLowerCase() ||
            topic.labelHi.toLowerCase() == s.toLowerCase()) {
          return topic.localizedLabel(langCode);
        }
      }

      if (s.contains('Comprehensive Exam') || s == 'MS-CIT Comprehensive') {
        if (langCode == 'mr') return 'एमएस-सीआयटी संपूर्ण परीक्षा';
        if (langCode == 'hi') return 'एमएस-सीआईटी संपूर्ण परीक्षा';
        return 'MS-CIT Comprehensive Exam';
      }

      if (s.contains('Final') || s.contains('Assessment')) {
        if (langCode == 'mr') return 'एमएस-सीआयटी अंतिम मूल्यमापन';
        if (langCode == 'hi') return 'एमएस-सीआईटी अंतिम मूल्यांकन';
        return 'MS-CIT Final Assessment';
      }

      if (s.contains('Comprehensive Practice') || s == 'All Topics') {
        if (langCode == 'mr') return 'सर्व विषयांचा सराव';
        if (langCode == 'hi') return 'सभी विषयों का अभ्यास';
        return 'Comprehensive Practice';
      }

      if (s.contains('Bookmark')) {
        if (langCode == 'mr') return 'जतन केलेले प्रश्न';
        if (langCode == 'hi') return 'बुकमार्क किए गए प्रश्न';
        return 'Bookmarked Questions';
      }

      return s;
    }

    // 3. Graceful fallback for historical results
    final tid = testId.toUpperCase();
    if (tid.startsWith('MSCIT_FINAL_')) {
      if (langCode == 'mr') return 'एमएस-सीआयटी अंतिम मूल्यमापन';
      if (langCode == 'hi') return 'एमएस-सीआईटी अंतिम मूल्यांकन';
      return 'MS-CIT Final Assessment';
    }

    if (tid.startsWith('EXAM_') || testMode == TestMode.exam) {
      if (langCode == 'mr') return 'एमएस-सीआयटी संपूर्ण परीक्षा';
      if (langCode == 'hi') return 'एमएस-सीआईटी संपूर्ण परीक्षा';
      return 'MS-CIT Comprehensive Exam';
    }

    if (tid.startsWith('CUSTOM_PRAC_')) {
      if (langCode == 'mr') return 'जतन केलेले प्रश्न';
      if (langCode == 'hi') return 'बुकमार्क किए गए प्रश्न';
      return 'Bookmarked Questions';
    }

    // Practice test fallback: Inspect question topics if QuestionBankRepository is available
    if (questionBank != null) {
      final qIds = <String>{...studentAnswers.keys, ...wrongQuestionIds};
      final foundTopics = <QuestionTopic>{};
      for (final id in qIds) {
        final q = questionBank.getQuestionById(id);
        if (q != null) {
          foundTopics.add(q.topic);
        }
      }
      if (foundTopics.length == 1) {
        return foundTopics.first.localizedLabel(langCode);
      } else if (foundTopics.length > 1) {
        if (langCode == 'mr') return 'सर्व विषयांचा सराव';
        if (langCode == 'hi') return 'सभी विषयों का अभ्यास';
        return 'Comprehensive Practice';
      }
    }

    // General default fallback
    if (langCode == 'mr') return 'एमएस-सीआयटी सराव';
    if (langCode == 'hi') return 'एमएस-सीआईटी अभ्यास';
    return 'MS-CIT Practice';
  }
}
