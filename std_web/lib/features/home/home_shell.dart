import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/services/push_notification_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_cubit.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
import '../auth/cubit/auth_cubit.dart';
import '../auth/models/student_identity.dart';
import '../bookmarks/cubit/bookmarks_cubit.dart';
import '../bookmarks/screens/bookmarks_screen.dart';
import '../broadcasts/cubit/broadcast_cubit.dart';
import '../broadcasts/repository/broadcast_repository.dart';
import '../broadcasts/screens/broadcasts_screen.dart';
import '../question_bank/repository/question_bank_repository.dart';
import '../question_bank/screens/all_questions_screen.dart';
import '../results/cubit/results_cubit.dart';
import '../results/repository/results_repository.dart';
import '../results/screens/results_history_screen.dart';
import '../settings/screens/settings_screen.dart';
import '../study_materials/repository/study_materials_repository.dart';
import '../study_materials/screens/study_materials_screen.dart';
import '../sync/cubit/sync_cubit.dart';
import '../test_engine/services/test_generator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/tests_tab.dart';

/// Clean, uncluttered 4-tab Student Home Shell with Left Hamburger Menu Drawer.
class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.identity,
    required this.broadcastRepository,
  });

  final StudentIdentity identity;
  final BroadcastRepository broadcastRepository;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;
  bool _hasUnreadNotes = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        // Automatic on-login / on-launch background data synchronization & notices refresh
        context.read<SyncCubit>().syncNow();
        context.read<BroadcastCubit>().load();
        PushNotificationService.instance.syncTokenWithBackend();
        _checkStudyMaterialsIndicator();
      }
    });
  }

  Future<void> _checkStudyMaterialsIndicator() async {
    try {
      final repo = context.read<StudyMaterialsRepository>();
      final materials = await repo.getAllMaterials();
      final prefs = await SharedPreferences.getInstance();
      final lastCount = prefs.getInt('last_seen_notes_count') ?? 0;

      if (materials.length > lastCount) {
        if (mounted) {
          setState(() {
            _hasUnreadNotes = true;
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _markNotesAsSeen() async {
    try {
      final repo = context.read<StudyMaterialsRepository>();
      final materials = await repo.getAllMaterials();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('last_seen_notes_count', materials.length);
      if (mounted) {
        setState(() {
          _hasUnreadNotes = false;
        });
      }
    } catch (_) {}
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
    if (index == 2) {
      _markNotesAsSeen();
    }
  }

  void _showLanguageSelector(BuildContext context) {
    final cubit = context.read<LocaleCubit>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select Language',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _LanguageTile(
                title: 'English',
                subtitle: 'Default English UI',
                isSelected: cubit.state.languageCode == 'en',
                onTap: () {
                  cubit.setLocale('en');
                  Navigator.of(sheetCtx).pop();
                },
              ),
              _LanguageTile(
                title: 'मराठी (Marathi)',
                subtitle: 'मराठी भाषा इंटरफेस',
                isSelected: cubit.state.languageCode == 'mr',
                onTap: () {
                  cubit.setLocale('mr');
                  Navigator.of(sheetCtx).pop();
                },
              ),
              _LanguageTile(
                title: 'हिंदी (Hindi)',
                subtitle: 'हिंदी भाषा इंटरफेस',
                isSelected: cubit.state.languageCode == 'hi',
                onTap: () {
                  cubit.setLocale('hi');
                  Navigator.of(sheetCtx).pop();
                },
              ),
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final questionBank = context.read<QuestionBankRepository>();
    final testGenerator = context.read<TestGenerator>();
    final resultsRepository = context.read<ResultsRepository>();
    final studyMaterialsRepo = context.read<StudyMaterialsRepository>();

    final pages = [
      DashboardTab(
        identity: widget.identity,
        testGenerator: testGenerator,
        questionBank: questionBank,
        resultsRepository: resultsRepository,
        onNavigateToTab: _onTabSelected,
      ),
      TestsTab(
        testGenerator: testGenerator,
        questionBank: questionBank,
        resultsRepository: resultsRepository,
      ),
      StudyMaterialsScreen(repository: studyMaterialsRepo),
      const ResultsHistoryScreen(),
    ];

    final activeColor = isDark ? AppColors.darkBluePrimary : AppColors.googleBlue;
    final isWide = MediaQuery.of(context).size.width >= 768;

    return BlocListener<SyncCubit, SyncState>(
      listener: (context, syncState) {
        if (syncState is SyncCompleted) {
          context.read<ResultsCubit>().loadResults();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          // Left-side Hamburger Menu Button
          leading: Builder(
            builder: (scaffoldContext) {
              return ScalePress(
                onTap: () {
                  Scaffold.of(scaffoldContext).openDrawer();
                },
                child: Padding(
                  padding: const EdgeInsets.only(left: 8.0),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    child: Icon(
                      Icons.menu_rounded,
                      size: 24,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                ),
              );
            },
          ),
          title: Row(
            children: [
              Semantics(
                button: true,
                label: 'Home',
                child: Tooltip(
                  message: 'Home',
                  child: ScalePress(
                    onTap: () {
                      if (_currentIndex != 0) {
                        _onTabSelected(0);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Icon(
                        Icons.school_outlined,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (_currentIndex != 0) {
                      _onTabSelected(0);
                    }
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'New Unique Computers',
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.3,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'MS-CIT Authorized',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          actions: [
            if (isWide) ...[
              _DesktopNavTab(
                title: l10n.text('tab_home'),
                icon: Icons.home_rounded,
                isSelected: _currentIndex == 0,
                onTap: () => _onTabSelected(0),
                isDark: isDark,
                activeColor: activeColor,
              ),
              const SizedBox(width: 4),
              _DesktopNavTab(
                title: l10n.text('tab_tests'),
                icon: Icons.assignment_rounded,
                isSelected: _currentIndex == 1,
                onTap: () => _onTabSelected(1),
                isDark: isDark,
                activeColor: activeColor,
              ),
              const SizedBox(width: 4),
              _DesktopNavTab(
                title: l10n.text('tab_notes'),
                icon: Icons.menu_book_rounded,
                isSelected: _currentIndex == 2,
                hasBadge: _hasUnreadNotes,
                onTap: () => _onTabSelected(2),
                isDark: isDark,
                activeColor: activeColor,
              ),
              const SizedBox(width: 4),
              _DesktopNavTab(
                title: l10n.text('tab_results'),
                icon: Icons.insights_rounded,
                isSelected: _currentIndex == 3,
                onTap: () => _onTabSelected(3),
                isDark: isDark,
                activeColor: activeColor,
              ),
              const SizedBox(width: 16),
            ],
            // Notifications with badge
            BlocBuilder<BroadcastCubit, BroadcastState>(
              builder: (context, state) {
                final unreadCount = state is BroadcastsLoaded ? state.unreadCount : 0;
                return ScalePress(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const BroadcastsScreen(),
                      ),
                    );
                  },
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Padding(
                        padding: EdgeInsets.all(10.0),
                        child: Icon(Icons.notifications_outlined, size: 22),
                      ),
                      if (unreadCount > 0)
                        Positioned(
                          right: 4,
                          top: 4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                            decoration: BoxDecoration(
                              color: AppColors.googleRed,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                unreadCount > 99 ? '99+' : '$unreadCount',
                                style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  height: 1.0,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
            // Language Switcher
            ScalePress(
              onTap: () => _showLanguageSelector(context),
              child: const Padding(
                padding: EdgeInsets.only(right: 12.0, left: 4.0),
                child: Icon(Icons.translate_rounded, size: 22),
              ),
            ),
          ],
        ),
        // Standard Left-side Drawer
        drawer: _StudentProfileSettingsDrawer(
          identity: widget.identity,
          broadcastRepository: widget.broadcastRepository,
          onShowLanguageSelector: () => _showLanguageSelector(context),
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
        bottomNavigationBar: isWide ? null : Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            border: Border(
              top: BorderSide(
                color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                width: 1,
              ),
            ),
          ),
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: _onTabSelected,
            backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
            elevation: 0,
            indicatorColor: isDark
                ? AppColors.darkBlueSurface
                : AppColors.googleBlueSurface,
            indicatorShape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.home_outlined, size: 24),
                selectedIcon: Icon(Icons.home_rounded, color: activeColor, size: 24),
                label: l10n.text('tab_home'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.assignment_outlined, size: 24),
                selectedIcon: Icon(Icons.assignment_rounded, color: activeColor, size: 24),
                label: l10n.text('tab_tests'),
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: _hasUnreadNotes,
                  backgroundColor: AppColors.googleRed,
                  smallSize: 8,
                  child: const Icon(Icons.menu_book_outlined, size: 24),
                ),
                selectedIcon: Badge(
                  isLabelVisible: _hasUnreadNotes,
                  backgroundColor: AppColors.googleRed,
                  smallSize: 8,
                  child: Icon(Icons.menu_book_rounded, color: activeColor, size: 24),
                ),
                label: l10n.text('tab_notes'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.insights_outlined, size: 24),
                selectedIcon: Icon(Icons.insights_rounded, color: activeColor, size: 24),
                label: l10n.text('tab_results'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Slide-over Profile & Settings Drawer on the left side.
class _StudentProfileSettingsDrawer extends StatelessWidget {
  const _StudentProfileSettingsDrawer({
    required this.identity,
    required this.broadcastRepository,
    required this.onShowLanguageSelector,
  });

  final StudentIdentity identity;
  final BroadcastRepository broadcastRepository;
  final VoidCallback onShowLanguageSelector;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final themeCubit = context.watch<ThemeCubit>();
    final currentLocale = context.watch<LocaleCubit>().state.languageCode;

    return Drawer(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header with Close & Title
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.text('drawer_profile_title'),
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  // Student Profile Card
                  FrostedCard(
                    padding: const EdgeInsets.all(14),
                    elevation: 1,
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: isDark
                              ? AppColors.darkBlueSurface
                              : AppColors.googleBlueSurface,
                          child: Text(
                            (identity.email?.isNotEmpty == true)
                                ? identity.email![0].toUpperCase()
                                : 'S',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                identity.email ?? 'student@unique.com',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                l10n.text('course_name'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            l10n.text('status_enrolled'),
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.googleGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // My Batch Card (if enrolled)
                  if (identity.batchId != null || identity.batchName != null) ...[
                    const SizedBox(height: 12),
                    FrostedCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      elevation: 1,
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Icon(
                              Icons.groups_2_outlined,
                              size: 20,
                              color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l10n.text('my_batch_title'),
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  identity.batchName ?? identity.batchId!,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (identity.batchId != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                identity.batchId!,
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Quick Navigation
                  Text(
                    l10n.text('drawer_quick_links'),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // All Questions Bank Shortcut
                  _DrawerNavTile(
                    icon: Icons.menu_book_rounded,
                    iconColor: AppColors.googleBlue,
                    title: l10n.text('all_questions_title'),
                    subtitle: 'Browse all 8 syllabus topics & questions',
                    onTap: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const AllQuestionsScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 6),

                  // Bookmarks Shortcut
                  BlocBuilder<BookmarksCubit, BookmarksState>(
                    builder: (context, state) {
                      return _DrawerNavTile(
                        icon: Icons.bookmark_rounded,
                        iconColor: AppColors.googleYellow,
                        title: l10n.text('tab_bookmarks'),
                        subtitle: state.materialCount > 0
                            ? '${state.questionCount} questions • ${state.materialCount} materials'
                            : '${state.questionCount} saved questions for practice',
                        badgeText: state.count > 0 ? '${state.count}' : null,
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const BookmarksScreen(),
                            ),
                          );
                        },
                      );
                    },
                  ),
                  const SizedBox(height: 6),

                  // Notice Board Shortcut
                  BlocBuilder<BroadcastCubit, BroadcastState>(
                    builder: (context, state) {
                      final unreadCount = state is BroadcastsLoaded ? state.unreadCount : 0;
                      return _DrawerNavTile(
                        icon: Icons.campaign_outlined,
                        iconColor: AppColors.googleRed,
                        title: l10n.text('notices_title'),
                        subtitle: 'Announcements from Institute',
                        badgeText: unreadCount > 0 ? '$unreadCount New' : null,
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const BroadcastsScreen(),
                            ),
                          );
                        },
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // Appearance & Preferences
                  Text(
                    l10n.text('appearance_title'),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  FrostedCard(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    elevation: 1,
                    child: Column(
                      children: [
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(
                            isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                            color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                            size: 20,
                          ),
                          title: Text(
                            isDark ? l10n.text('theme_dark') : l10n.text('theme_light'),
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          trailing: Switch.adaptive(
                            value: isDark,
                            activeColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                            onChanged: (_) => themeCubit.toggleTheme(),
                          ),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.translate_rounded, size: 20),
                          title: Text(
                            l10n.text('language_title'),
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            currentLocale == 'mr'
                                ? 'मराठी'
                                : (currentLocale == 'hi' ? 'हिंदी' : 'English'),
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                          ),
                          trailing: const Icon(Icons.chevron_right_rounded, size: 20),
                          onTap: onShowLanguageSelector,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Full Settings Screen Navigation
                  _DrawerNavTile(
                    icon: Icons.settings_outlined,
                    iconColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                    title: l10n.text('settings_title'),
                    subtitle: 'Account details and preferences',
                    onTap: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => SettingsScreen(
                            identity: identity,
                            broadcastRepository: broadcastRepository,
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // Sign Out Button
                  RoyalButton(
                    text: l10n.text('btn_sign_out'),
                    icon: Icons.logout_rounded,
                    isSecondary: true,
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.read<AuthCubit>().signOut();
                    },
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerNavTile extends StatelessWidget {
  const _DrawerNavTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.badgeText,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String? badgeText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ScalePress(
      onTap: onTap,
      child: FrostedCard(
        padding: const EdgeInsets.all(12),
        elevation: 1,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (badgeText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badgeText!,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                  ),
                ),
              ),
              const SizedBox(width: 6),
            ],
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ScalePress(
      onTap: onTap,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4),
        dense: true,
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
            color: isSelected
                ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
          ),
        ),
        subtitle: Text(
          subtitle,
          style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
        ),
        trailing: isSelected
            ? Icon(
                Icons.check_circle_rounded,
                color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                size: 20,
              )
            : null,
      ),
    );
  }
}

class _DesktopNavTab extends StatelessWidget {
  const _DesktopNavTab({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
    required this.isDark,
    required this.activeColor,
    this.hasBadge = false,
  });

  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isDark;
  final Color activeColor;
  final bool hasBadge;

  @override
  Widget build(BuildContext context) {
    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: isSelected
              ? Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.googleBlue.withOpacity(0.2),
                )
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Badge(
              isLabelVisible: hasBadge,
              backgroundColor: AppColors.googleRed,
              smallSize: 8,
              child: Icon(
                icon,
                size: 18,
                color: isSelected
                    ? activeColor
                    : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? activeColor
                    : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

