import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/student_app.dart';
import 'core/api/api_client.dart';
import 'core/config/app_config.dart';
import 'core/services/push_notification_service.dart';
import 'features/auth/cubit/auth_cubit.dart';
import 'features/auth/repository/auth_repository.dart';
import 'features/bookmarks/repository/bookmarks_repository.dart';
import 'features/broadcasts/repository/broadcast_repository.dart';
import 'features/question_bank/repository/question_bank_repository.dart';
import 'features/results/repository/results_repository.dart';
import 'features/study_materials/repository/study_materials_repository.dart';
import 'features/sync/repository/sync_repository.dart';
import 'features/test_engine/services/test_generator.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Allow bundled Inter fonts from local assets
  GoogleFonts.config.allowRuntimeFetching = true;

  final config = AppConfig.fromEnvironment();
  final questionBankRepository = QuestionBankRepository();

  SupabaseClient? supabase;

  // 1. Parallelize startup tasks concurrently
  await Future.wait([
    // A. Supabase initialization
    () async {
      if (config.supabaseUrl.isNotEmpty && config.supabasePublicKey.isNotEmpty) {
        try {
          await Supabase.initialize(
            url: config.supabaseUrl,
            publishableKey: config.supabasePublicKey,
          );
          supabase = Supabase.instance.client;
        } catch (e) {
          debugPrint('[Supabase] Init notice: $e');
        }
      }
    }(),

    // B. Offline/Local Question Bank cache loading from SharedPreferences or bundled JSON
    questionBankRepository.loadFromCache(),
  ]);

  // API Client with Supabase JWT bearer token
  final dio = createApiClient(config, () => supabase?.auth.currentSession?.accessToken);

  // Initialize core domain repositories
  final authRepository = AuthRepository(supabase: supabase, dio: dio);
  final broadcastRepository = BroadcastRepository(dio);
  final bookmarksRepository = BookmarksRepository();
  final testGenerator = TestGenerator(questionBankRepository);
  final resultsRepository = ResultsRepository(dio: dio);
  final studyMaterialsRepository = StudyMaterialsRepository(dio: dio);
  final syncRepository = SyncRepository(resultsRepository: resultsRepository, dio: dio);

  final authCubit = AuthCubit(authRepository)..restoreSession();

  // Run web notification service init asynchronously in background
  PushNotificationService.instance.init(dio: dio).catchError((e) {
    debugPrint('[PushNotificationService] Web init notice: $e');
  });

  runApp(
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
}
