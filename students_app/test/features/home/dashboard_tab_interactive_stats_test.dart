import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/localization/app_localizations.dart';
import 'package:student_app/core/localization/locale_cubit.dart';
import 'package:student_app/features/auth/models/student_identity.dart';
import 'package:student_app/features/broadcasts/cubit/broadcast_cubit.dart';
import 'package:student_app/features/broadcasts/repository/broadcast_repository.dart';
import 'package:student_app/features/home/tabs/dashboard_tab.dart';
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

  Widget buildDashboardHarness({
    required ResultsRepository resultsRepo,
    required ResultsCubit resultsCubit,
  }) {
    final questionBank = QuestionBankRepository([]);
    final testGenerator = TestGenerator(questionBank);
    final broadcastRepo = BroadcastRepository(Dio());
    final broadcastCubit = BroadcastCubit(broadcastRepo);

    const testIdentity = StudentIdentity(
      authUserId: 'u1',
      name: 'Rushi Student',
      email: 'rushi@example.com',
      roles: ['STUDENT'],
    );

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ResultsRepository>.value(value: resultsRepo),
        RepositoryProvider<QuestionBankRepository>.value(value: questionBank),
        RepositoryProvider<TestGenerator>.value(value: testGenerator),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<LocaleCubit>(create: (_) => LocaleCubit(const Locale('en'))),
          BlocProvider<ResultsCubit>.value(value: resultsCubit),
          BlocProvider<BroadcastCubit>.value(value: broadcastCubit),
        ],
        child: MaterialApp(
          localizationsDelegates: const [
            AppLocalizationsDelegate(),
          ],
          home: Scaffold(
            body: DashboardTab(
              identity: testIdentity,
              testGenerator: testGenerator,
              questionBank: questionBank,
              resultsRepository: resultsRepo,
              onNavigateToTab: (_) {},
            ),
          ),
        ),
      ),
    );
  }

  group('Task 2: DashboardTab Interactive Statistics Card', () {
    testWidgets('tapping analytics banner on stats card navigates to PerformanceSummaryScreen and back', (tester) async {
      final repo = ResultsRepository();

      final r1 = TestResultModel(
        clientEventId: 'test-1',
        testId: 'EXAM_1',
        testMode: TestMode.exam,
        questionBankVersion: '1.0.0',
        blueprintVersion: '1.0.0',
        totalQuestions: 25,
        correctCount: 20,
        wrongCount: 5,
        score: 20,
        wrongQuestionIds: const ['q1', 'q2', 'q3', 'q4', 'q5'],
        completedAt: DateTime(2026, 10, 10, 10, 0),
        timeTakenSeconds: 600,
        subject: 'MS-CIT Comprehensive Exam',
      );
      await repo.saveResult(r1);

      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      await tester.pumpWidget(buildDashboardHarness(
        resultsRepo: repo,
        resultsCubit: cubit,
      ));
      await tester.pumpAndSettle();

      // Find statistics card CTA banner
      expect(find.text('View Detailed Performance Analytics'), findsOneWidget);
      expect(find.text('Tests Taken'), findsOneWidget);

      // Tap the Analytics CTA banner
      await tester.tap(find.text('View Detailed Performance Analytics'));
      await tester.pumpAndSettle();

      // Verify we navigated to PerformanceSummaryScreen
      expect(find.byType(PerformanceSummaryScreen), findsOneWidget);
      expect(find.text('Performance Analytics'), findsOneWidget);
      expect(find.text('OVERALL PERFORMANCE'), findsOneWidget);

      // Tap Back button to return to Home
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();

      // Verify we returned cleanly to DashboardTab with zero state loss
      expect(find.byType(PerformanceSummaryScreen), findsNothing);
      expect(find.byType(DashboardTab), findsOneWidget);
      expect(find.text('View Detailed Performance Analytics'), findsOneWidget);
    });

    testWidgets('tapping Tests Taken stat card navigates to PerformanceSummaryScreen', (tester) async {
      final repo = ResultsRepository();
      final cubit = ResultsCubit(repo);
      await cubit.loadResults(refreshFromCloud: false);

      await tester.pumpWidget(buildDashboardHarness(
        resultsRepo: repo,
        resultsCubit: cubit,
      ));
      await tester.pumpAndSettle();

      // Tap Tests Taken stat card
      await tester.tap(find.text('Tests Taken'));
      await tester.pumpAndSettle();

      // Navigated to PerformanceSummaryScreen
      expect(find.byType(PerformanceSummaryScreen), findsOneWidget);
    });
  });
}
