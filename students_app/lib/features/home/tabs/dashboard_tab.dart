import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/scale_press.dart';
import '../../auth/models/student_identity.dart';
import '../../broadcasts/cubit/broadcast_cubit.dart';
import '../../broadcasts/screens/broadcasts_screen.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../question_bank/screens/all_questions_screen.dart';
import '../../results/cubit/results_cubit.dart';
import '../../results/repository/results_repository.dart';
import '../../results/screens/performance_summary_screen.dart';
import '../../test_engine/cubit/test_engine_cubit.dart';
import '../../test_engine/screens/test_screen.dart';
import '../../test_engine/services/test_generator.dart';

/// Design tokens specifically tailored for the modern EdTech Student Dashboard.
class _DashboardPalette {
  _DashboardPalette._();

  static const Color primaryBlue = Color(0xFF087FAE);
  static const Color primaryBlueDark = Color(0xFF066287);
  static const Color primaryBlueLight = Color(0xFFEBF6FA);
  static const Color deepNavy = Color(0xFF172B4D);
  static const Color pageBg = Color(0xFFF4F7FB);
  static const Color cardWhite = Colors.white;
  static const Color textSecondary = Color(0xFF64748B);
  static const Color successGreen = Color(0xFF18845B);
  static const Color successGreenSurface = Color(0xFFEDF8F2);
  static const Color accentAmber = Color(0xFFE8A23A);
  static const Color accentAmberSurface = Color(0xFFFEF7EB);
  static const Color borderLight = Color(0xFFE2E8F0);

  // Dark Mode Tokens
  static const Color darkPageBg = Color(0xFF121214);
  static const Color darkCard = Color(0xFF18181B);
  static const Color darkBorder = Color(0xFF2E2E33);
  static const Color darkTextPrimary = Color(0xFFF4F4F5);
  static const Color darkTextSecondary = Color(0xFFA1A1AA);
}

/// Redesigned Student Home Dashboard.
///
/// Built for MS-CIT learners with a clean, high-contrast EdTech UI,
/// responsive layout (mobile, tablet, desktop), compact learning statistics,
/// and clear primary learning actions.
class DashboardTab extends StatefulWidget {
  const DashboardTab({
    super.key,
    required this.identity,
    required this.testGenerator,
    required this.questionBank,
    required this.resultsRepository,
    required this.onNavigateToTab,
  });

  final StudentIdentity identity;
  final TestGenerator testGenerator;
  final QuestionBankRepository questionBank;
  final ResultsRepository resultsRepository;
  final ValueChanged<int> onNavigateToTab;

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _isLaunchingExam = false;

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _getFirstName() {
    final name = widget.identity.name;
    if (name != null && name.trim().isNotEmpty) {
      return name.trim().split(' ').first;
    }
    final email = widget.identity.email;
    if (email == null || email.isEmpty) return 'Student';
    final fallback = email.split('@').first;
    if (fallback.isEmpty || fallback.toLowerCase().startsWith('prn')) {
      return 'Student';
    }
    return fallback[0].toUpperCase() + fallback.substring(1);
  }

  Future<void> _handleStartMockExam() async {
    if (_isLaunchingExam) return;
    setState(() => _isLaunchingExam = true);

    try {
      final test = widget.testGenerator.generateExamTest();
      final cubit = TestEngineCubit(
        test: test,
        resultsRepository: widget.resultsRepository,
      );
      await Navigator.push(context, TestScreen.route(cubit));
    } finally {
      if (mounted) {
        setState(() => _isLaunchingExam = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = _getFirstName();

    return Scaffold(
      backgroundColor: isDark
          ? _DashboardPalette.darkPageBg
          : _DashboardPalette.pageBg,
      body: RefreshIndicator(
        color: _DashboardPalette.primaryBlue,
        onRefresh: () async {
          await context.read<ResultsCubit>().loadResults();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1040),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.lg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Section A: Greeting & Welcome
                    _buildGreetingHeader(context, firstName, isDark),
                    const SizedBox(height: AppSpacing.md),

                    // Section B: Latest Institute Announcement (omitted if empty)
                    _buildAnnouncementSection(isDark),

                    

                    // Section D: Primary Learning Actions
                    _buildPrimaryActionsSection(context, isDark),
                    const SizedBox(height: AppSpacing.xl),

                    // Section E: Quick Shortcuts
                    _buildQuickShortcutsSection(context, isDark),
                    const SizedBox(height: AppSpacing.xxl),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // SECTION A: Greeting & Welcome
  // ==========================================
  Widget _buildGreetingHeader(
    BuildContext context,
    String firstName,
    bool isDark,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 600;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_getGreeting()}${firstName.isNotEmpty ? ', $firstName' : ''}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: isCompact ? 22 : 26,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.4,
                color: isDark
                    ? _DashboardPalette.darkTextPrimary
                    : _DashboardPalette.deepNavy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Continue your MS-CIT preparation and build your skills.',
              style: GoogleFonts.inter(
                fontSize: isCompact ? 13 : 14,
                fontWeight: FontWeight.w400,
                color: isDark
                    ? _DashboardPalette.darkTextSecondary
                    : _DashboardPalette.textSecondary,
              ),
            ),
          ],
        );
      },
    );
  }

  // ==========================================
  // SECTION B: Latest Institute Announcement
  // ==========================================
  Widget _buildAnnouncementSection(bool isDark) {
    return BlocBuilder<BroadcastCubit, BroadcastState>(
      builder: (context, state) {
        if (state is! BroadcastsLoaded || state.broadcasts.isEmpty) {
          return const SizedBox.shrink();
        }
        final latest = state.broadcasts.first;

        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: ScalePress(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BroadcastsScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF261D12)
                    : const Color(0xFFFFF9ED),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF5A3E16)
                      : const Color(0xFFFCE1B6),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF3D2A14)
                          : const Color(0xFFFDE8C4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.campaign_rounded,
                      color: Color(0xFFD97706),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'INSTITUTE NOTICE',
                                style: GoogleFonts.inter(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.3,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                latest.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark
                                      ? _DashboardPalette.darkTextPrimary
                                      : const Color(0xFF1E293B),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          latest.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: isDark
                                ? _DashboardPalette.darkTextSecondary
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: isDark
                        ? const Color(0xFFFBBF24)
                        : const Color(0xFFD97706),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==========================================
  // SECTION C: Learning Progress & Gamification
  // ==========================================
  Widget _buildProgressSection(bool isDark) {
    return BlocBuilder<ResultsCubit, ResultsState>(
      builder: (context, state) {
        if (state is ResultsLoading) {
          return _buildLoadingProgressPlaceholder(isDark);
        }

        final stats = state is ResultsLoaded ? state.stats : null;
        final totalTests = stats?.totalTests ?? 0;
        final level = stats?.level ?? 1;
        final levelTitle = stats?.levelTitle ?? 'Novice Learner';
        final totalXp = stats?.totalXp ?? 0;
        final currentStreak = stats?.currentStreak ?? 0;
        final currentLevelXp = stats?.currentLevelXp ?? 0;
        final levelProgress = stats?.levelProgress ?? 0.0;
        final passRate = stats?.passRate ?? 0.0;
        final unlockedBadges = stats?.unlockedBadges ?? const <String>[];

        return ScalePress(
          onTap: () {
            Navigator.of(context).push(PerformanceSummaryScreen.route());
          },
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: isDark
                  ? _DashboardPalette.darkCard
                  : _DashboardPalette.cardWhite,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? _DashboardPalette.darkBorder
                    : _DashboardPalette.borderLight,
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.25 : 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Level & XP Header Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Level Badge
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFF0284C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text(
                          'L$level',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(width: 12),
                  // Level Title & XP Chip
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                levelTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: isDark
                                      ? _DashboardPalette.darkTextPrimary
                                      : _DashboardPalette.deepNavy,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2.5,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF38290E)
                                    : _DashboardPalette.accentAmberSurface,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: isDark
                                      ? const Color(0xFF6B4810)
                                      : const Color(0xFFF6D8A6),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.bolt_rounded,
                                    size: 13,
                                    color: Color(0xFFD97706),
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    '$totalXp XP',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: isDark
                                          ? const Color(0xFFFBBF24)
                                          : const Color(0xFFB45309),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          totalTests > 0
                              ? 'Level $level • Next unlock at ${stats?.xpForNextLevel ?? 150} XP'
                              : 'Take your first test to earn XP and level up!',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: isDark
                                ? _DashboardPalette.darkTextSecondary
                                : _DashboardPalette.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E3A8A).withOpacity(0.4) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDark ? const Color(0xFF2563EB).withOpacity(0.5) : const Color(0xFFBFDBFE),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Analytics',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 14,
                          color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Level Progress Bar
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Level $level Progress',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? _DashboardPalette.darkTextSecondary
                              : const Color(0xFF475569),
                        ),
                      ),
                      Text(
                        '$currentLevelXp / 150 XP',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? const Color(0xFF38BDF8)
                              : _DashboardPalette.primaryBlue,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: levelProgress,
                      minHeight: 7,
                      backgroundColor: isDark
                          ? const Color(0xFF1E293B)
                          : const Color(0xFFEEF2F6),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        _DashboardPalette.primaryBlue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Compact Statistics Cards
              LayoutBuilder(
                builder: (context, constraints) {
                  return Row(
                    children: [
                      Expanded(
                        child: _buildStatItem(
                          label: 'Tests Taken',
                          value: '$totalTests',
                          icon: Icons.assignment_turned_in_outlined,
                          iconColor: _DashboardPalette.primaryBlue,
                          bgColor: isDark
                              ? const Color(0xFF0C243B)
                              : _DashboardPalette.primaryBlueLight,
                          isDark: isDark,
                          onTap: () => Navigator.of(context).push(PerformanceSummaryScreen.route()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildStatItem(
                          label: 'Pass Rate',
                          value: totalTests > 0
                              ? '${passRate.toStringAsFixed(0)}%'
                              : '—',
                          icon: Icons.verified_outlined,
                          iconColor: _DashboardPalette.successGreen,
                          bgColor: isDark
                              ? const Color(0xFF0B2E1E)
                              : _DashboardPalette.successGreenSurface,
                          isDark: isDark,
                          onTap: () => Navigator.of(context).push(PerformanceSummaryScreen.route()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildStatItem(
                          label: 'Day Streak',
                          value: '$currentStreak',
                          icon: Icons.local_fire_department_rounded,
                          iconColor: currentStreak > 0
                              ? _DashboardPalette.accentAmber
                              : const Color(0xFF94A3B8),
                          bgColor: currentStreak > 0
                              ? (isDark
                                    ? const Color(0xFF38290E)
                                    : _DashboardPalette.accentAmberSurface)
                              : (isDark
                                    ? const Color(0xFF1E293B)
                                    : const Color(0xFFF1F5F9)),
                          isDark: isDark,
                          onTap: () => Navigator.of(context).push(PerformanceSummaryScreen.route()),
                        ),
                      ),
                    ],
                  );
                },
              ),

              // Earned Achievement Badges (wrapping layout to prevent horizontal overflow)
              if (unlockedBadges.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Divider(
                  height: 1,
                  thickness: 1,
                  color: Color(0xFFF1F5F9),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.military_tech_rounded,
                      size: 16,
                      color: Color(0xFFD97706),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Earned Achievements',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? _DashboardPalette.darkTextSecondary
                            : const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: unlockedBadges.map((badge) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1E293B)
                            : const Color(0xFFFEF9EE),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isDark
                              ? const Color(0xFF475569)
                              : const Color(0xFFFCD34D),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        badge,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? const Color(0xFFFBBF24)
                              : const Color(0xFF92400E),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],

              // Interactive CTA banner to detailed analytics
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF1E3A8A).withOpacity(0.35)
                      : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark
                        ? const Color(0xFF2563EB).withOpacity(0.5)
                        : const Color(0xFFBFDBFE),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.insights_rounded,
                          size: 16,
                          color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'View Detailed Performance Analytics',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                          ),
                        ),
                      ],
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 12,
                      color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
  }

  Widget _buildLoadingProgressPlaceholder(bool isDark) {
    return Container(
      height: 180,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? _DashboardPalette.darkCard
            : _DashboardPalette.cardWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? _DashboardPalette.darkBorder
              : _DashboardPalette.borderLight,
        ),
      ),
      child: const Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: _DashboardPalette.primaryBlue,
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required bool isDark,
    VoidCallback? onTap,
  }) {
    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF18243C) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? const Color(0xFF273854) : const Color(0xFFEEF2F6),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(icon, size: 14, color: iconColor),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isDark
                          ? _DashboardPalette.darkTextSecondary
                          : _DashboardPalette.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark
                    ? _DashboardPalette.darkTextPrimary
                    : _DashboardPalette.deepNavy,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION D: Primary Learning Actions
  // ==========================================
  Widget _buildPrimaryActionsSection(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Start Learning',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
            color: isDark
                ? _DashboardPalette.darkTextPrimary
                : _DashboardPalette.deepNavy,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 640;

            final practiceCard = _buildPracticeQuestionsCard(context, isDark);
            final mockExamCard = _buildMockExamCard(context, isDark);

            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: practiceCard),
                  const SizedBox(width: 16),
                  Expanded(child: mockExamCard),
                ],
              );
            }

            return Column(
              children: [
                practiceCard,
                const SizedBox(height: 12),
                mockExamCard,
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildPracticeQuestionsCard(BuildContext context, bool isDark) {
    return ScalePress(
      onTap: () => widget.onNavigateToTab(1),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isDark
              ? _DashboardPalette.darkCard
              : _DashboardPalette.cardWhite,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? _DashboardPalette.darkBorder
                : _DashboardPalette.borderLight,
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.25 : 0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF0C243B)
                        : _DashboardPalette.primaryBlueLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.auto_stories_rounded,
                    color: _DashboardPalette.primaryBlue,
                    size: 24,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1E293B)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'PRACTICE',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: isDark
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Practice Questions',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark
                    ? _DashboardPalette.darkTextPrimary
                    : _DashboardPalette.deepNavy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Practice topics and improve your knowledge with instant feedback.',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: isDark
                    ? _DashboardPalette.darkTextSecondary
                    : _DashboardPalette.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  'Start Practice',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _DashboardPalette.primaryBlue,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.arrow_forward_rounded,
                  size: 16,
                  color: _DashboardPalette.primaryBlue,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMockExamCard(BuildContext context, bool isDark) {
    return ScalePress(
      onTap: _isLaunchingExam ? null : _handleStartMockExam,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF131722) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFF334155),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.4 : 0.15),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF334155), width: 0.8),
                  ),
                  child: const Icon(
                    Icons.play_circle_filled_rounded,
                    color: Color(0xFF38BDF8),
                    size: 24,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF38290E),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF78350F), width: 0.8),
                  ),
                  child: Text(
                    'OFFICIAL SIMULATION',
                    style: GoogleFonts.inter(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: const Color(0xFFFBBF24),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Take Mock Exam',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '25 Questions • 30 Mins • Real MS-CIT GCC-TBC Pattern',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: const Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isLaunchingExam)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: _DashboardPalette.primaryBlue,
                        ),
                      )
                    else ...[
                      Text(
                        'Start Mock Exam',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: _DashboardPalette.primaryBlueDark,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.play_arrow_rounded,
                        size: 18,
                        color: _DashboardPalette.primaryBlueDark,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // SECTION E: Quick Shortcuts
  // ==========================================
  Widget _buildQuickShortcutsSection(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Shortcuts',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
            color: isDark
                ? _DashboardPalette.darkTextPrimary
                : _DashboardPalette.deepNavy,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 500;
            final count = widget.questionBank.totalCount;

            final qbCard = _buildShortcutCard(
              context: context,
              title: 'Question Bank',
              subtitle: count > 0
                  ? '$count Practice Questions'
                  : 'Browse practice questions',
              icon: Icons.quiz_outlined,
              iconColor: const Color(0xFF7C3AED),
              iconBgColor: isDark
                  ? const Color(0xFF2E1065).withOpacity(0.5)
                  : const Color(0xFFF3E8FF),
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AllQuestionsScreen()),
                );
              },
            );

            final notesCard = _buildShortcutCard(
              context: context,
              title: 'Study Notes',
              subtitle: 'Shortcuts, Guides & Tips',
              icon: Icons.menu_book_rounded,
              iconColor: const Color(0xFFD97706),
              iconBgColor: isDark
                  ? const Color(0xFF38290E)
                  : const Color(0xFFFEF3C7),
              isDark: isDark,
              onTap: () => widget.onNavigateToTab(2),
            );

            if (isWide) {
              return Row(
                children: [
                  Expanded(child: qbCard),
                  const SizedBox(width: 14),
                  Expanded(child: notesCard),
                ],
              );
            }

            return Column(
              children: [qbCard, const SizedBox(height: 10), notesCard],
            );
          },
        ),
      ],
    );
  }

  Widget _buildShortcutCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark
              ? _DashboardPalette.darkCard
              : _DashboardPalette.cardWhite,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? _DashboardPalette.darkBorder
                : _DashboardPalette.borderLight,
            width: 1.1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? _DashboardPalette.darkTextPrimary
                          : _DashboardPalette.deepNavy,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: isDark
                          ? _DashboardPalette.darkTextSecondary
                          : _DashboardPalette.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
          ],
        ),
      ),
    );
  }
}
