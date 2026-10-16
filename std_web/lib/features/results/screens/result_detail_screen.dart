import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/royal_button.dart';
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

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final day = local.day.toString().padLeft(2, '0');
    final month = months[local.month - 1];
    final year = local.year;
    final hour = local.hour > 12 ? local.hour - 12 : (local.hour == 0 ? 12 : local.hour);
    final minute = local.minute.toString().padLeft(2, '0');
    final amPm = local.hour >= 12 ? 'PM' : 'AM';
    return '$day $month $year • $hour:$minute $amPm';
  }

  void _shareScorecard(BuildContext context) {
    final result = widget.result;
    final percentage = (result.score / result.totalQuestions * 100).toStringAsFixed(1);
    final isPassed = result.isPassed;
    final status = isPassed ? 'PASSED 🏆' : 'NEEDS PRACTICE ✍️';
    final langCode = context.read<LocaleCubit>().state.languageCode;
    final displaySubject = result.getDisplaySubject(
      langCode: langCode,
      questionBank: widget.questionBank,
    );

    final text = '''
🎓 New Unique Computers - MS-CIT Test Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━
📚 Subject: $displaySubject
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
    final bgColor = isDark ? AppColors.darkBg : const Color(0xFFF5F7FB);

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
    final hasBothTypes = reviewQuestions.length > wrongQuestions.length;

    final earnedXp = (result.correctCount * 10) + (result.isPassed ? 50 : 0);
    final displaySubject = result.getDisplaySubject(
      langCode: langCode,
      questionBank: widget.questionBank,
    );

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text(
          l10n.text('score_report_title'),
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
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
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Card 1: Score & Percentage Prominent Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: isDark ? const Color(0xFF3B82F6) : const Color(0xFFBFDBFE),
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          result.testMode.code == 'EXAM'
                              ? l10n.text('test_type_exam').toUpperCase()
                              : l10n.text('test_type_practice').toUpperCase(),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                          ),
                        ),
                      ),
                      Text(
                        _formatDate(result.completedAt),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Prominent Subject Title
                  Text(
                    displaySubject,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
                      color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Prominent Score & Percentage
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '${result.score}',
                        style: GoogleFonts.inter(
                          fontSize: 44,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1.2,
                          color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        ' / ${result.totalQuestions}',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Percentage: ${(result.percentage).toStringAsFixed(1)}%',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Clean Linear Progress Bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: SizedBox(
                      height: 8,
                      child: LinearProgressIndicator(
                        value: (result.totalQuestions > 0 ? (result.score / result.totalQuestions) : 0.0).clamp(0.0, 1.0),
                        backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          result.isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Pass / Needs Practice Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: result.isPassed
                          ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5))
                          : (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFEF2F2)),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: result.isPassed ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                        width: 1,
                      ),
                    ),
                    child: Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 2,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              result.isPassed ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                              size: 16,
                              color: result.isPassed ? const Color(0xFF059669) : const Color(0xFFDC2626),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              result.isPassed ? 'PASSED' : 'NEEDS PRACTICE',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.3,
                                color: result.isPassed
                                    ? (isDark ? const Color(0xFFA7F3D0) : const Color(0xFF065F46))
                                    : (isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B)),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '•  Min 40% Required',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                            color: result.isPassed
                                ? (isDark ? const Color(0xFFA7F3D0) : const Color(0xFF065F46))
                                : (isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Card 2: Three Consistent Statistic Cards (Correct, Wrong, Duration)
            Row(
              children: [
                Expanded(
                  child: _StatMetricCard(
                    icon: Icons.check_circle_outline,
                    color: const Color(0xFF059669),
                    bgColor: isDark ? const Color(0xFF064E3B).withOpacity(0.4) : const Color(0xFFECFDF5),
                    label: l10n.text('metric_correct'),
                    value: '${result.correctCount}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatMetricCard(
                    icon: Icons.highlight_off_outlined,
                    color: const Color(0xFFDC2626),
                    bgColor: isDark ? const Color(0xFF7F1D1D).withOpacity(0.4) : const Color(0xFFFEF2F2),
                    label: l10n.text('metric_wrong'),
                    value: '${result.wrongCount}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatMetricCard(
                    icon: Icons.schedule_outlined,
                    color: const Color(0xFF1D4ED8),
                    bgColor: isDark ? const Color(0xFF1E3A8A).withOpacity(0.4) : const Color(0xFFEFF6FF),
                    label: l10n.text('metric_duration'),
                    value: _formatDuration(result.timeTakenSeconds),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Card 3: Subtle XP & Progress Indicator (No garish gradients)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.015),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isDark ? const Color(0xFF3B82F6) : const Color(0xFFBFDBFE),
                      ),
                    ),
                    child: const Center(
                      child: Icon(Icons.stars_rounded, color: Color(0xFF1D4ED8), size: 22),
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
                              '+$earnedXp XP Earned',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                              ),
                            ),
                            if (result.isPassed)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFA7F3D0)),
                                ),
                                child: Text(
                                  '+50 PASS BONUS',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF065F46),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          result.isPassed
                              ? 'Great progress! Your score contributed to your student rank.'
                              : 'Keep practicing to master topics and increase your score.',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Card 4: Question Analysis Section
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                Text(
                  _showAllQuestions
                      ? '${l10n.text('review_all_questions')} (${reviewQuestions.length})'
                      : '${l10n.text('metric_wrong')} (${wrongQuestions.length})',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                    color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                  ),
                ),
                if (hasBothTypes)
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    ),
                    onPressed: () {
                      setState(() {
                        _showAllQuestions = !_showAllQuestions;
                      });
                    },
                    icon: Icon(
                      _showAllQuestions ? Icons.filter_alt_off_rounded : Icons.filter_alt_rounded,
                      size: 16,
                      color: const Color(0xFF1D4ED8),
                    ),
                    label: Text(
                      _showAllQuestions
                          ? l10n.text('review_wrong_only')
                          : '${l10n.text('review_show_all')} (${reviewQuestions.length})',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1D4ED8),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            if (questionsToDisplay.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.stars_rounded, size: 48, color: Color(0xFF059669)),
                    const SizedBox(height: 12),
                    Text(
                      'Outstanding Performance!',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'All questions were answered correctly.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              )
            else
              ...List.generate(questionsToDisplay.length, (idx) {
                final q = questionsToDisplay[idx];
                final studentSelected = result.studentAnswers[q.id];
                final isCorrect = studentSelected != null &&
                    studentSelected == q.correctOptionIndex;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _QuestionReviewCard(
                    questionIndex: idx + 1,
                    question: q,
                    langCode: langCode,
                    studentSelectedOption: studentSelected,
                    isCorrect: isCorrect,
                  ),
                );
              }),

            const SizedBox(height: 20),
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

class _StatMetricCard extends StatelessWidget {
  const _StatMetricCard({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final Color bgColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
                color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _QuestionReviewCard extends StatefulWidget {
  const _QuestionReviewCard({
    required this.questionIndex,
    required this.question,
    required this.langCode,
    required this.studentSelectedOption,
    required this.isCorrect,
  });

  final int questionIndex;
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.isCorrect
              ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFA7F3D0))
              : (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFECACA)),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Question number, Topic, and Correct/Incorrect pill
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Q${widget.questionIndex}',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  topicLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: widget.isCorrect
                      ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5))
                      : (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFEF2F2)),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: widget.isCorrect ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      widget.isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 13,
                      color: widget.isCorrect ? const Color(0xFF059669) : const Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.isCorrect ? 'Correct' : 'Incorrect',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: widget.isCorrect ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Question Text
          Text(
            questionText,
            style: GoogleFonts.inter(
              fontSize: 14.5,
              fontWeight: FontWeight.w600,
              height: 1.4,
              color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),

          // Options List
          ...List.generate(options.length, (idx) {
            final isChosen = widget.studentSelectedOption == idx;
            final isAnswerKey = widget.question.correctOptionIndex == idx;

            Color optionBg = isDark ? const Color(0xFF0F172A).withOpacity(0.4) : const Color(0xFFF8FAFC);
            Color borderColor = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
            Color textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF334155);
            FontWeight weight = FontWeight.w400;

            if (isAnswerKey) {
              optionBg = isDark ? const Color(0xFF064E3B).withOpacity(0.5) : const Color(0xFFF0FDF4);
              borderColor = isDark ? const Color(0xFF059669) : const Color(0xFF86EFAC);
              textColor = isDark ? const Color(0xFFA7F3D0) : const Color(0xFF15803D);
              weight = FontWeight.w600;
            } else if (isChosen && !widget.isCorrect) {
              optionBg = isDark ? const Color(0xFF7F1D1D).withOpacity(0.5) : const Color(0xFFFEF2F2);
              borderColor = isDark ? const Color(0xFFDC2626) : const Color(0xFFFCA5A5);
              textColor = isDark ? const Color(0xFFFECACA) : const Color(0xFFB91C1C);
              weight = FontWeight.w600;
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: optionBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor, width: 1),
              ),
              child: Row(
                children: [
                  Text(
                    '${String.fromCharCode(65 + idx)}. ',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: textColor,
                    ),
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
                    const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFF059669)),
                  if (isChosen && !widget.isCorrect)
                    const Icon(Icons.cancel_rounded, size: 18, color: Color(0xFFDC2626)),
                ],
              ),
            );
          }),

          // Expandable Explanation
          if (explanation.isNotEmpty) ...[
            const SizedBox(height: 8),
            ScalePress(
              onTap: () => setState(() => _showExplanation = !_showExplanation),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 15,
                          color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Explanation',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
                          ),
                        ),
                        const Spacer(),
                        Icon(
                          _showExplanation
                              ? Icons.keyboard_arrow_up_rounded
                              : Icons.keyboard_arrow_down_rounded,
                          size: 18,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                        ),
                      ],
                    ),
                    if (_showExplanation) ...[
                      const SizedBox(height: 8),
                      Text(
                        explanation,
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          height: 1.4,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
