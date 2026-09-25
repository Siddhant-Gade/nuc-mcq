import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/localization/app_localizations.dart';
import '../core/localization/locale_cubit.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/theme_cubit.dart';
import '../features/auth/cubit/auth_cubit.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/unauthorized_screen.dart';
import '../features/bookmarks/cubit/bookmarks_cubit.dart';
import '../features/bookmarks/repository/bookmarks_repository.dart';
import '../features/broadcasts/cubit/broadcast_cubit.dart';
import '../features/broadcasts/repository/broadcast_repository.dart';
import '../features/home/home_shell.dart';
import '../features/question_bank/repository/question_bank_repository.dart';
import '../features/results/cubit/results_cubit.dart';
import '../features/results/repository/results_repository.dart';
import '../core/services/push_notification_service.dart';
import '../features/study_materials/repository/study_materials_repository.dart';
import '../features/study_materials/screens/study_materials_screen.dart';
import '../features/sync/cubit/sync_cubit.dart';
import '../features/sync/repository/sync_repository.dart';
import '../features/test_engine/services/test_generator.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// Root Application widget providing theming, localization and routing.
class StudentApp extends StatefulWidget {
  const StudentApp({
    super.key,
    required this.authCubit,
    required this.broadcastRepository,
    required this.questionBankRepository,
    required this.testGenerator,
    required this.resultsRepository,
    required this.studyMaterialsRepository,
    required this.syncRepository,
    required this.bookmarksRepository,
  });

  final AuthCubit authCubit;
  final BroadcastRepository broadcastRepository;
  final QuestionBankRepository questionBankRepository;
  final TestGenerator testGenerator;
  final ResultsRepository resultsRepository;
  final StudyMaterialsRepository studyMaterialsRepository;
  final SyncRepository syncRepository;
  final BookmarksRepository bookmarksRepository;

  @override
  State<StudentApp> createState() => _StudentAppState();
}

class _StudentAppState extends State<StudentApp> {
  @override
  void initState() {
    super.initState();
    _setupNotificationHandling();
  }

  void _setupNotificationHandling() {
    PushNotificationService.instance.onNotificationTap = (data) {
      _handleNotificationPayload(data);
    };

    // Check if app was opened from terminated state
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final initialMessage = await PushNotificationService.instance.getInitialMessage();
      if (initialMessage != null && initialMessage.data.isNotEmpty) {
        _handleNotificationPayload(initialMessage.data);
      }
    });
  }

  Future<void> _handleNotificationPayload(Map<String, dynamic> data) async {
    final type = data['type']?.toString();
    final materialId = data['materialId']?.toString();

    debugPrint('[StudentApp] Handling notification payload: type=$type, materialId=$materialId');

    if (type == 'AUTHORIZATION') {
      // Refresh auth status
      widget.authCubit.refreshStatus();
    } else if (type == 'STUDY_MATERIAL' && materialId != null && materialId.isNotEmpty) {
      // Fetch material and display the reader modal sheet
      try {
        final materials = await widget.studyMaterialsRepository.getAllMaterials();
        final match = materials.where((m) => m.id == materialId).firstOrNull;
        final navContext = rootNavigatorKey.currentContext;
        if (match != null && navContext != null && navContext.mounted) {
          StudyMaterialsScreen.openReaderModal(navContext, match, widget.studyMaterialsRepository);
        }
      } catch (e) {
        debugPrint('[StudentApp] Deep-link error opening material: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: widget.questionBankRepository),
        RepositoryProvider.value(value: widget.testGenerator),
        RepositoryProvider.value(value: widget.resultsRepository),
        RepositoryProvider.value(value: widget.studyMaterialsRepository),
        RepositoryProvider.value(value: widget.syncRepository),
        RepositoryProvider.value(value: widget.broadcastRepository),
        RepositoryProvider.value(value: widget.bookmarksRepository),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider.value(value: widget.authCubit),
          BlocProvider(create: (_) => ThemeCubit()),
          BlocProvider(create: (_) => LocaleCubit()),
          BlocProvider(create: (_) => BookmarksCubit(widget.bookmarksRepository)),
          BlocProvider(create: (_) => ResultsCubit(widget.resultsRepository)..loadResults()),
          BlocProvider(create: (_) => SyncCubit(widget.syncRepository)),
          BlocProvider(create: (_) => BroadcastCubit(widget.broadcastRepository)..load()),
        ],
        child: BlocBuilder<LocaleCubit, Locale>(
          builder: (context, locale) {
            return BlocBuilder<ThemeCubit, ThemeMode>(
              builder: (context, themeMode) {
                return MaterialApp(
                  navigatorKey: rootNavigatorKey,
                  title: 'MSCIT Student - New Unique Computers',
                  debugShowCheckedModeBanner: false,
                  theme: AppTheme.lightTheme,
                  darkTheme: AppTheme.darkTheme,
                  themeMode: themeMode,
                  locale: locale,
                  supportedLocales: AppLocalizations.supportedLocales,
                  localizationsDelegates: const [
                    AppLocalizationsDelegate(),
                    GlobalMaterialLocalizations.delegate,
                    GlobalWidgetsLocalizations.delegate,
                    GlobalCupertinoLocalizations.delegate,
                  ],
                  home: _AuthGate(broadcastRepository: widget.broadcastRepository),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate({required this.broadcastRepository});

  final BroadcastRepository broadcastRepository;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthCubit, AuthState>(
      builder: (context, state) {
        final Widget child = switch (state) {
          AuthUnknown() || AuthChecking() => const _SplashScreen(key: ValueKey('splash')),
          AuthSigningIn() || AuthUnauthenticated() => const LoginScreen(key: ValueKey('login')),
          AuthUnauthorized(:final identity) => UnauthorizedScreen(key: const ValueKey('unauthorized'), identity: identity),
          AuthAuthenticated(:final identity) => HomeShell(
              key: const ValueKey('home'),
              identity: identity,
              broadcastRepository: broadcastRepository,
            ),
        };

        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) {
            return FadeTransition(opacity: animation, child: child);
          },
          child: child,
        );
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          color: AppColors.googleBlue,
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.school_rounded, size: 64, color: Colors.white),
              SizedBox(height: 16),
              Text(
                'New Unique Computers',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 24),
              CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
