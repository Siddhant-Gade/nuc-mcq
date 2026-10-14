import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/scale_press.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../cubit/results_cubit.dart';
import '../models/performance_analytics_data.dart';
import '../models/test_result_model.dart';
import 'result_detail_screen.dart';

/// Screen presenting comprehensive, server-backed student performance analytics.
/// Visualizes score trends over time, subject mastery, progress insights, and recent attempts.
class PerformanceSummaryScreen extends StatefulWidget {
  const PerformanceSummaryScreen({super.key});

  static Route<void> route() {
    return MaterialPageRoute(
      builder: (_) => const PerformanceSummaryScreen(),
      settings: const RouteSettings(name: '/performance-analytics'),
    );
  }

  @override
  State<PerformanceSummaryScreen> createState() => _PerformanceSummaryScreenState();
}

class _PerformanceSummaryScreenState extends State<PerformanceSummaryScreen> {
  String _filterMode = 'ALL'; // 'ALL', 'EXAM', 'PRACTICE'
  int? _selectedAttemptIndex;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final questionBank = context.read<QuestionBankRepository>();

    final bgColor = isDark ? AppColors.darkBg : const Color(0xFFF8FAFC);
    final cardBg = isDark ? AppColors.darkSurface : Colors.white;
    final borderColor = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final primaryTextColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secondaryTextColor = isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text(
          l10n.text('analytics_title'),
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
            color: primaryTextColor,
          ),
        ),
        centerTitle: false,
        backgroundColor: cardBg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: primaryTextColor,
          ),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.refresh_rounded,
              size: 22,
              color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
            ),
            tooltip: 'Refresh analytics',
            onPressed: () => context.read<ResultsCubit>().loadResults(),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: borderColor,
          ),
        ),
      ),
      body: BlocBuilder<ResultsCubit, ResultsState>(
        builder: (context, state) {
          if (state is ResultsLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (state is ResultsError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline_rounded, size: 48, color: Colors.red[400]),
                    const SizedBox(height: 12),
                    Text(
                      'Failed to load performance analytics',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: primaryTextColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      state.message,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, color: secondaryTextColor),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => context.read<ResultsCubit>().loadResults(),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1D4ED8),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final allResults = state is ResultsLoaded ? state.results : <TestResultModel>[];

          // Filter by selected mode
          final filteredResults = _filterMode == 'ALL'
              ? allResults
              : allResults.where((r) => r.testMode.code == _filterMode).toList();

          final analyticsData = PerformanceAnalyticsData.fromResults(
            filteredResults,
            langCode: langCode,
            questionBank: questionBank,
          );

          final examCount = allResults.where((r) => r.testMode.code == 'EXAM').length;
          final practiceCount = allResults.where((r) => r.testMode.code == 'PRACTICE').length;

          return RefreshIndicator(
            color: const Color(0xFF1D4ED8),
            onRefresh: () => context.read<ResultsCubit>().loadResults(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Subtitle Header
                      Text(
                        l10n.text('analytics_subtitle'),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: secondaryTextColor,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Filter Mode Pills
                      _buildFilterRow(
                        totalCount: allResults.length,
                        examCount: examCount,
                        practiceCount: practiceCount,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 18),

                      if (analyticsData.isEmpty)
                        _buildEmptyState(
                          isDark: isDark,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                        )
                      else ...[
                        // Section A: Overall Performance Grid
                        _buildOverallPerformanceSection(
                          data: analyticsData,
                          isDark: isDark,
                          cardBg: cardBg,
                          borderColor: borderColor,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                          l10n: l10n,
                        ),
                        const SizedBox(height: 18),

                        // Section D: Progress and Improvement Insights
                        _buildProgressInsightsSection(
                          data: analyticsData,
                          isDark: isDark,
                          cardBg: cardBg,
                          borderColor: borderColor,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                          l10n: l10n,
                        ),
                        const SizedBox(height: 18),

                        // Section B: Performance Over Time (Score Trend Line Chart)
                        _buildScoreTrendChartSection(
                          data: analyticsData,
                          isDark: isDark,
                          cardBg: cardBg,
                          borderColor: borderColor,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                          l10n: l10n,
                          questionBank: questionBank,
                          langCode: langCode,
                        ),
                        const SizedBox(height: 18),

                        // Section C: Subject-wise Performance Comparison
                        _buildSubjectPerformanceSection(
                          data: analyticsData,
                          isDark: isDark,
                          cardBg: cardBg,
                          borderColor: borderColor,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                          l10n: l10n,
                        ),
                        const SizedBox(height: 18),

                        // Section E: Recent Test Attempts Context
                        _buildRecentAttemptsSection(
                          data: analyticsData,
                          isDark: isDark,
                          cardBg: cardBg,
                          borderColor: borderColor,
                          primaryTextColor: primaryTextColor,
                          secondaryTextColor: secondaryTextColor,
                          l10n: l10n,
                          questionBank: questionBank,
                          langCode: langCode,
                        ),
                        const SizedBox(height: 24),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ==========================================
  // Filter Mode Pills Row
  // ==========================================
  Widget _buildFilterRow({
    required int totalCount,
    required int examCount,
    required int practiceCount,
    required bool isDark,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChip(
            label: 'All ($totalCount)',
            isSelected: _filterMode == 'ALL',
            isDark: isDark,
            onTap: () {
              if (_filterMode != 'ALL') {
                setState(() {
                  _filterMode = 'ALL';
                  _selectedAttemptIndex = null;
                });
              }
            },
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Exams ($examCount)',
            isSelected: _filterMode == 'EXAM',
            isDark: isDark,
            onTap: () {
              if (_filterMode != 'EXAM') {
                setState(() {
                  _filterMode = 'EXAM';
                  _selectedAttemptIndex = null;
                });
              }
            },
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Practice ($practiceCount)',
            isSelected: _filterMode == 'PRACTICE',
            isDark: isDark,
            onTap: () {
              if (_filterMode != 'PRACTICE') {
                setState(() {
                  _filterMode = 'PRACTICE';
                  _selectedAttemptIndex = null;
                });
              }
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // Empty State (No records for current filter)
  // ==========================================
  Widget _buildEmptyState({
    required bool isDark,
    required Color primaryTextColor,
    required Color secondaryTextColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.analytics_outlined,
              size: 42,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'No Analytics Available',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: primaryTextColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _filterMode == 'ALL'
                ? 'Complete an assessment or practice test to see your performance metrics and score trends.'
                : 'No $_filterMode tests recorded yet. Complete one to unlock specific analytics.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: secondaryTextColor,
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION A: Overall Performance
  // ==========================================
  Widget _buildOverallPerformanceSection({
    required PerformanceAnalyticsData data,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required AppLocalizations l10n,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            title: l10n.text('analytics_overview').toUpperCase(),
            icon: Icons.dashboard_outlined,
            isDark: isDark,
          ),
          const SizedBox(height: 16),

          // Responsive Metrics Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 440;
              final cardAvgScore = _MetricCard(
                label: l10n.text('history_avg_score'),
                value: '${data.averageScore.toStringAsFixed(1)}%',
                accentColor: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                isDark: isDark,
              );
              final cardBestScore = _MetricCard(
                label: l10n.text('analytics_best_score'),
                value: '${data.bestScore.toStringAsFixed(1)}%',
                accentColor: const Color(0xFF059669),
                isDark: isDark,
              );
              final cardAccuracy = _MetricCard(
                label: l10n.text('analytics_accuracy'),
                value: '${data.overallAccuracy.toStringAsFixed(0)}%',
                accentColor: const Color(0xFF0284C7),
                isDark: isDark,
              );
              final cardTotalTests = _MetricCard(
                label: l10n.text('history_total_tests'),
                value: '${data.totalTests}',
                subtitle: '${data.passRate.toStringAsFixed(0)}% Pass',
                accentColor: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                isDark: isDark,
              );
              final cardQuestions = _MetricCard(
                label: l10n.text('analytics_questions_answered'),
                value: '${data.totalQuestionsAnswered}',
                subtitle: '${data.totalCorrect} ✔ • ${data.totalWrong} ✘',
                accentColor: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                isDark: isDark,
              );
              final cardTotalTime = _MetricCard(
                label: l10n.text('analytics_total_time'),
                value: PerformanceAnalyticsData.formatDuration(data.totalTimeSeconds),
                subtitle: 'Avg ${PerformanceAnalyticsData.formatDuration(data.averageTimeSeconds)}',
                accentColor: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                isDark: isDark,
              );

              if (isNarrow) {
                // Responsive 2-column grid on phones (< 440px)
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: cardAvgScore),
                        const SizedBox(width: 10),
                        Expanded(child: cardBestScore),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: cardAccuracy),
                        const SizedBox(width: 10),
                        Expanded(child: cardTotalTests),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: cardQuestions),
                        const SizedBox(width: 10),
                        Expanded(child: cardTotalTime),
                      ],
                    ),
                  ],
                );
              }

              // 3-column layout on wider viewports
              return Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: cardAvgScore),
                      const SizedBox(width: 10),
                      Expanded(child: cardBestScore),
                      const SizedBox(width: 10),
                      Expanded(child: cardAccuracy),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: cardTotalTests),
                      const SizedBox(width: 10),
                      Expanded(child: cardQuestions),
                      const SizedBox(width: 10),
                      Expanded(child: cardTotalTime),
                    ],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION D: Progress & Improvement Insights
  // ==========================================
  Widget _buildProgressInsightsSection({
    required PerformanceAnalyticsData data,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required AppLocalizations l10n,
  }) {
    final hasDelta = data.scoreDelta != null;
    final deltaPositive = (data.scoreDelta ?? 0) >= 0;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            title: l10n.text('analytics_insights').toUpperCase(),
            icon: Icons.trending_up_rounded,
            isDark: isDark,
          ),
          const SizedBox(height: 14),

          // Score Trend Insight Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: hasDelta
                  ? (deltaPositive
                      ? (isDark ? const Color(0xFF064E3B).withOpacity(0.4) : const Color(0xFFECFDF5))
                      : (isDark ? const Color(0xFF7F1D1D).withOpacity(0.4) : const Color(0xFFFEF2F2)))
                  : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: hasDelta
                    ? (deltaPositive
                        ? (isDark ? const Color(0xFF059669) : const Color(0xFFA7F3D0))
                        : (isDark ? const Color(0xFFDC2626) : const Color(0xFFFECACA)))
                    : (isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  hasDelta
                      ? (deltaPositive ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded)
                      : Icons.info_outline_rounded,
                  size: 20,
                  color: hasDelta
                      ? (deltaPositive ? const Color(0xFF059669) : const Color(0xFFDC2626))
                      : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hasDelta
                            ? (deltaPositive ? 'Positive Score Progression' : 'Score Variation')
                            : 'Score Trajectory',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: hasDelta
                              ? (deltaPositive ? const Color(0xFF059669) : const Color(0xFFDC2626))
                              : primaryTextColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        data.trendDescription ?? 'Keep taking tests to observe score trends.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: secondaryTextColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Strongest vs Needs Practice Highlights
          if (data.strongestSubject != null || data.weakestSubject != null) ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final isNarrow = constraints.maxWidth < 420;

                final strongestCard = data.strongestSubject != null
                    ? Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF132A1C) : const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? const Color(0xFF166534) : const Color(0xFFBBF7D0),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.star_rounded, size: 16, color: Color(0xFF16A34A)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    l10n.text('analytics_strongest_area'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF16A34A),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              data.strongestSubject!.subjectName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: primaryTextColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${data.strongestSubject!.averageScore.toStringAsFixed(0)}% average (${data.strongestSubject!.testCount} tests)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: secondaryTextColor,
                              ),
                            ),
                          ],
                        ),
                      )
                    : null;

                final weakestCard = data.weakestSubject != null
                    ? Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2C1E1E) : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFECACA),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.bolt_rounded, size: 16, color: Color(0xFFDC2626)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    l10n.text('analytics_needs_practice'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFFDC2626),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              data.weakestSubject!.subjectName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: primaryTextColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${data.weakestSubject!.averageScore.toStringAsFixed(0)}% average (${data.weakestSubject!.testCount} tests)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: secondaryTextColor,
                              ),
                            ),
                          ],
                        ),
                      )
                    : null;

                if (isNarrow && strongestCard != null && weakestCard != null) {
                  return Column(
                    children: [
                      strongestCard,
                      const SizedBox(height: 10),
                      weakestCard,
                    ],
                  );
                }

                return Row(
                  children: [
                    if (strongestCard != null) Expanded(child: strongestCard),
                    if (strongestCard != null && weakestCard != null) const SizedBox(width: 10),
                    if (weakestCard != null) Expanded(child: weakestCard),
                  ],
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  // ==========================================
  // SECTION B: Performance Over Time (Line Chart)
  // ==========================================
  Widget _buildScoreTrendChartSection({
    required PerformanceAnalyticsData data,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required AppLocalizations l10n,
    required QuestionBankRepository questionBank,
    required String langCode,
  }) {
    final attempts = data.chronologicalAttempts;
    final selectedIndex = _selectedAttemptIndex != null && _selectedAttemptIndex! < attempts.length
        ? _selectedAttemptIndex!
        : (attempts.isNotEmpty ? attempts.length - 1 : null);

    final selectedAttempt = selectedIndex != null ? attempts[selectedIndex] : null;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildSectionHeader(
                title: l10n.text('analytics_score_trend').toUpperCase(),
                icon: Icons.show_chart_rounded,
                isDark: isDark,
              ),
              Text(
                '${attempts.length} Attempt${attempts.length != 1 ? 's' : ''}',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: secondaryTextColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Chart Legend
          Wrap(
            spacing: 16,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 14,
                    height: 3,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    l10n.text('analytics_student_score'),
                    style: GoogleFonts.inter(fontSize: 11, color: secondaryTextColor),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 14,
                    height: 2,
                    color: const Color(0xFFD97706),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    l10n.text('analytics_pass_benchmark'),
                    style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFFD97706)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Interactive Custom Painted Line Chart
          SizedBox(
            height: 200,
            child: _ScoreTrendChart(
              attempts: attempts,
              selectedIndex: selectedIndex,
              isDark: isDark,
              onSelectAttempt: (idx) {
                setState(() => _selectedAttemptIndex = idx);
              },
            ),
          ),
          const SizedBox(height: 14),

          // Selected Attempt Inspector Card (with direct link to Score Report)
          if (selectedAttempt != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: selectedAttempt.isPassed
                          ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFDCFCE7))
                          : (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFEE2E2)),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      selectedAttempt.isPassed ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 20,
                      color: selectedAttempt.isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            Text(
                              'Attempt #${selectedIndex! + 1}: ${selectedAttempt.percentage.toStringAsFixed(0)}%',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: primaryTextColor,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: selectedAttempt.testMode.code == 'EXAM'
                                    ? const Color(0xFF1D4ED8)
                                    : const Color(0xFF0D9488),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                selectedAttempt.testMode.code == 'EXAM' ? 'EXAM' : 'PRACTICE',
                                style: GoogleFonts.inter(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${selectedAttempt.getDisplaySubject(langCode: langCode, questionBank: questionBank)} • ${_formatDate(selectedAttempt.completedAt)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: secondaryTextColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ScalePress(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ResultDetailScreen(
                            result: selectedAttempt,
                            questionBank: questionBank,
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Report',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ==========================================
  // SECTION C: Subject-wise Performance Comparison
  // ==========================================
  Widget _buildSubjectPerformanceSection({
    required PerformanceAnalyticsData data,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required AppLocalizations l10n,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            title: l10n.text('analytics_subject_breakdown').toUpperCase(),
            icon: Icons.bar_chart_rounded,
            isDark: isDark,
          ),
          const SizedBox(height: 16),

          ...data.subjectMetrics.map((sm) {
            final isPassed = sm.isPassed;
            final barColor = sm.averageScore >= 75.0
                ? const Color(0xFF059669)
                : (isPassed ? const Color(0xFF1D4ED8) : const Color(0xFFDC2626));

            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Text(
                              sm.subjectName,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: primaryTextColor,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '${sm.testCount} test${sm.testCount != 1 ? 's' : ''}',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: secondaryTextColor,
                                ),
                              ),
                            ),
                            if (sm.hasLimitedData)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF38290E) : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Limited Data',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFFD97706),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${sm.averageScore.toStringAsFixed(0)}% avg',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: barColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Stack(
                    children: [
                      // Base background track
                      Container(
                        height: 8,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEEF2F6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      // Progress fill
                      FractionallySizedBox(
                        widthFactor: (sm.averageScore / 100.0).clamp(0.0, 1.0),
                        child: Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: barColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      // 50% pass benchmark indicator marker
                      Positioned(
                        left: 0,
                        right: 0,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: 0.5,
                          child: Align(
                            alignment: Alignment.centerRight,
                            child: Container(
                              width: 2,
                              height: 8,
                              color: isDark ? Colors.white54 : const Color(0xFF94A3B8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    runAlignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Text(
                        'Accuracy: ${sm.accuracy.toStringAsFixed(0)}% • ${sm.correctCount}/${sm.answeredCount} answered correctly',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: secondaryTextColor,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPassed
                              ? (isDark ? const Color(0xFF064E3B).withOpacity(0.4) : const Color(0xFFDCFCE7))
                              : (isDark ? const Color(0xFF7F1D1D).withOpacity(0.4) : const Color(0xFFFEE2E2)),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: isPassed
                                ? (isDark ? const Color(0xFF059669) : const Color(0xFF86EFAC))
                                : (isDark ? const Color(0xFFDC2626) : const Color(0xFFFCA5A5)),
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          isPassed ? 'Pass (>=50%)' : 'Needs Practice (<50%)',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ==========================================
  // SECTION E: Recent Test Attempts Context
  // ==========================================
  Widget _buildRecentAttemptsSection({
    required PerformanceAnalyticsData data,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required AppLocalizations l10n,
    required QuestionBankRepository questionBank,
    required String langCode,
  }) {
    // Show up to the 5 most recent attempts
    final recentAttempts = data.chronologicalAttempts.reversed.take(5).toList();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: _buildSectionHeader(
                  title: l10n.text('analytics_recent_attempts').toUpperCase(),
                  icon: Icons.history_rounded,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              ScalePress(
                onTap: () => Navigator.of(context).pop(),
                child: Text(
                  'Back to History',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          ...recentAttempts.map((attempt) {
            final isExam = attempt.testMode.code == 'EXAM';
            final displaySubject = attempt.getDisplaySubject(
              langCode: langCode,
              questionBank: questionBank,
            );

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ScalePress(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ResultDetailScreen(
                        result: attempt,
                        questionBank: questionBank,
                      ),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: isExam
                              ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
                              : (isDark ? const Color(0xFF134E4A) : const Color(0xFFCCFBF1)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isExam ? 'EXAM' : 'PRACTICE',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isExam
                                ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8))
                                : (isDark ? const Color(0xFF5EEAD4) : const Color(0xFF0F766E)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              displaySubject,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: primaryTextColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formatDate(attempt.completedAt),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: secondaryTextColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${attempt.percentage.toStringAsFixed(0)}%',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: attempt.isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                            ),
                          ),
                          Text(
                            attempt.isPassed ? 'Passed' : 'Failed',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: attempt.isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: secondaryTextColor,
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ==========================================
  // Helper Section Header
  // ==========================================
  Widget _buildSectionHeader({
    required String title,
    required IconData icon,
    required bool isDark,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 18,
          color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
            ),
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final day = local.day.toString().padLeft(2, '0');
    final month = months[local.month - 1];
    final hour = local.hour > 12 ? local.hour - 12 : (local.hour == 0 ? 12 : local.hour);
    final minute = local.minute.toString().padLeft(2, '0');
    final amPm = local.hour >= 12 ? 'PM' : 'AM';
    return '$day $month • $hour:$minute $amPm';
  }
}

// ==========================================
// Filter Chip Widget
// ==========================================
class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE))
              : (isDark ? AppColors.darkSurface : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB))
                : (isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1)),
            width: isSelected ? 1.2 : 1,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8))
                : (isDark ? AppColors.darkTextSecondary : const Color(0xFF475569)),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// Stat Metric Card Widget
// ==========================================
class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    this.subtitle,
    required this.accentColor,
    required this.isDark,
  });

  final String label;
  final String value;
  final String? subtitle;
  final Color accentColor;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
                color: accentColor,
              ),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 10,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ==========================================
// Interactive Score Trend Line Chart Widget
// ==========================================
class _ScoreTrendChart extends StatelessWidget {
  const _ScoreTrendChart({
    required this.attempts,
    required this.selectedIndex,
    required this.isDark,
    required this.onSelectAttempt,
  });

  final List<TestResultModel> attempts;
  final int? selectedIndex;
  final bool isDark;
  final ValueChanged<int> onSelectAttempt;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = constraints.maxHeight;

        return GestureDetector(
          onTapDown: (details) {
            if (attempts.isEmpty) return;
            const leftPad = 36.0;
            const rightPad = 16.0;
            final chartWidth = width - leftPad - rightPad;

            if (attempts.length == 1) {
              onSelectAttempt(0);
              return;
            }

            final tapX = details.localPosition.dx;
            final step = chartWidth / (attempts.length - 1);
            final tappedIndex = ((tapX - leftPad) / step).round().clamp(0, attempts.length - 1);
            onSelectAttempt(tappedIndex);
          },
          child: CustomPaint(
            size: Size(width, height),
            painter: _ScoreTrendLinePainter(
              attempts: attempts,
              selectedIndex: selectedIndex,
              isDark: isDark,
            ),
          ),
        );
      },
    );
  }
}

class _ScoreTrendLinePainter extends CustomPainter {
  _ScoreTrendLinePainter({
    required this.attempts,
    required this.selectedIndex,
    required this.isDark,
  });

  final List<TestResultModel> attempts;
  final int? selectedIndex;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    const leftPad = 36.0;
    const rightPad = 16.0;
    const topPad = 16.0;
    const bottomPad = 26.0;

    final chartWidth = size.width - leftPad - rightPad;
    final chartHeight = size.height - topPad - bottomPad;

    // Gridline & Axis Paints
    final gridPaint = Paint()
      ..color = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)
      ..strokeWidth = 1;

    final benchmarkPaint = Paint()
      ..color = const Color(0xFFD97706).withOpacity(0.6)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    final textStyle = GoogleFonts.inter(
      fontSize: 10,
      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8),
    );

    // Draw horizontal grid lines: 100%, 75%, 50%, 25%, 0%
    const gridValues = [100, 75, 50, 25, 0];
    for (final val in gridValues) {
      final y = topPad + (1.0 - (val / 100.0)) * chartHeight;

      if (val == 50) {
        // Draw dashed benchmark line for 50%
        _drawDashedLine(canvas, Offset(leftPad, y), Offset(size.width - rightPad, y), benchmarkPaint);
      } else {
        canvas.drawLine(Offset(leftPad, y), Offset(size.width - rightPad, y), gridPaint);
      }

      // Draw Y-axis label
      final tp = TextPainter(
        text: TextSpan(text: '$val%', style: textStyle),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(leftPad - tp.width - 6, y - tp.height / 2));
    }

    if (attempts.isEmpty) return;

    // Coordinates of all attempt points
    final List<Offset> points = [];
    if (attempts.length == 1) {
      final y = topPad + (1.0 - (attempts.first.percentage / 100.0).clamp(0.0, 1.0)) * chartHeight;
      points.add(Offset(leftPad + chartWidth / 2, y));
    } else {
      final step = chartWidth / (attempts.length - 1);
      for (int i = 0; i < attempts.length; i++) {
        final x = leftPad + (i * step);
        final y = topPad + (1.0 - (attempts[i].percentage / 100.0).clamp(0.0, 1.0)) * chartHeight;
        points.add(Offset(x, y));
      }
    }

    // Line and Fill Paths
    final linePaint = Paint()
      ..color = isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8)
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8)).withOpacity(0.25),
          (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8)).withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(leftPad, topPad, chartWidth, chartHeight))
      ..style = PaintingStyle.fill;

    if (points.length > 1) {
      final path = Path()..moveTo(points.first.dx, points.first.dy);
      for (int i = 1; i < points.length; i++) {
        path.lineTo(points[i].dx, points[i].dy);
      }

      // Area fill below line
      final fillPath = Path.from(path)
        ..lineTo(points.last.dx, topPad + chartHeight)
        ..lineTo(points.first.dx, topPad + chartHeight)
        ..close();

      canvas.drawPath(fillPath, fillPaint);
      canvas.drawPath(path, linePaint);
    }

    // Draw Data Point Circles
    final dotFillPaint = Paint()..color = isDark ? AppColors.darkSurface : Colors.white;
    final dotStrokePaint = Paint()
      ..color = isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    final highlightRingPaint = Paint()
      ..color = (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8)).withOpacity(0.3)
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke;

    for (int i = 0; i < points.length; i++) {
      final pt = points[i];
      final isSelected = selectedIndex == i;

      if (isSelected) {
        canvas.drawCircle(pt, 9, highlightRingPaint);
        canvas.drawCircle(pt, 5.5, dotFillPaint);
        canvas.drawCircle(pt, 5.5, dotStrokePaint);
      } else {
        canvas.drawCircle(pt, 4.0, dotFillPaint);
        canvas.drawCircle(pt, 4.0, dotStrokePaint);
      }

      // Draw X-axis attempt labels (#1, #2, etc.)
      // Prevent label clutter if more than 8 points
      final shouldDrawLabel = attempts.length <= 8 ||
          i == 0 ||
          i == attempts.length - 1 ||
          i == selectedIndex ||
          (i % (attempts.length ~/ 4) == 0);

      if (shouldDrawLabel) {
        final xLabel = '#${i + 1}';
        final xTp = TextPainter(
          text: TextSpan(
            text: xLabel,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
              color: isSelected
                  ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8))
                  : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        final labelX = (pt.dx - xTp.width / 2).clamp(leftPad, (size.width - rightPad - xTp.width).clamp(leftPad, size.width));
        xTp.paint(canvas, Offset(labelX, topPad + chartHeight + 6));
      }
    }
  }

  void _drawDashedLine(Canvas canvas, Offset p1, Offset p2, Paint paint) {
    const dashWidth = 4.0;
    const dashSpace = 3.0;
    double currentX = p1.dx;
    while (currentX < p2.dx) {
      final nextX = (currentX + dashWidth).clamp(p1.dx, p2.dx);
      canvas.drawLine(Offset(currentX, p1.dy), Offset(nextX, p1.dy), paint);
      currentX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant _ScoreTrendLinePainter oldDelegate) {
    return oldDelegate.attempts != attempts ||
        oldDelegate.selectedIndex != selectedIndex ||
        oldDelegate.isDark != isDark;
  }
}
