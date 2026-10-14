import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/localization/app_localizations.dart';
import 'package:student_app/core/localization/locale_cubit.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/results/cubit/results_cubit.dart';
import 'package:student_app/features/results/models/test_result_model.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/results/screens/performance_summary_screen.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget buildTestWidget({
    required ResultsRepository resultsRepository,
    required ResultsCubit resultsCubit,
  }) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ResultsRepository>.value(value: resultsRepository),
        RepositoryProvider<QuestionBankRepository>(
          create: (_) => QuestionBankRepository([]),
        ),
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
          home: PerformanceSummaryScreen(),
        ),
      ),
    );
  }

  group('PerformanceSummaryScreen - Widget Tests', () {
    testWidgets('renders empty state when no test results exist', (tester) async {
      final repo = ResultsRepository();
      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      await tester.pumpWidget(buildTestWidget(
        resultsRepository: repo,
        resultsCubit: cubit,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Performance Analytics'), findsOneWidget);
      expect(find.text('No Analytics Available'), findsOneWidget);
    });

    testWidgets('renders all analytics sections and charts with loaded test results', (tester) async {
      final repo = ResultsRepository();

      final r1 = TestResultModel(
        clientEventId: 'test-1',
        testId: 'PRAC_1',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 10,
        correctCount: 6,
        wrongCount: 4,
        score: 6,
        wrongQuestionIds: const ['q1', 'q2', 'q3', 'q4'],
        completedAt: DateTime(2026, 10, 5, 10, 0),
        timeTakenSeconds: 300,
        subject: 'Word Processing',
        topicCode: 'WORD',
      );

      final r2 = TestResultModel(
        clientEventId: 'test-2',
        testId: 'EXAM_1',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 20,
        wrongCount: 5,
        score: 20,
        wrongQuestionIds: const ['q5', 'q6', 'q7', 'q8', 'q9'],
        completedAt: DateTime(2026, 10, 10, 11, 0),
        timeTakenSeconds: 900,
        subject: 'MS-CIT Comprehensive Exam',
      );

      await repo.saveResult(r1);
      await repo.saveResult(r2);

      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      await tester.pumpWidget(buildTestWidget(
        resultsRepository: repo,
        resultsCubit: cubit,
      ));
      await tester.pumpAndSettle();

      // Header and Filters
      expect(find.text('Performance Analytics'), findsOneWidget);
      expect(find.text('All (2)'), findsOneWidget);
      expect(find.text('Exams (1)'), findsOneWidget);
      expect(find.text('Practice (1)'), findsOneWidget);

      // Section A: Overall Performance
      expect(find.text('OVERALL PERFORMANCE'), findsOneWidget);
      expect(find.text('70.0%'), findsOneWidget); // Avg score: (60 + 80) / 2 = 70.0%
      expect(find.text('80.0%'), findsOneWidget); // Best score: 80%

      // Section D: Progress Insights
      expect(find.text('PROGRESS & IMPROVEMENT'), findsOneWidget);

      // Section B: Performance Over Time (Line Chart)
      expect(find.text('PERFORMANCE OVER TIME'), findsOneWidget);
      expect(find.text('2 Attempts'), findsOneWidget);

      // Section C: Subject-wise Performance
      expect(find.text('SUBJECT-WISE PERFORMANCE'), findsOneWidget);
      expect(find.text('MS Word'), findsWidgets);
      expect(find.text('MS-CIT Comprehensive Exam'), findsWidgets);

      // Section E: Recent Attempts
      expect(find.text('RECENT TEST ATTEMPTS'), findsOneWidget);

      // Switch Filter to 'Exams (1)'
      await tester.tap(find.text('Exams (1)'));
      await tester.pumpAndSettle();

      // Average score is now only for Exam: 80.0%
      expect(find.text('80.0%'), findsWidgets);
    });

    testWidgets('renders cleanly on narrow mobile viewports without any layout overflow', (tester) async {
      // Set physical size to a narrow mobile device (360 x 800 dp at 1.0 device pixel ratio)
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final repo = ResultsRepository();

      final r1 = TestResultModel(
        clientEventId: 'test-overflow-1',
        testId: 'PRAC_LONG_1',
        testMode: TestMode.practice,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 15,
        correctCount: 5,
        wrongCount: 10,
        score: 5,
        wrongQuestionIds: const ['q1', 'q2'],
        completedAt: DateTime(2026, 10, 5, 10, 0),
        timeTakenSeconds: 300,
        subject: 'Information Technology & Computer Fundamental Concepts',
        topicCode: 'IT_CONCEPTS',
      );

      final r2 = TestResultModel(
        clientEventId: 'test-overflow-2',
        testId: 'EXAM_LONG_2',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 50,
        correctCount: 45,
        wrongCount: 5,
        score: 45,
        wrongQuestionIds: const ['q3'],
        completedAt: DateTime(2026, 10, 10, 11, 0),
        timeTakenSeconds: 1500,
        subject: 'MS-CIT Final Mock Examination and Assessment',
      );

      await repo.saveResult(r1);
      await repo.saveResult(r2);

      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      await tester.pumpWidget(buildTestWidget(
        resultsRepository: repo,
        resultsCubit: cubit,
      ));
      await tester.pumpAndSettle();

      // Assert no exceptions (e.g., RenderFlex overflow) were thrown during layout or render
      expect(tester.takeException(), isNull);

      // Verify sections are present
      expect(find.text('OVERALL PERFORMANCE'), findsOneWidget);
      expect(find.text('SUBJECT-WISE PERFORMANCE'), findsOneWidget);
      expect(find.text('PROGRESS & IMPROVEMENT'), findsOneWidget);

      // Verify both Pass and Needs Practice badges exist without overflow
      expect(find.text('Pass (>=50%)'), findsOneWidget);
      expect(find.text('Needs Practice (<50%)'), findsOneWidget);

      // Scroll down to ensure bottom sections also layout without overflow
      await tester.drag(find.text('OVERALL PERFORMANCE'), const Offset(0, -400));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
