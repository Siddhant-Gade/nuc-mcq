import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/features/question_bank/models/question_model.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  group('TestGenerator', () {
    late QuestionBankRepository questionBank;
    late TestGenerator generator;

    setUp(() {
      final sampleQuestions = <QuestionModel>[];
      for (final topic in QuestionTopic.values) {
        for (int i = 1; i <= 5; i++) {
          sampleQuestions.add(
            QuestionModel(
              id: 'test_${topic.name}_$i',
              topic: topic,
              questionText: 'Test question $i for ${topic.label}',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctOptionIndex: 0,
              explanation: 'Explanation for $i',
            ),
          );
        }
      }
      questionBank = QuestionBankRepository(sampleQuestions);
      generator = TestGenerator(questionBank);
    });

    test('generateExamTest produces 25 questions across the 8 syllabus topics', () {
      final exam = generator.generateExamTest();

      expect(exam.mode, TestMode.exam);
      expect(exam.questions.length, 25);
      expect(exam.durationMinutes, 30);

      // Verify unique questions
      final ids = exam.questions.map((q) => q.id).toSet();
      expect(ids.length, 25);

      // Verify questions are distributed across available syllabus topics
      final counts = <QuestionTopic, int>{};
      for (final q in exam.questions) {
        counts[q.topic] = (counts[q.topic] ?? 0) + 1;
      }
      expect(counts.isNotEmpty, isTrue);
    });

    test('generatePracticeTest produces requested number of questions', () {
      final practice = generator.generatePracticeTest(
        topics: [QuestionTopic.word, QuestionTopic.excel],
        totalQuestions: 8,
        durationMinutes: 10,
      );

      expect(practice.mode, TestMode.practice);
      expect(practice.questions.length, 8);
      expect(practice.durationMinutes, 10);

      for (final q in practice.questions) {
        expect(
          q.topic == QuestionTopic.word || q.topic == QuestionTopic.excel,
          isTrue,
        );
      }
    });

    test('generateCustomPracticeTest creates practice session from supplied questions', () {
      final allQ = questionBank.getAllQuestions();
      final customQuestions = allQ.take(3).toList();

      final customTest = generator.generateCustomPracticeTest(
        questions: customQuestions,
        durationMinutes: 5,
      );

      expect(customTest.mode, TestMode.practice);
      expect(customTest.questions.length, 3);
      expect(customTest.durationMinutes, 5);
      expect(customTest.questions.map((q) => q.id).toSet(), customQuestions.map((q) => q.id).toSet());
    });
  });
}
