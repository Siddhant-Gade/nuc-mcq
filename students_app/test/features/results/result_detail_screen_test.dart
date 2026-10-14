import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/localization/app_localizations.dart';
import 'package:student_app/core/localization/locale_cubit.dart';
import 'package:student_app/features/question_bank/models/question_model.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/results/cubit/results_cubit.dart';
import 'package:student_app/features/results/models/test_result_model.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/results/screens/result_detail_screen.dart';
import 'package:student_app/features/results/screens/results_history_screen.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  const sampleQuestion = QuestionModel(
    id: 'q1',
    topic: QuestionTopic.word,
    questionText: 'Which shortcut is used to paste text in Word Processing software?',
    options: ['Ctrl + C', 'Ctrl + V', 'Ctrl + X', 'Ctrl + Z'],
    correctOptionIndex: 1,
    explanation: 'Ctrl + V is the universal shortcut key for pasting clipboard content.',
  );

  final sampleFailedResult = TestResultModel(
    clientEventId: 'test-fail-1',
    testId: 'PRAC_FAIL_1',
    testMode: TestMode.practice,
    questionBankVersion: '1.0.0',
    blueprintVersion: '1.0.0',
    totalQuestions: 25,
    correctCount: 8,
    wrongCount: 17,
    score: 8,
    wrongQuestionIds: const ['q1'],
    studentAnswers: const {'q1': 0},
    completedAt: DateTime(2026, 10, 15, 4, 15),
    timeTakenSeconds: 725,
    subject: 'Word Processing and Document Management Fundamentals',
    topicCode: 'WORD',
  );

  final samplePassedResult = TestResultModel(
    clientEventId: 'test-pass-1',
    testId: 'EXAM_PASS_1',
    testMode: TestMode.exam,
    questionBankVersion: '1.0.0',
    blueprintVersion: '1.0.0',
    totalQuestions: 50,
    correctCount: 42,
    wrongCount: 8,
    score: 42,
    wrongQuestionIds: const [],
    completedAt: DateTime(2026, 10, 15, 3, 30),
    timeTakenSeconds: 1650,
    subject: 'MS-CIT Final Mock Comprehensive Examination',
  );

  Widget buildDetailTestWidget({
    required TestResultModel result,
    required QuestionBankRepository questionBank,
  }) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<QuestionBankRepository>.value(value: questionBank),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<LocaleCubit>(create: (_) => LocaleCubit(const Locale('en'))),
        ],
        child: MaterialApp(
          localizationsDelegates: const [
            AppLocalizationsDelegate(),
          ],
          home: ResultDetailScreen(
            result: result,
            questionBank: questionBank,
            questions: const [sampleQuestion],
          ),
        ),
      ),
    );
  }

  Widget buildHistoryTestWidget({
    required ResultsRepository resultsRepository,
    required ResultsCubit resultsCubit,
    required QuestionBankRepository questionBank,
  }) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ResultsRepository>.value(value: resultsRepository),
        RepositoryProvider<QuestionBankRepository>.value(value: questionBank),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<LocaleCubit>(create: (_) => LocaleCubit(const Locale('en'))),
          BlocProvider<ResultsCubit>.value(value: resultsCubit),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppLocalizationsDelegate(),
          ],
          home: ResultsHistoryScreen(),
        ),
      ),
    );
  }

  group('ResultDetailScreen - Layout and Overflow Tests', () {
    testWidgets('renders cleanly on narrow mobile viewport (360x800) with Needs Practice without overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final questionBank = QuestionBankRepository([sampleQuestion]);

      await tester.pumpWidget(buildDetailTestWidget(
        result: sampleFailedResult,
        questionBank: questionBank,
      ));
      await tester.pumpAndSettle();

      // Assert zero overflow / RenderFlex exceptions
      expect(tester.takeException(), isNull);

      // Verify header, score, and badges exist
      expect(find.text('Score Report'), findsOneWidget);
      expect(find.text('8'), findsWidgets);
      expect(find.text('NEEDS PRACTICE'), findsWidgets);
      expect(find.text('•  Min 40% Required'), findsOneWidget);

      // Scroll through content
      await tester.drag(find.text('Score Report'), const Offset(0, -400));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('renders cleanly on extra-narrow mobile viewport (320x640) without overflow', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final questionBank = QuestionBankRepository([sampleQuestion]);

      await tester.pumpWidget(buildDetailTestWidget(
        result: sampleFailedResult,
        questionBank: questionBank,
      ));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('NEEDS PRACTICE'), findsWidgets);
    });
  });

  group('ResultsHistoryScreen - Layout and Overflow Tests', () {
    testWidgets('renders results history cards cleanly on narrow mobile viewport without overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final repo = ResultsRepository();
      await repo.saveResult(sampleFailedResult);
      await repo.saveResult(samplePassedResult);

      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      final questionBank = QuestionBankRepository([sampleQuestion]);

      await tester.pumpWidget(buildHistoryTestWidget(
        resultsRepository: repo,
        resultsCubit: cubit,
        questionBank: questionBank,
      ));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);

      // Verify cards render both Passed and Needs Practice
      expect(find.text('PASSED'), findsWidgets);
      expect(find.text('NEEDS PRACTICE'), findsWidgets);
    });
  });
}
