import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/features/question_bank/models/question_model.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/test_engine/cubit/test_engine_cubit.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TestEngineCubit - Exam Integrity & Sync Safety', () {
    late ResultsRepository resultsRepository;
    late List<QuestionModel> sampleQuestions;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      resultsRepository = ResultsRepository();

      sampleQuestions = [
        const QuestionModel(
          id: 'q_1',
          topic: QuestionTopic.computerFundamentals,
          questionText: 'Question 1',
          options: ['Correct A', 'Wrong B', 'Wrong C', 'Wrong D'],
          correctOptionIndex: 0,
          explanation: 'Exp 1',
        ),
        const QuestionModel(
          id: 'q_2',
          topic: QuestionTopic.os,
          questionText: 'Question 2',
          options: ['Wrong A', 'Correct B', 'Wrong C', 'Wrong D'],
          correctOptionIndex: 1,
          explanation: 'Exp 2',
        ),
        const QuestionModel(
          id: 'q_3',
          topic: QuestionTopic.word,
          questionText: 'Question 3',
          options: ['Wrong A', 'Wrong B', 'Correct C', 'Wrong D'],
          correctOptionIndex: 2,
          explanation: 'Exp 3',
        ),
      ];
    });

    test('Exam mode: Never reveals correctness, never updates streak or XP', () {
      final examTest = GeneratedTest(
        testId: 'test_exam_1',
        mode: TestMode.exam,
        questions: sampleQuestions,
        durationMinutes: 10,
        blueprintVersion: '1.0.0',
        questionBankVersion: '1.0.0',
      );

      final cubit = TestEngineCubit(
        test: examTest,
        resultsRepository: resultsRepository,
      );

      // Student answers question 1 correctly (option 0)
      cubit.selectOption(0);
      expect(cubit.state.answers['q_1'], 0);
      expect(cubit.state.lastAnswerWasCorrect, isNull);
      expect(cubit.state.currentStreak, 0);
      expect(cubit.state.earnedXp, 0);

      // Student changes answer to option 1 (wrong) before submission
      cubit.selectOption(1);
      expect(cubit.state.answers['q_1'], 1);
      expect(cubit.state.lastAnswerWasCorrect, isNull);
      expect(cubit.state.currentStreak, 0);
      expect(cubit.state.earnedXp, 0);

      // 50:50 Lifeline must NOT work in Exam mode
      final lifelineUsed = cubit.useFiftyFiftyLifeline();
      expect(lifelineUsed, isFalse);
      expect(cubit.state.eliminatedOptionIndices, isEmpty);
      expect(cubit.state.lifelinesRemaining, 3);

      cubit.close();
    });

    test('Exam mode submitTest: Skipped questions are NOT added to wrongQuestionIds', () async {
      final examTest = GeneratedTest(
        testId: 'test_exam_2',
        mode: TestMode.exam,
        questions: sampleQuestions, // 3 questions total
        durationMinutes: 10,
        blueprintVersion: '1.0.0',
        questionBankVersion: '1.0.0',
      );

      final cubit = TestEngineCubit(
        test: examTest,
        resultsRepository: resultsRepository,
      );

      // Q1 answered correctly (option 0)
      cubit.selectOption(0);

      // Q2 answered incorrectly (option 0 instead of 1)
      cubit.nextQuestion();
      cubit.selectOption(0);

      // Q3 is SKIPPED (unanswered)
      cubit.nextQuestion();

      expect(cubit.state.answeredCount, 2);
      expect(cubit.state.unansweredCount, 1);

      await cubit.submitTest();

      final result = cubit.state.completedResult;
      expect(result, isNotNull);
      expect(result!.totalQuestions, 3);
      expect(result.correctCount, 1);
      expect(result.wrongCount, 1); // 1 wrong, 1 skipped
      expect(result.score, 1);
      // Crucial: wrongQuestionIds MUST only have the actual wrong question ('q_2'), NOT the skipped one ('q_3')
      expect(result.wrongQuestionIds, ['q_2']);
      expect(result.wrongQuestionIds.length, equals(result.wrongCount));

      cubit.close();
    });

    test('Practice mode: Computes streak, XP, and supports 50:50 lifeline', () {
      final practiceTest = GeneratedTest(
        testId: 'test_practice_1',
        mode: TestMode.practice,
        questions: sampleQuestions,
        durationMinutes: 10,
        blueprintVersion: '1.0.0',
        questionBankVersion: '1.0.0',
      );

      final cubit = TestEngineCubit(
        test: practiceTest,
        resultsRepository: resultsRepository,
      );

      // Lifeline eliminates 2 incorrect options
      final lifelineUsed = cubit.useFiftyFiftyLifeline();
      expect(lifelineUsed, isTrue);
      expect(cubit.state.eliminatedOptionIndices['q_1']?.length, 2);
      expect(cubit.state.lifelinesRemaining, 2);

      // Answer correctly
      cubit.selectOption(0);
      expect(cubit.state.lastAnswerWasCorrect, isTrue);
      expect(cubit.state.currentStreak, 1);
      expect(cubit.state.earnedXp, greaterThan(0));

      cubit.close();
    });
  });
}
