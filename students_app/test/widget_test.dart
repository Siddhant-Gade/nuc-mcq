import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/app/student_app.dart';
import 'package:student_app/features/auth/cubit/auth_cubit.dart';
import 'package:student_app/features/auth/repository/auth_repository.dart';
import 'package:student_app/features/bookmarks/repository/bookmarks_repository.dart';
import 'package:student_app/features/broadcasts/repository/broadcast_repository.dart';
import 'package:student_app/features/question_bank/repository/question_bank_repository.dart';
import 'package:student_app/features/results/repository/results_repository.dart';
import 'package:student_app/features/study_materials/repository/study_materials_repository.dart';
import 'package:student_app/features/sync/repository/sync_repository.dart';
import 'package:student_app/features/test_engine/services/test_generator.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('StudentApp smoke test builds Login screen', (WidgetTester tester) async {
    final dio = Dio();
    final authRepository = AuthRepository(dio: dio);
    final broadcastRepository = BroadcastRepository(dio);
    final questionBankRepository = QuestionBankRepository();
    final bookmarksRepository = BookmarksRepository();
    final testGenerator = TestGenerator(questionBankRepository);
    final resultsRepository = ResultsRepository();
    final studyMaterialsRepository = StudyMaterialsRepository();
    final syncRepository = SyncRepository(resultsRepository: resultsRepository, dio: dio);
    final authCubit = AuthCubit(authRepository);

    await authCubit.restoreSession();

    await tester.pumpWidget(
      StudentApp(
        authCubit: authCubit,
        broadcastRepository: broadcastRepository,
        bookmarksRepository: bookmarksRepository,
        questionBankRepository: questionBankRepository,
        testGenerator: testGenerator,
        resultsRepository: resultsRepository,
        studyMaterialsRepository: studyMaterialsRepository,
        syncRepository: syncRepository,
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('New Unique Computers'), findsOneWidget);
    expect(find.text('Sign in with Google'), findsOneWidget);
    expect(find.text('Request Student Access'), findsOneWidget);

    await tester.tap(find.text('Request Student Access'));
    await tester.pumpAndSettle();

    expect(find.text('MS-CIT Institute Authorization Portal'), findsOneWidget);
    expect(find.text('Submit Request'), findsOneWidget);
  });
}
