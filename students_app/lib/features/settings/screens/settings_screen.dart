import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_cubit.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../../auth/models/student_identity.dart';
import '../../broadcasts/cubit/broadcast_cubit.dart';
import '../../broadcasts/repository/broadcast_repository.dart';
import '../../broadcasts/screens/broadcasts_screen.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/cubit/results_cubit.dart';
import '../../sync/cubit/sync_cubit.dart';
import '../../test_engine/services/test_generator.dart';
import '../../../core/services/app_badge_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    super.key,
    required this.identity,
    required this.broadcastRepository,
  });

  final StudentIdentity identity;
  final BroadcastRepository broadcastRepository;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final currentLocale = context.watch<LocaleCubit>().state.languageCode;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('settings_title')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Student Profile Header Card
            FrostedCard(
              padding: const EdgeInsets.all(AppSpacing.lg),
              elevation: 1,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: isDark
                        ? AppColors.darkBlueSurface
                        : AppColors.googleBlueSurface,
                    child: Text(
                      (identity.email?.isNotEmpty == true)
                          ? identity.email![0].toUpperCase()
                          : 'S',
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          identity.email ?? 'student@unique.com',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          l10n.text('course_name'),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppColors.googleGreen.withOpacity(0.3)),
                    ),
                    child: Text(
                      l10n.text('status_enrolled'),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.googleGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (identity.batchId != null || identity.batchName != null) ...[
              const SizedBox(height: AppSpacing.lg),
              Text(
                l10n.text('my_batch_title'),
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              FrostedCard(
                padding: const EdgeInsets.all(AppSpacing.md),
                elevation: 1,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Icon(
                        Icons.groups_2_outlined,
                        color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            identity.batchName ?? identity.batchId!,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            identity.batchId != null ? 'Batch ID: ${identity.batchId}' : 'Enrolled Batch',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: AppColors.googleGreen.withOpacity(0.3)),
                      ),
                      child: const Text(
                        'ASSIGNED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.googleGreen,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),

            // Appearance & Theme Switcher
            Text(
              l10n.text('appearance_title'),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ScalePress(
              onTap: () => context.read<ThemeCubit>().toggleTheme(),
              child: FrostedCard(
                padding: const EdgeInsets.all(AppSpacing.md),
                elevation: 1,
                child: Row(
                  children: [
                    AnimatedSwitcher(
                      duration: AppAnim.normal,
                      transitionBuilder: (child, animation) {
                        return RotationTransition(
                          turns: animation,
                          child: child,
                        );
                      },
                      child: Icon(
                        isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                        key: ValueKey(isDark),
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isDark ? l10n.text('theme_dark') : l10n.text('theme_light'),
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            isDark ? 'Tap to switch to Light Theme' : 'Tap to switch to Dark Theme',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Language Selection
            Text(
              l10n.text('language_title'),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            FrostedCard(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              elevation: 1,
              child: Column(
                children: [
                  _LanguageOptionTile(
                    title: 'English',
                    subtitle: 'Default English UI',
                    isSelected: currentLocale == 'en',
                    onTap: () => context.read<LocaleCubit>().setLocale('en'),
                  ),
                  _LanguageOptionTile(
                    title: 'मराठी (Marathi)',
                    subtitle: 'मराठी भाषा इंटरफेस',
                    isSelected: currentLocale == 'mr',
                    onTap: () => context.read<LocaleCubit>().setLocale('mr'),
                  ),
                  _LanguageOptionTile(
                    title: 'हिंदी (Hindi)',
                    subtitle: 'हिंदी भाषा इंटरफेस',
                    isSelected: currentLocale == 'hi',
                    onTap: () => context.read<LocaleCubit>().setLocale('hi'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Institute Notices & Announcements Section
            Text(
              l10n.text('notices_title'),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            BlocBuilder<BroadcastCubit, BroadcastState>(
              builder: (context, state) {
                final unreadCount = state is BroadcastsLoaded ? state.unreadCount : 0;
                return ScalePress(
                  onTap: () {
                    context.read<BroadcastCubit>().markAllAsSeen();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const BroadcastsScreen(),
                      ),
                    );
                  },
                  child: FrostedCard(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    elevation: 1,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(9),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Icon(
                            Icons.campaign_outlined,
                            color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Notice Board',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                'View institute announcements & updates',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w400,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (unreadCount > 0) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.googleRed,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$unreadCount New',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        const Icon(Icons.chevron_right_rounded, size: 20),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xl),

            // Cloud Sync & Data Manager
            Text(
              'Cloud Synchronization',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            FrostedCard(
              padding: const EdgeInsets.all(AppSpacing.md),
              elevation: 1,
              child: Column(
                children: [
                  BlocBuilder<ResultsCubit, ResultsState>(
                    builder: (context, state) {
                      final stats = state is ResultsLoaded ? state.stats : null;
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Pending Sync Tests',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            '${stats?.pendingSyncCount ?? 0} record(s)',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  BlocBuilder<SyncCubit, SyncState>(
                    builder: (context, syncState) {
                      final isSyncing = syncState is SyncInProgress;
                      return Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFE8F0FE),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Row(
                          children: [
                            isSyncing
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Icon(
                                    Icons.cloud_done_rounded,
                                    size: 18,
                                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                                  ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                isSyncing
                                    ? 'Synchronizing records with institute server...'
                                    : 'Automatic sync is active whenever internet is connected.',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // About Application
            Text(
              l10n.text('about_title'),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const FrostedCard(
              padding: EdgeInsets.all(AppSpacing.md),
              elevation: 1,
              child: Column(
                children: [
                  _SpecRow(label: 'Institute', value: 'New Unique Computers'),
                  _SpecRow(label: 'Curriculum', value: 'MS-CIT Authorized'),
                  _SpecRow(label: 'App Version', value: '1.0.0'),
                  _SpecRow(label: 'Question Bank', value: 'v${QuestionBankRepository.version} (Offline)'),
                  _SpecRow(label: 'Exam Blueprint', value: 'v${TestGenerator.currentBlueprintVersion} (25 Questions)'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Notification Badge Test
            Text(
              'Notification Badge Test',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            FrostedCard(
              padding: const EdgeInsets.all(AppSpacing.md),
              elevation: 1,
              child: Row(
                children: [
                  Expanded(
                    child: RoyalButton(
                      text: 'Set Badge (5)',
                      icon: Icons.notifications_active_outlined,
                      onPressed: () async {
                        await AppBadgeService.instance.updateBadge(5);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Badge counter set to 5! Check your home screen.')),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: RoyalButton(
                      text: 'Clear Badge',
                      icon: Icons.notifications_off_outlined,
                      isSecondary: true,
                      onPressed: () async {
                        await AppBadgeService.instance.removeBadge();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Badge counter cleared!')),
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Sign Out
            RoyalButton(
              text: l10n.text('btn_sign_out'),
              icon: Icons.logout_rounded,
              isSecondary: true,
              onPressed: () {
                context.read<AuthCubit>().signOut();
              },
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }
}

class _LanguageOptionTile extends StatelessWidget {
  const _LanguageOptionTile({
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
            fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
            color: isSelected
                ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                : null,
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

class _SpecRow extends StatelessWidget {
  const _SpecRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
