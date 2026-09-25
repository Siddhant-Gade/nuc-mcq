import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/repository/results_repository.dart';
import '../../test_engine/cubit/test_engine_cubit.dart';
import '../../test_engine/screens/test_config_dialog.dart';
import '../../test_engine/screens/test_screen.dart';
import '../../test_engine/services/test_generator.dart';

class TestsTab extends StatefulWidget {
  const TestsTab({
    super.key,
    required this.testGenerator,
    required this.questionBank,
    required this.resultsRepository,
  });

  final TestGenerator testGenerator;
  final QuestionBankRepository questionBank;
  final ResultsRepository resultsRepository;

  @override
  State<TestsTab> createState() => _TestsTabState();
}

class _TestsTabState extends State<TestsTab> {
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _silentSync();
    });
  }

  Future<void> _silentSync() async {
    try {
      final count = await widget.questionBank.syncFromBackend();
      if (mounted && count > 0) {
        setState(() {});
      }
    } catch (_) {}
  }

  Future<void> _sync() async {
    setState(() => _isSyncing = true);
    try {
      final count = await widget.questionBank.syncFromBackend();
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              count > 0
                  ? '$count questions ready for offline practice!'
                  : 'No questions currently uploaded by instructor.',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline mode: Using cached questions.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  IconData _getTopicIcon(QuestionTopic topic) {
    switch (topic) {
      case QuestionTopic.computerFundamentals:
        return Icons.memory_rounded;
      case QuestionTopic.os:
        return Icons.desktop_windows_rounded;
      case QuestionTopic.excel:
        return Icons.table_chart_outlined;
      case QuestionTopic.word:
        return Icons.description_outlined;
      case QuestionTopic.powerpoint:
        return Icons.slideshow_rounded;
      case QuestionTopic.outlook:
        return Icons.mail_outline_rounded;
      case QuestionTopic.internet:
        return Icons.language_rounded;
      case QuestionTopic.pagemaker:
        return Icons.auto_stories_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final topicCounts = widget.questionBank.getTopicCounts();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('tab_tests')),
        actions: [
          IconButton(
            icon: _isSyncing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.sync_rounded),
            tooltip: 'Sync Offline Questions',
            onPressed: _isSyncing ? null : _sync,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Friendly Mock Exam Banner
            ScalePress(
              onTap: () {
                if (widget.questionBank.totalCount == 0) {
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Questions loading... Please wait a moment.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                final test = widget.testGenerator.generateExamTest();
                final cubit = TestEngineCubit(
                  test: test,
                  resultsRepository: widget.resultsRepository,
                );
                Navigator.push(context, TestScreen.route(cubit));
              },
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.assignment_turned_in_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Take Full Mock Exam',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Timed test • Replicates MS-CIT Exam',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.85),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Start',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Section Header: Topic Practice
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Practice by Subject',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Tap any subject to select question count & start',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                ScalePress(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (_) => TestConfigDialog(
                        testGenerator: widget.testGenerator,
                        questionBank: widget.questionBank,
                        resultsRepository: widget.resultsRepository,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.tune_rounded,
                          size: 14,
                          color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Custom Mix',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: QuestionTopic.values.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.25,
              ),
              itemBuilder: (context, index) {
                final topic = QuestionTopic.values[index];
                final count = topicCounts[topic] ?? 0;
                final label = topic.localizedLabel(langCode);

                return ScalePress(
                  onTap: () {
                    if (count > 0) {
                      _showTopicPracticeSheet(context, topic, label, count);
                    } else {
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('$label questions will appear once uploaded.'),
                          behavior: SnackBarBehavior.floating,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // Subject Banner Artwork
                        Image.asset(
                          topic.assetImagePath,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
                            child: Icon(_getTopicIcon(topic), size: 36, color: AppColors.googleBlue),
                          ),
                        ),

                        // Subtle Gradient Overlay for High Text Readability
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withOpacity(0.15),
                                Colors.black.withOpacity(0.65),
                              ],
                            ),
                          ),
                        ),

                        // Content Overlay: Badges and Titles
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Top Row: Count Badge & Start Icon
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withOpacity(0.45),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.3),
                                        width: 0.8,
                                      ),
                                    ),
                                    child: Text(
                                      count > 0 ? '$count Qs' : '0 Qs',
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.25),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.play_arrow_rounded,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                  ),
                                ],
                              ),

                              // Bottom Row: Subject Title & Subtitle
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    label,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                      shadows: [
                                        Shadow(
                                          color: Colors.black.withOpacity(0.7),
                                          blurRadius: 3,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 1),
                                  Text(
                                    topic.description,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.white.withOpacity(0.85),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }

  void _showTopicPracticeSheet(
    BuildContext context,
    QuestionTopic topic,
    String label,
    int availableCount,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final baseOptions = [5, 10, 15, 20, 25, 30, 50];
    final countOptions = baseOptions.where((opt) => opt < availableCount).toList();
    if (!countOptions.contains(availableCount)) {
      countOptions.add(availableCount);
    }
    int selectedCount = countOptions.isNotEmpty
        ? (countOptions.contains(15)
            ? 15
            : (countOptions.contains(10) ? 10 : countOptions.first))
        : availableCount;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.darkBlueSurface
                              : AppColors.googleBlueSurface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Icon(
                          _getTopicIcon(topic),
                          color: isDark
                              ? AppColors.darkBluePrimary
                              : AppColors.googleBlue,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              label,
                              style: GoogleFonts.inter(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? AppColors.darkTextPrimary
                                    : AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              '$availableCount questions available',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.darkTextSecondary
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Divider(height: 1),
                  const SizedBox(height: 18),
                  Text(
                    'Select Number of Questions',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? AppColors.darkTextPrimary
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: countOptions.map((opt) {
                      final isSelected = selectedCount == opt;
                      final isAll = opt == availableCount;
                      return InkWell(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        onTap: () {
                          setModalState(() => selectedCount = opt);
                        },
                        child: AnimatedContainer(
                          duration: AppAnim.fast,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isDark
                                    ? AppColors.darkBlueSurface
                                    : AppColors.googleBlueSurface)
                                : (isDark
                                    ? AppColors.darkSurfaceVariant
                                    : const Color(0xFFF1F3F4)),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                            border: Border.all(
                              color: isSelected
                                  ? (isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue)
                                  : (isDark
                                      ? AppColors.darkBorder
                                      : AppColors.borderLight),
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Text(
                            isAll ? 'All ($opt Qs)' : '$opt Qs',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                              color: isSelected
                                  ? (isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue)
                                  : (isDark
                                      ? AppColors.darkTextPrimary
                                      : AppColors.textPrimary),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF1E293B)
                          : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF334155)
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.tips_and_updates_outlined,
                            size: 18, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Instant hints, answers & full explanations included.',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: isDark
                                  ? const Color(0xFF94A3B8)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  RoyalButton(
                    text: 'Start Practice ($selectedCount Questions)',
                    icon: Icons.play_arrow_rounded,
                    height: 46,
                    onPressed: () {
                      Navigator.pop(ctx);
                      final test = widget.testGenerator.generatePracticeTest(
                        topics: [topic],
                        totalQuestions: selectedCount,
                        durationMinutes: selectedCount,
                      );
                      final cubit = TestEngineCubit(
                        test: test,
                        resultsRepository: widget.resultsRepository,
                      );
                      Navigator.push(context, TestScreen.route(cubit));
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
