import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/features/question_bank/models/question_model.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/results/models/test_result_model.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  final now = DateTime(2026, 10, 15, 10, 0);

  group('TestResultModel Subject Mapping & Localization', () {
    test('resolves explicit topicCode to localized label', () {
      final result = TestResultModel(
        clientEventId: 'evt_1',
        testId: 'PRAC_1001',
        testMode: TestMode.practice,
        topicCode: 'word',
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 10,
        correctCount: 8,
        wrongCount: 2,
        score: 8,
        wrongQuestionIds: const ['w1', 'w2'],
        completedAt: now,
        timeTakenSeconds: 120,
      );

      expect(result.getDisplaySubject(langCode: 'en'), equals('MS Word'));
      expect(result.getDisplaySubject(langCode: 'mr'), equals('एमएस वर्ड'));
      expect(result.getDisplaySubject(langCode: 'hi'), equals('एमएस वर्ड'));
    });

    test('resolves explicit subject string to localized text', () {
      final examResult = TestResultModel(
        clientEventId: 'evt_2',
        testId: 'EXAM_2001',
        testMode: TestMode.exam,
        subject: 'MS-CIT Comprehensive Exam',
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 20,
        wrongCount: 5,
        score: 20,
        wrongQuestionIds: const [],
        completedAt: now,
        timeTakenSeconds: 300,
      );

      expect(examResult.getDisplaySubject(langCode: 'en'), equals('MS-CIT Comprehensive Exam'));
      expect(examResult.getDisplaySubject(langCode: 'mr'), equals('एमएस-सीआयटी संपूर्ण परीक्षा'));
      expect(examResult.getDisplaySubject(langCode: 'hi'), equals('एमएस-सीआईटी संपूर्ण परीक्षा'));
    });

    test('gracefully derives subject for historical results with no subject field', () {
      // 1. Historical Exam result
      final historicalExam = TestResultModel(
        clientEventId: 'evt_3',
        testId: 'EXAM_1729000000000',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 15,
        wrongCount: 10,
        score: 15,
        wrongQuestionIds: const [],
        completedAt: now,
        timeTakenSeconds: 400,
      );
      expect(historicalExam.getDisplaySubject(langCode: 'en'), equals('MS-CIT Comprehensive Exam'));

      // 2. Historical Official Mock Exam
      final historicalOfficial = TestResultModel(
        clientEventId: 'evt_4',
        testId: 'MSCIT_FINAL_1729000000000',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 50,
        correctCount: 45,
        wrongCount: 5,
        score: 45,
        wrongQuestionIds: const [],
        completedAt: now,
        timeTakenSeconds: 1200,
      );
      expect(historicalOfficial.getDisplaySubject(langCode: 'en'), equals('MS-CIT Final Assessment'));
      expect(historicalOfficial.getDisplaySubject(langCode: 'mr'), equals('एमएस-सीआयटी अंतिम मूल्यमापन'));

      // 3. Historical Bookmarks Practice
      final historicalCustom = TestResultModel(
        clientEventId: 'evt_5',
        testId: 'CUSTOM_PRAC_1729000000000',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 5,
        correctCount: 4,
        wrongCount: 1,
        score: 4,
        wrongQuestionIds: const [],
        completedAt: now,
        timeTakenSeconds: 60,
      );
      expect(historicalCustom.getDisplaySubject(langCode: 'en'), equals('Bookmarked Questions'));
      expect(historicalCustom.getDisplaySubject(langCode: 'hi'), equals('बुकमार्क किए गए प्रश्न'));
    });

    test('derives topic for historical practice test from questions in QuestionBankRepository', () {
      const q1 = QuestionModel(
        id: 'q_word_01',
        topic: QuestionTopic.word,
        questionText: 'What is MS Word?',
        options: ['Word Processor', 'Spreadsheet', 'Browser', 'OS'],
        correctOptionIndex: 0,
        explanation: 'MS Word is a word processor.',
      );
      const q2 = QuestionModel(
        id: 'q_word_02',
        topic: QuestionTopic.word,
        questionText: 'Default extension of Word 2019?',
        options: ['.docx', '.xlsx', '.pptx', '.txt'],
        correctOptionIndex: 0,
        explanation: '.docx',
      );
      final qb = QuestionBankRepository([q1, q2]);

      final historicalPractice = TestResultModel(
        clientEventId: 'evt_6',
        testId: 'PRAC_1729000000000',
        testMode: TestMode.practice,
        studentAnswers: const {'q_word_01': 1, 'q_word_02': 0},
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 2,
        correctCount: 1,
        wrongCount: 1,
        score: 1,
        wrongQuestionIds: const ['q_word_01'],
        completedAt: now,
        timeTakenSeconds: 30,
      );

      final subject = historicalPractice.getDisplaySubject(
        langCode: 'en',
        questionBank: qb,
      );
      expect(subject, equals('MS Word'));
    });
  });

  group('TestGenerator Subject Assignment', () {
    final qb = QuestionBankRepository();
    final generator = TestGenerator(qb);

    test('generateExamTest assigns MS-CIT Comprehensive Exam subject', () {
      final test = generator.generateExamTest();
      expect(test.subject, equals('MS-CIT Comprehensive Exam'));
    });

    test('generateOfficialMscitExamTest assigns MS-CIT Final Assessment subject', () {
      final test = generator.generateOfficialMscitExamTest();
      expect(test.subject, equals('MS-CIT Final Assessment'));
    });

    test('generatePracticeTest with single topic assigns that topic subject and code', () {
      final test = generator.generatePracticeTest(topics: [QuestionTopic.excel]);
      expect(test.subject, equals('MS Excel'));
      expect(test.topicCode, equals('excel'));
    });

    test('generatePracticeTest with multiple topics assigns Comprehensive Practice', () {
      final test = generator.generatePracticeTest(topics: [QuestionTopic.excel, QuestionTopic.word]);
      expect(test.subject, equals('Practice Test'));
    });

    test('generateCustomPracticeTest assigns Bookmarked Questions subject', () {
      final questions = qb.getQuestionsByTopic(QuestionTopic.word).take(3).toList();
      final test = generator.generateCustomPracticeTest(questions: questions);
      expect(test.subject, equals('Bookmarked Questions'));
    });
  });
}
