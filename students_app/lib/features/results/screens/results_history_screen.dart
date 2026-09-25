import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/scale_press.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../cubit/results_cubit.dart';
import '../models/test_result_model.dart';
import 'result_detail_screen.dart';

class ResultsHistoryScreen extends StatefulWidget {
  const ResultsHistoryScreen({super.key});

  @override
  State<ResultsHistoryScreen> createState() => _ResultsHistoryScreenState();
}

class _ResultsHistoryScreenState extends State<ResultsHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<ResultsCubit>().loadResults();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('history_title')),
      ),
      body: BlocBuilder<ResultsCubit, ResultsState>(
        builder: (context, state) {
          if (state is ResultsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ResultsError) {
            return Center(
              child: Text(
                state.message,
                style: GoogleFonts.inter(color: AppColors.googleRed),
              ),
            );
          }

          final resultsState = state is ResultsLoaded ? state : null;
          final stats = resultsState?.stats;
          final results = resultsState?.filteredResults ?? [];

          return RefreshIndicator(
            onRefresh: () => context.read<ResultsCubit>().loadResults(),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
              children: [
                // Top Summary Card
                if (stats != null)
                  FrostedCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    elevation: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.text('history_summary'),
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          children: [
                            Expanded(
                              child: _StatColumn(
                                label: l10n.text('history_total_tests'),
                                value: '${stats.totalTests}',
                                color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                              ),
                            ),
                            Container(
                              height: 32,
                              width: 1,
                              color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                            ),
                            Expanded(
                              child: _StatColumn(
                                label: l10n.text('history_avg_score'),
                                value: '${stats.averageScore.toStringAsFixed(1)}%',
                                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                              ),
                            ),
                            Container(
                              height: 32,
                              width: 1,
                              color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                            ),
                            Expanded(
                              child: _StatColumn(
                                label: l10n.text('history_pass_rate'),
                                value: '${stats.passRate.toStringAsFixed(0)}%',
                                color: AppColors.googleGreen,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: AppSpacing.md),

                // Filter Chips
                Row(
                  children: [
                    _GoogleFilterChip(
                      label: 'All (${resultsState?.results.length ?? 0})',
                      isSelected: resultsState?.filterMode == 'ALL' || resultsState?.filterMode == null,
                      onTap: () => context.read<ResultsCubit>().setFilter('ALL'),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _GoogleFilterChip(
                      label: 'Exams (${stats?.examCount ?? 0})',
                      isSelected: resultsState?.filterMode == 'EXAM',
                      onTap: () => context.read<ResultsCubit>().setFilter('EXAM'),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _GoogleFilterChip(
                      label: 'Practice (${stats?.practiceCount ?? 0})',
                      isSelected: resultsState?.filterMode == 'PRACTICE',
                      onTap: () => context.read<ResultsCubit>().setFilter('PRACTICE'),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),

                // Results List
                if (results.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxxl),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.assignment_outlined,
                            size: 48,
                            color: isDark ? AppColors.darkTextSecondary : const Color(0xFFBDC1C6),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            l10n.text('no_records'),
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            l10n.text('no_records_desc'),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...results.map((r) => _ResultHistoryCard(result: r)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w500,
            color: color,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w400,
            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _GoogleFilterChip extends StatelessWidget {
  const _GoogleFilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ScalePress(
      onTap: onTap,
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        showCheckmark: false,
        selectedColor: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
        backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
        side: BorderSide(
          color: isSelected
              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
              : (isDark ? AppColors.darkBorder : AppColors.borderLight),
          width: 1,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        labelStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
          color: isSelected
              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
              : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
        ),
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _ResultHistoryCard extends StatelessWidget {
  const _ResultHistoryCard({required this.result});

  final TestResultModel result;

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final year = local.year;
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month/$year  $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isExam = result.testMode.code == 'EXAM';
    final questionBank = context.read<QuestionBankRepository>();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ScalePress(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ResultDetailScreen(
                result: result,
                questionBank: questionBank,
              ),
            ),
          );
        },
        child: FrostedCard(
          padding: const EdgeInsets.all(AppSpacing.md),
          elevation: 1,
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isExam
                          ? (isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface)
                          : (isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      result.testMode.label,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isExam
                            ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                            : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    _formatDate(result.completedAt),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  _SyncBadge(status: result.syncStatus),
                ],
              ),
              const SizedBox(height: AppSpacing.sm + 2),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            '${result.score} / ${result.totalQuestions}',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '(${(result.percentage).toInt()}%)',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: result.isPassed ? AppColors.googleGreen : AppColors.googleRed,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${result.correctCount} Correct • ${result.wrongCount} Wrong',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: result.isPassed
                          ? (isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface)
                          : (isDark ? const Color(0xFF3C1816) : AppColors.googleRedSurface),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: (result.isPassed ? AppColors.googleGreen : AppColors.googleRed)
                            .withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      result.isPassed ? 'PASSED' : 'NEEDS PRACTICE',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: result.isPassed ? AppColors.googleGreen : AppColors.googleRed,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SyncBadge extends StatelessWidget {
  const _SyncBadge({required this.status});

  final SyncStatus status;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color color;
    IconData icon;
    String label;

    switch (status) {
      case SyncStatus.synced:
        color = AppColors.googleGreen;
        icon = Icons.check_circle_outline;
        label = 'Synced';
        break;
      case SyncStatus.syncing:
        color = isDark ? AppColors.darkBluePrimary : AppColors.googleBlue;
        icon = Icons.sync;
        label = 'Syncing';
        break;
      case SyncStatus.pending:
        color = AppColors.googleYellow;
        icon = Icons.cloud_queue;
        label = 'Pending';
        break;
      case SyncStatus.failed:
        color = AppColors.googleRed;
        icon = Icons.error_outline;
        label = 'Failed';
        break;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: color,
          ),
        ),
      ],
    );
  }
}
