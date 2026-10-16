import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/royal_button.dart';
import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/repository/results_repository.dart';
import '../cubit/test_engine_cubit.dart';
import '../services/test_generator.dart';
import 'test_screen.dart';

/// Modal dialog for customizing a Practice Test session.
/// Fully responsive across portrait and landscape viewports with smooth scrolling.
class TestConfigDialog extends StatefulWidget {
  const TestConfigDialog({
    super.key,
    required this.testGenerator,
    required this.questionBank,
    required this.resultsRepository,
  });

  final TestGenerator testGenerator;
  final QuestionBankRepository questionBank;
  final ResultsRepository resultsRepository;

  @override
  State<TestConfigDialog> createState() => _TestConfigDialogState();
}

class _TestConfigDialogState extends State<TestConfigDialog> {
  final Set<QuestionTopic> _selectedTopics = Set.from(QuestionTopic.values);
  int _questionCount = 15;
  int _durationMinutes = 15;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final screenSize = MediaQuery.of(context).size;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 520,
          maxHeight: screenSize.height * 0.88,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Icon(
                      Icons.tune_rounded,
                      color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.text('test_setup_title'),
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Customize syllabus topics & question count',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              const Divider(height: 1),
              const SizedBox(height: AppSpacing.md),

              // Topic Selection Header with Select All / Clear
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.text('select_topics'),
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        if (_selectedTopics.length == QuestionTopic.values.length) {
                          _selectedTopics.clear();
                          _selectedTopics.add(QuestionTopic.values.first);
                        } else {
                          _selectedTopics.addAll(QuestionTopic.values);
                        }
                      });
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _selectedTopics.length == QuestionTopic.values.length ? 'Clear' : 'Select All',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),

              // All 8 Topics Wrap
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: QuestionTopic.values.map((topic) {
                  final isSelected = _selectedTopics.contains(topic);
                  final label = topic.localizedLabel(langCode);

                  return FilterChip(
                    label: Text(label),
                    selected: isSelected,
                    showCheckmark: isSelected,
                    checkmarkColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                    selectedColor: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                    backgroundColor: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
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
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedTopics.add(topic);
                        } else {
                          if (_selectedTopics.length > 1) {
                            _selectedTopics.remove(topic);
                          }
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Question Count
              Text(
                l10n.text('question_count'),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),

              // Responsive Question Count Wrap
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [5, 10, 15, 20, 25, 30, 50].map((count) {
                  final isSelected = _questionCount == count;
                  return InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    onTap: () {
                      setState(() {
                        _questionCount = count;
                        _durationMinutes = count;
                      });
                    },
                    child: AnimatedContainer(
                      duration: AppAnim.fast,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface)
                            : (isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8F9FA)),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(
                          color: isSelected
                              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                              : (isDark ? AppColors.darkBorder : AppColors.borderLight),
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Text(
                        '$count Qs',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected
                              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                              : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.xl),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: Text(l10n.text('btn_cancel')),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: RoyalButton(
                      text: l10n.text('btn_start_test'),
                      icon: Icons.play_arrow_rounded,
                      height: 40,
                      onPressed: () {
                        final test = widget.testGenerator.generatePracticeTest(
                          topics: _selectedTopics.toList(),
                          totalQuestions: _questionCount,
                          durationMinutes: _durationMinutes,
                        );
                        Navigator.pop(context);

                        final cubit = TestEngineCubit(
                          test: test,
                          resultsRepository: widget.resultsRepository,
                        );
                        Navigator.push(context, TestScreen.route(cubit));
                      },
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
