import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_cubit.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../../auth/models/student_identity.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/cubit/results_cubit.dart';
import '../../sync/cubit/sync_cubit.dart';
import '../../test_engine/services/test_generator.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.identity,
  });

  final StudentIdentity identity;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = context.watch<ThemeCubit>().state;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Student Profile Header Card (Google Account style)
            FrostedCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: isDark
                        ? AppColors.darkBlueSurface
                        : AppColors.googleBlueSurface,
                    child: Text(
                      (identity.name?.isNotEmpty == true)
                          ? identity.name![0].toUpperCase()
                          : ((identity.email?.isNotEmpty == true)
                              ? identity.email![0].toUpperCase()
                              : 'S'),
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          identity.name ?? (identity.email ?? 'Student'),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          identity.studentId != null
                              ? 'PRN: ${identity.studentId} • MS-CIT Enrolled'
                              : 'MS-CIT Enrolled Student',
                          style: TextStyle(
                            fontSize: 12,
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
                      'ACTIVE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.googleGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // My Batch section — only show if batchId is known
            if (identity.batchId != null) ...[
              Text(
                'My Batch',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              FrostedCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    _SpecRow(label: 'Batch ID', value: identity.batchId!),
                    if (identity.batchName != null)
                      _SpecRow(label: 'Batch Name', value: identity.batchName!),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Theme Settings
            Text(
              'Appearance',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            FrostedCard(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Light Theme'),
                    subtitle: const Text('Google minimalist white with blue accents'),
                    leading: Radio<ThemeMode>(
                      value: ThemeMode.light,
                      groupValue: themeMode,
                      activeColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      onChanged: (mode) {
                        if (mode != null) context.read<ThemeCubit>().setLightMode();
                      },
                    ),
                    onTap: () => context.read<ThemeCubit>().setLightMode(),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Dark Theme'),
                    subtitle: const Text('Google Dark mode for low-light environments'),
                    leading: Radio<ThemeMode>(
                      value: ThemeMode.dark,
                      groupValue: themeMode,
                      activeColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      onChanged: (mode) {
                        if (mode != null) context.read<ThemeCubit>().setDarkMode();
                      },
                    ),
                    onTap: () => context.read<ThemeCubit>().setDarkMode(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Data & Cloud Sync
            Text(
              'Data & Sync',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            FrostedCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  BlocBuilder<ResultsCubit, ResultsState>(
                    builder: (context, state) {
                      final stats = state is ResultsLoaded ? state.stats : null;
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Pending Sync Tests'),
                          Text(
                            '${stats?.pendingSyncCount ?? 0} record(s)',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  BlocConsumer<SyncCubit, SyncState>(
                    listener: (context, syncState) {
                      if (syncState is SyncCompleted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Sync complete: ${syncState.summary.syncedCount} synced, ${syncState.summary.failedCount} failed',
                            ),
                            backgroundColor: syncState.summary.hasErrors
                                ? AppColors.googleYellow
                                : AppColors.googleGreen,
                          ),
                        );
                        context.read<ResultsCubit>().loadResults();
                      }
                    },
                    builder: (context, syncState) {
                      final isSyncing = syncState is SyncInProgress;
                      return RoyalButton(
                        text: 'Sync Results Now',
                        icon: Icons.cloud_sync_outlined,
                        isLoading: isSyncing,
                        onPressed: () => context.read<SyncCubit>().syncNow(),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Institute Info
            Text(
              'About Application',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const FrostedCard(
              padding: EdgeInsets.all(14),
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
            const SizedBox(height: 20),

            // Sign Out
            RoyalButton(
              text: 'Sign Out Account',
              icon: Icons.logout_rounded,
              isSecondary: true,
              onPressed: () {
                context.read<AuthCubit>().signOut();
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
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
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
