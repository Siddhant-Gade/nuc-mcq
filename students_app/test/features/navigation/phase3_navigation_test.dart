import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/localization/locale_cubit.dart';
import 'package:student_app/features/bookmarks/cubit/bookmarks_cubit.dart';
import 'package:student_app/features/bookmarks/repository/bookmarks_repository.dart';
import 'package:student_app/features/bookmarks/screens/bookmarks_screen.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/question_bank/screens/all_questions_screen.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/study_materials/repository/study_materials_repository.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget buildTestableWidget(Widget child) {
    final bookmarksRepo = BookmarksRepository();
    final qbRepo = QuestionBankRepository();
    final materialsRepo = StudyMaterialsRepository();
    final resultsRepo = ResultsRepository();
    final testGen = TestGenerator(qbRepo);

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: bookmarksRepo),
        RepositoryProvider.value(value: qbRepo),
        RepositoryProvider.value(value: materialsRepo),
        RepositoryProvider.value(value: resultsRepo),
        RepositoryProvider.value(value: testGen),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(create: (_) => LocaleCubit()),
          BlocProvider(create: (_) => BookmarksCubit(bookmarksRepo)),
        ],
        child: MaterialApp(
          home: child,
        ),
      ),
    );
  }

  group('Phase 3 - Bookmarks & Question Bank Verification', () {
    testWidgets('BookmarksScreen does NOT have misplaced Question Bank / All Questions button', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const BookmarksScreen()));
      await tester.pumpAndSettle();

      // Verify screen title is Saved Bookmarks
      expect(find.text('Saved Bookmarks'), findsOneWidget);

      // Verify empty state for questions
      expect(find.text('No Bookmarked Questions'), findsOneWidget);

      // Verify there is NO misplaced "All Questions" button in Bookmarks
      expect(find.widgetWithText(ElevatedButton, 'All Questions'), findsNothing);
      expect(find.text('All Questions'), findsNothing);

      // Verify Question/Notes tabs exist
      expect(find.textContaining('Questions (0)'), findsOneWidget);
      expect(find.textContaining('Notes (0)'), findsOneWidget);
    });

    testWidgets('AllQuestionsScreen is a dedicated Question Bank screen without TabBar', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const AllQuestionsScreen()));
      await tester.pumpAndSettle();

      // Verify screen title is Question Bank
      expect(find.text('Question Bank'), findsOneWidget);

      // Verify there is NO TabBar
      expect(find.byType(TabBar), findsNothing);
      expect(find.byType(TabBarView), findsNothing);
    });
  });
}
