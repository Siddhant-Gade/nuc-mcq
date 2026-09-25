import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/score_gauge.dart';
import '../../../core/widgets/scale_press.dart';
import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../models/test_result_model.dart';

class ResultDetailScreen extends StatefulWidget {
  const ResultDetailScreen({
    super.key,
    required this.result,
    required this.questionBank,
    this.questions = const [],
  });

  final TestResultModel result;
  final QuestionBankRepository questionBank;
  final List<QuestionModel> questions;

  @override
  State<ResultDetailScreen> createState() => _ResultDetailScreenState();
}

class _ResultDetailScreenState extends State<ResultDetailScreen> {
  bool _showAllQuestions = false;

  String _formatDuration(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins}m ${secs}s';
  }

  void _shareScorecard(BuildContext context) {
    final result = widget.result;
    final percentage = (result.score / result.totalQuestions * 100).toStringAsFixed(1);
    final isPassed = (result.score / result.totalQuestions) >= 0.4;
    final status = isPassed ? 'PASSED 🏆' : 'NEEDS PRACTICE ✍️';

    final text = '''
🎓 New Unique Computers - MS-CIT Test Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━
📝 Mode: ${result.testMode.label}
🎯 Score: ${result.score} / ${result.totalQuestions} ($percentage%)
⏱️ Time: ${_formatDuration(result.timeTakenSeconds)}
✅ Correct: ${result.correctCount}  |  ❌ Incorrect: ${result.wrongCount}
📊 Status: $status
━━━━━━━━━━━━━━━━━━━━━━━━
Practice anytime on the New Unique Computers Student Portal!
''';

    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Scorecard copied to clipboard! Ready to share on WhatsApp.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final result = widget.result;

    final reviewQuestions = widget.questions.isNotEmpty
        ? widget.questions
        : widget.result.wrongQuestionIds
            .map((id) => widget.questionBank.getQuestionById(id))
            .whereType<QuestionModel>()
            .toList();

    final wrongQuestions = reviewQuestions
        .where((q) => result.wrongQuestionIds.contains(q.id))
        .toList();

    final questionsToDisplay = _showAllQuestions ? reviewQuestions : wrongQuestions;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('score_report_title')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            tooltip: 'Share Scorecard',
            onPressed: () => _shareScorecard(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Score Summary Card
            FrostedCard(
              padding: const EdgeInsets.all(20),
              elevation: 1,
              child: Column(
                children: [
                  Text(
                    result.testMode.label.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.5,
                      color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ScoreGauge(
                    score: result.score,
                    totalQuestions: result.totalQuestions,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Gamified Rewards & XP Earned Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                      : [const Color(0xFFEEF2FF), const Color(0xFFE0E7FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: isDark ? const Color(0xFF3B82F6).withOpacity(0.4) : const Color(0xFFC7D2FE),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF7C3AED)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Icon(Icons.stars_rounded, color: Colors.white, size: 26),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              '+${(result.correctCount * 10) + (result.isPassed ? 50 : 0)} XP Earned!',
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E40AF),
                              ),
                            ),
                            if (result.isPassed) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.googleGreen,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '+50 PASS BONUS',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          result.isPassed
                              ? 'Great progress! Your test score contributed to your level and streak.'
                              : 'Keep practicing to level up your MS-CIT rank and build streaks!',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Performance Metrics Grid
            Row(
              children: [
                Expanded(
                  child: ScalePress(
                    child: _GoogleMetricCard(
                      icon: Icons.check_circle_outline,
                      color: AppColors.googleGreen,
                      label: l10n.text('metric_correct'),
                      value: '${result.correctCount}',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ScalePress(
                    child: _GoogleMetricCard(
                      icon: Icons.highlight_off_outlined,
                      color: AppColors.googleRed,
                      label: l10n.text('metric_wrong'),
                      value: '${result.wrongCount}',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ScalePress(
                    child: _GoogleMetricCard(
                      icon: Icons.schedule_outlined,
                      color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      label: l10n.text('metric_duration'),
                      value: _formatDuration(result.timeTakenSeconds),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),

            // Review Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _showAllQuestions
                      ? '${l10n.text('review_all_questions')} (${reviewQuestions.length})'
                      : '${l10n.text('metric_wrong')} (${wrongQuestions.length})',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                if (reviewQuestions.length > wrongQuestions.length)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _showAllQuestions = !_showAllQuestions;
                      });
                    },
                    child: Text(_showAllQuestions
                        ? l10n.text('review_wrong_only')
                        : '${l10n.text('review_show_all')} (${reviewQuestions.length})'),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),

            if (questionsToDisplay.isEmpty)
              FrostedCard(
                padding: const EdgeInsets.all(24),
                elevation: 1,
                child: Column(
                  children: [
                    const Icon(Icons.stars_rounded, size: 48, color: AppColors.googleGreen),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Outstanding Performance!',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'All questions were answered correctly.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              )
            else
              ...questionsToDisplay.map((q) {
                final studentSelected = result.studentAnswers[q.id];
                final isCorrect = studentSelected != null &&
                    studentSelected == q.correctOptionIndex;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _QuestionReviewCard(
                    question: q,
                    langCode: langCode,
                    studentSelectedOption: studentSelected,
                    isCorrect: isCorrect,
                  ),
                );
              }),

            const SizedBox(height: 18),
            RoyalButton(
              text: l10n.text('btn_done'),
              icon: Icons.check,
              onPressed: () => Navigator.of(context).pop(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _GoogleMetricCard extends StatelessWidget {
  const _GoogleMetricCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w400,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionReviewCard extends StatefulWidget {
  const _QuestionReviewCard({
    required this.question,
    required this.langCode,
    required this.studentSelectedOption,
    required this.isCorrect,
  });

  final QuestionModel question;
  final String langCode;
  final int? studentSelectedOption;
  final bool isCorrect;

  @override
  State<_QuestionReviewCard> createState() => _QuestionReviewCardState();
}

class _QuestionReviewCardState extends State<_QuestionReviewCard> {
  bool _showExplanation = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final questionText = widget.question.localizedQuestionText(widget.langCode);
    final options = widget.question.localizedOptions(widget.langCode);
    final explanation = widget.question.localizedExplanation(widget.langCode);
    final topicLabel = widget.question.topic.localizedLabel(widget.langCode);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: widget.isCorrect
              ? AppColors.googleGreen.withOpacity(0.4)
              : AppColors.googleRed.withOpacity(0.4),
          width: 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: widget.isCorrect
                      ? (isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface)
                      : (isDark ? const Color(0xFF3C1816) : AppColors.googleRedSurface),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  widget.isCorrect ? 'Correct' : 'Incorrect',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: widget.isCorrect ? AppColors.googleGreen : AppColors.googleRed,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                topicLabel,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            questionText,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          ...List.generate(options.length, (idx) {
            final isChosen = widget.studentSelectedOption == idx;
            final isAnswerKey = widget.question.correctOptionIndex == idx;

            Color optionBg = Colors.transparent;
            Color textColor = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;
            FontWeight weight = FontWeight.normal;

            if (isAnswerKey) {
              optionBg = isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface;
              textColor = AppColors.googleGreen;
              weight = FontWeight.w500;
            } else if (isChosen && !widget.isCorrect) {
              optionBg = isDark ? const Color(0xFF3C1816) : AppColors.googleRedSurface;
              textColor = AppColors.googleRed;
              weight = FontWeight.w500;
            }

            return Container(
              margin: const EdgeInsets.symmetric(vertical: 2),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: optionBg,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  Text(
                    '${String.fromCharCode(65 + idx)}. ',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w500, color: textColor),
                  ),
                  Expanded(
                    child: Text(
                      options[idx],
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: weight,
                        color: textColor,
                      ),
                    ),
                  ),
                  if (isAnswerKey)
                    const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.googleGreen),
                  if (isChosen && !widget.isCorrect)
                    const Icon(Icons.cancel_rounded, size: 16, color: AppColors.googleRed),
                ],
              ),
            );
          }),
          const SizedBox(height: AppSpacing.sm),
          // Expandable explanation
          GestureDetector(
            onTap: () => setState(() => _showExplanation = !_showExplanation),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 15,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Explanation',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        _showExplanation
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                    ],
                  ),
                  AnimatedCrossFade(
                    firstChild: const SizedBox.shrink(),
                    secondChild: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        explanation,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                    ),
                    crossFadeState: _showExplanation
                        ? CrossFadeState.showSecond
                        : CrossFadeState.showFirst,
                    duration: AppAnim.normal,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
