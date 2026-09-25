import 'dart:math';
import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';

enum TestMode {
  practice('PRACTICE', 'Practice Test'),
  exam('EXAM', 'Official Assessment');

  const TestMode(this.code, this.label);
  final String code;
  final String label;
}

class GeneratedTest {
  const GeneratedTest({
    required this.testId,
    required this.mode,
    required this.questions,
    required this.durationMinutes,
    required this.blueprintVersion,
    required this.questionBankVersion,
  });

  final String testId;
  final TestMode mode;
  final List<QuestionModel> questions;
  final int durationMinutes;
  final String blueprintVersion;
  final String questionBankVersion;
}

/// Shared TestGenerator (100% Client-Side per Section 12.1 of system_design.md).
/// Enforces blueprint weightages for Exam Mode and flexible configuration for Practice Mode.
/// Guarantees unique question IDs within a single generated test.
class TestGenerator {
  TestGenerator(this._questionBank);

  final QuestionBankRepository _questionBank;
  final Random _random = Random();

  static const String currentBlueprintVersion = '1.2.0';

  /// Generates the Official Exam Mode Test:
  /// Exactly 25 questions selected across the 8 MS-CIT syllabus topics.
  /// Duration: 30 minutes.
  GeneratedTest generateExamTest() {
    final selectedQuestions = <QuestionModel>[];
    final allQuestions = List<QuestionModel>.from(_questionBank.getAllQuestions());
    allQuestions.shuffle(_random);

    // Pick 3 from each of the 8 topics (24 questions) + 1 extra random question (total 25)
    for (final topic in QuestionTopic.values) {
      final topicQuestions = _questionBank.getQuestionsByTopic(topic).toList();
      topicQuestions.shuffle(_random);
      selectedQuestions.addAll(topicQuestions.take(3));
    }

    // Add remaining up to 25 unique questions
    final selectedIds = selectedQuestions.map((q) => q.id).toSet();
    for (final q in allQuestions) {
      if (selectedQuestions.length >= 25) break;
      if (!selectedIds.contains(q.id)) {
        selectedQuestions.add(q);
        selectedIds.add(q.id);
      }
    }

    // If bank has fewer than 25, fallback safely to all available
    if (selectedQuestions.length < 25 && allQuestions.length <= 25) {
      selectedQuestions.clear();
      selectedQuestions.addAll(allQuestions);
    }

    selectedQuestions.shuffle(_random);

    final testId = 'EXAM_${DateTime.now().millisecondsSinceEpoch}';

    return GeneratedTest(
      testId: testId,
      mode: TestMode.exam,
      questions: selectedQuestions,
      durationMinutes: 30,
      blueprintVersion: currentBlueprintVersion,
      questionBankVersion: QuestionBankRepository.version,
    );
  }

  /// Generates the full Official 50-Question MS-CIT Mock Exam (60 minutes).
  GeneratedTest generateOfficialMscitExamTest() {
    final selectedQuestions = <QuestionModel>[];
    final allQuestions = List<QuestionModel>.from(_questionBank.getAllQuestions());
    allQuestions.shuffle(_random);

    // Pick questions across syllabus topics
    for (final topic in QuestionTopic.values) {
      final topicQuestions = _questionBank.getQuestionsByTopic(topic).toList();
      topicQuestions.shuffle(_random);
      selectedQuestions.addAll(topicQuestions.take(6));
    }

    final selectedIds = selectedQuestions.map((q) => q.id).toSet();
    for (final q in allQuestions) {
      if (selectedQuestions.length >= 50) break;
      if (!selectedIds.contains(q.id)) {
        selectedQuestions.add(q);
        selectedIds.add(q.id);
      }
    }

    if (selectedQuestions.isEmpty && allQuestions.isNotEmpty) {
      selectedQuestions.addAll(allQuestions.take(50));
    }

    selectedQuestions.shuffle(_random);

    final testId = 'MSCIT_FINAL_${DateTime.now().millisecondsSinceEpoch}';

    return GeneratedTest(
      testId: testId,
      mode: TestMode.exam,
      questions: selectedQuestions,
      durationMinutes: 60,
      blueprintVersion: currentBlueprintVersion,
      questionBankVersion: QuestionBankRepository.version,
    );
  }

  /// Generates a flexible Practice Mode test based on selected topics and question count.
  GeneratedTest generatePracticeTest({
    List<QuestionTopic>? topics,
    int totalQuestions = 15,
    int durationMinutes = 20,
  }) {
    final activeTopics = (topics == null || topics.isEmpty)
        ? QuestionTopic.values
        : topics;

    final pool = <QuestionModel>[];
    for (final topic in activeTopics) {
      pool.addAll(_questionBank.getQuestionsByTopic(topic));
    }

    pool.shuffle(_random);

    // Take without duplicates safely
    final selected = pool.isEmpty
        ? <QuestionModel>[]
        : pool.take(totalQuestions.clamp(1, pool.length)).toList();
    selected.shuffle(_random);

    final testId = 'PRAC_${DateTime.now().millisecondsSinceEpoch}';

    return GeneratedTest(
      testId: testId,
      mode: TestMode.practice,
      questions: selected,
      durationMinutes: durationMinutes,
      blueprintVersion: currentBlueprintVersion,
      questionBankVersion: QuestionBankRepository.version,
    );
  }

  /// Generates a Practice Test from a custom list of questions (e.g., Bookmarked questions).
  GeneratedTest generateCustomPracticeTest({
    required List<QuestionModel> questions,
    int? durationMinutes,
  }) {
    final list = List<QuestionModel>.from(questions);
    list.shuffle(_random);
    final duration = durationMinutes ?? (list.length.clamp(5, 30));

    final testId = 'CUSTOM_PRAC_${DateTime.now().millisecondsSinceEpoch}';

    return GeneratedTest(
      testId: testId,
      mode: TestMode.practice,
      questions: list,
      durationMinutes: duration,
      blueprintVersion: currentBlueprintVersion,
      questionBankVersion: QuestionBankRepository.version,
    );
  }
}
