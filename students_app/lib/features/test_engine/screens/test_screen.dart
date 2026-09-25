import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
import '../../bookmarks/cubit/bookmarks_cubit.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/cubit/results_cubit.dart';
import '../../results/screens/result_detail_screen.dart';
import '../../sync/cubit/sync_cubit.dart';
import '../cubit/test_engine_cubit.dart';
import '../services/test_generator.dart';

class TestScreen extends StatefulWidget {
  const TestScreen({super.key});

  static Route<void> route(TestEngineCubit cubit) {
    return MaterialPageRoute(
      builder: (_) => BlocProvider.value(
        value: cubit,
        child: const TestScreen(),
      ),
    );
  }

  @override
  State<TestScreen> createState() => _TestScreenState();
}

class _TestScreenState extends State<TestScreen> with SingleTickerProviderStateMixin {
  bool _showHelp = false;
  int _lastQuestionIndex = 0;
  double _dragDelta = 0.0;
  int _correctStreak = 0;
  String? _recentXpMessage;
  AnimationController? _celebrationAnimController;
  Animation<double>? _celebrationScaleAnim;

  @override
  void initState() {
    super.initState();
    _celebrationAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _celebrationScaleAnim = CurvedAnimation(
      parent: _celebrationAnimController!,
      curve: Curves.elasticOut,
    );
  }

  @override
  void dispose() {
    _celebrationAnimController?.dispose();
    super.dispose();
  }

  void _triggerXpCelebration(String message) {
    setState(() {
      _recentXpMessage = message;
    });
    _celebrationAnimController?.forward(from: 0.0).then((_) {
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          setState(() {
            _recentXpMessage = null;
          });
        }
      });
    });
  }

  void _showExitConfirmationDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final rootNav = Navigator.of(context);

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        title: Text(
          l10n.text('dialog_quit_title'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w500),
        ),
        content: Text(
          l10n.text('dialog_quit_desc'),
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(l10n.text('btn_stay')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.googleRed,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              rootNav.pop();
            },
            child: Text(l10n.text('btn_quit')),
          ),
        ],
      ),
    );
  }

  void _showLanguageSelector(BuildContext context) {
    final cubit = context.read<LocaleCubit>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
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
                  const Text(
                    'Select Language / भाषा निवडा',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ListTile(
                title: const Text('English'),
                trailing: cubit.state.languageCode == 'en'
                    ? const Icon(Icons.check_circle, color: AppColors.googleBlue)
                    : null,
                onTap: () {
                  cubit.setLocale('en');
                  Navigator.of(sheetCtx).pop();
                },
              ),
              const Divider(height: 1),
              ListTile(
                title: const Text('मराठी (Marathi)'),
                trailing: cubit.state.languageCode == 'mr'
                    ? const Icon(Icons.check_circle, color: AppColors.googleBlue)
                    : null,
                onTap: () {
                  cubit.setLocale('mr');
                  Navigator.of(sheetCtx).pop();
                },
              ),
              const Divider(height: 1),
              ListTile(
                title: const Text('हिंदी (Hindi)'),
                trailing: cubit.state.languageCode == 'hi'
                    ? const Icon(Icons.check_circle, color: AppColors.googleBlue)
                    : null,
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
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;

    return BlocConsumer<TestEngineCubit, TestEngineState>(
      listener: (context, state) {
        if (state.status == TestExecutionStatus.completed &&
            state.completedResult != null) {
          final questionBank = context.read<QuestionBankRepository>();
          try {
            context.read<ResultsCubit>().loadResults();
            // Automatically attempt opportunistic background sync on test completion
            context.read<SyncCubit>().syncNow();
          } catch (_) {}

          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => ResultDetailScreen(
                result: state.completedResult!,
                questionBank: questionBank,
                questions: state.test.questions,
              ),
            ),
          );
        }
      },
      buildWhen: (previous, current) {
        return previous.currentIndex != current.currentIndex ||
            previous.answers[current.currentQuestion.id] != current.answers[current.currentQuestion.id] ||
            previous.flaggedQuestionIds != current.flaggedQuestionIds ||
            previous.status != current.status;
      },
      builder: (context, state) {
        // Auto-reset help on question switch
        if (_lastQuestionIndex != state.currentIndex) {
          _lastQuestionIndex = state.currentIndex;
          _showHelp = false;
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;

        if (state.test.questions.isEmpty) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Test'),
            ),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.quiz_outlined,
                      size: 54,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Questions Not Uploaded Yet',
                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'The question bank has not been uploaded by your instructor yet. Please check back later.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    RoyalButton(
                      text: 'Go Back',
                      isSecondary: true,
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        final currentQ = state.currentQuestion;
        final questionText = currentQ.localizedQuestionText(langCode);
        final options = currentQ.localizedOptions(langCode);
        final topicLabel = currentQ.topic.localizedLabel(langCode);
        final isPracticeMode = state.test.mode == TestMode.practice;
        final isAnswered = state.isQuestionAnswered(currentQ.id);
        final selectedOptionIndex = state.answers[currentQ.id];

        return PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) {
              _showExitConfirmationDialog(context);
            }
          },
          child: Scaffold(
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                tooltip: l10n.text('btn_exit_test'),
                onPressed: () => _showExitConfirmationDialog(context),
              ),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: state.test.mode.code == 'EXAM'
                          ? (isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface)
                          : (isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4)),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: state.test.mode.code == 'EXAM'
                            ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlueBorder)
                            : (isDark ? AppColors.darkBorder : AppColors.borderLight),
                      ),
                    ),
                    child: Text(
                      state.test.mode.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: state.test.mode.code == 'EXAM'
                            ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                            : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const Spacer(),
                  const _TimerWidget(),
                ],
              ),
              actions: [
                // Quick Language Switcher
                IconButton(
                  icon: const Icon(Icons.translate_rounded),
                  tooltip: 'Language',
                  onPressed: () => _showLanguageSelector(context),
                ),
                // Question Palette
                IconButton(
                  icon: const Icon(Icons.apps_rounded),
                  tooltip: l10n.text('questions_overview'),
                  onPressed: () => _showQuestionPaletteSheet(context, state),
                ),
              ],
            ),
            body: SafeArea(
              child: Stack(
                children: [
                  Column(
                    children: [
                      // Progress indicator
                      RepaintBoundary(
                        child: LinearProgressIndicator(
                          value: (state.currentIndex + 1) / state.totalQuestions,
                          backgroundColor: isDark ? const Color(0xFF3C4043) : const Color(0xFFE8EAED),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                          ),
                          minHeight: 3,
                        ),
                      ),

                      // Swipeable Question Content Area (Swipe Left for Next, Swipe Right for Previous)
                      Expanded(
                        child: RepaintBoundary(
                          child: GestureDetector(
                            behavior: HitTestBehavior.translucent,
                            onHorizontalDragUpdate: (details) {
                              _dragDelta += details.delta.dx;
                            },
                            onHorizontalDragEnd: (details) {
                              final velocity = details.primaryVelocity ?? 0;
                              if (velocity < -120 || _dragDelta < -40) {
                                // Swiped Left -> Next Question
                                if (state.currentIndex < state.totalQuestions - 1) {
                                  context.read<TestEngineCubit>().nextQuestion();
                                }
                              } else if (velocity > 120 || _dragDelta > 40) {
                                // Swiped Right -> Previous Question
                                if (state.currentIndex > 0) {
                                  context.read<TestEngineCubit>().previousQuestion();
                                }
                              }
                              _dragDelta = 0.0;
                            },
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Row 1: Topic Badge & Question Counter
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Flexible(
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            topicLabel,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        l10n.text('question_progress', {
                                          'current': '${state.currentIndex + 1}',
                                          'total': '${state.totalQuestions}',
                                        }),
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Row 2: Amazon Prime Video Gamification Toolbar (50:50 Lifeline + Prime X-Ray + Combo Multiplier)
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      // Streak Pill with dynamic multiplier
                                      if (state.currentStreak >= 2)
                                        AnimatedContainer(
                                          duration: AppAnim.normal,
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF2E2008),
                                            borderRadius: BorderRadius.circular(16),
                                            border: Border.all(color: AppColors.primeGold, width: 1.2),
                                            boxShadow: [
                                              BoxShadow(
                                                color: AppColors.primeGold.withOpacity(0.25),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.local_fire_department_rounded, size: 15, color: Color(0xFFFFA724)),
                                              const SizedBox(width: 4),
                                              Text(
                                                'x STREAK (x XP)',
                                                style: GoogleFonts.inter(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 0.2,
                                                  color: const Color(0xFFFFD54F),
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      else
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isDark ? const Color(0xFF131C2E) : const Color(0xFFE2E8F0),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.bolt_rounded, size: 14, color: AppColors.primeBlue),
                                              const SizedBox(width: 4),
                                              Text(
                                                'PRIME ARENA',
                                                style: GoogleFonts.inter(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: isDark ? AppColors.primeBlue : const Color(0xFF0369A1),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),

                                      // Gamification Action Buttons: 50:50 and X-Ray
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          // 50:50 Lifeline Button
                                          ScalePress(
                                            onTap: (state.lifelinesRemaining <= 0 || state.hasUsedLifelineForCurrentQuestion || isAnswered)
                                                ? null
                                                : () {
                                                    final used = context.read<TestEngineCubit>().useFiftyFiftyLifeline();
                                                    if (used) {
                                                      _triggerXpCelebration('⚡ 50:50 Used! 2 Options Eliminated');
                                                    }
                                                  },
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                                              decoration: BoxDecoration(
                                                color: (state.lifelinesRemaining <= 0 || state.hasUsedLifelineForCurrentQuestion)
                                                    ? (isDark ? const Color(0xFF162032) : const Color(0xFFE2E8F0))
                                                    : (isDark ? const Color(0xFF0C243B) : const Color(0xFFE0F2FE)),
                                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                                border: Border.all(
                                                  color: (state.lifelinesRemaining <= 0 || state.hasUsedLifelineForCurrentQuestion)
                                                      ? (isDark ? const Color(0xFF223250) : const Color(0xFFCBD5E1))
                                                      : AppColors.primeBlue,
                                                  width: 1.2,
                                                ),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(
                                                    Icons.bolt_rounded,
                                                    size: 14,
                                                    color: (state.lifelinesRemaining <= 0 || state.hasUsedLifelineForCurrentQuestion)
                                                        ? (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8))
                                                        : AppColors.primeBlue,
                                                  ),
                                                  const SizedBox(width: 3),
                                                  Text(
                                                    '50:50 ()',
                                                    style: GoogleFonts.inter(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w700,
                                                      color: (state.lifelinesRemaining <= 0 || state.hasUsedLifelineForCurrentQuestion)
                                                          ? (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8))
                                                          : AppColors.primeBlue,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),

                                          // Prime X-Ray Hint Button (Practice Mode)
                                          if (isPracticeMode) ...[
                                            const SizedBox(width: 8),
                                            ScalePress(
                                              onTap: () {
                                                setState(() {
                                                  _showHelp = !_showHelp;
                                                });
                                              },
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                                                decoration: BoxDecoration(
                                                  color: _showHelp
                                                      ? AppColors.primeGold
                                                      : (isDark ? const Color(0xFF2E2008) : const Color(0xFFFEF3C7)),
                                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                                  border: Border.all(
                                                    color: AppColors.primeGold,
                                                    width: 1.2,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      _showHelp
                                                          ? Icons.remove_red_eye_rounded
                                                          : Icons.remove_red_eye_outlined,
                                                      size: 14,
                                                      color: _showHelp ? Colors.black : AppColors.primeGold,
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      _showHelp ? 'HIDE X-RAY' : 'X-RAY HINT',
                                                      style: GoogleFonts.inter(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.w800,
                                                        letterSpacing: 0.2,
                                                        color: _showHelp
                                                            ? Colors.black
                                                            : (isDark ? const Color(0xFFFFD54F) : const Color(0xFFB45309)),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),

                                  // Question Card
                                  FrostedCard(
                                    padding: const EdgeInsets.all(16),
                                    child: Text(
                                      questionText,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        height: 1.4,
                                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 10),

                                  // Practice Mode Single-Line Help Hint Banner
                                  if (isPracticeMode && _showHelp)
                                    AnimatedContainer(
                                      duration: AppAnim.normal,
                                      margin: const EdgeInsets.only(bottom: 12),
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF2C2408) : AppColors.googleYellowSurface,
                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                        border: Border.all(
                                          color: AppColors.googleYellow.withOpacity(0.6),
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(
                                            Icons.lightbulb_rounded,
                                            size: 18,
                                            color: AppColors.googleYellow,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  '${l10n.text('help_answer_prefix')}: Option ${currentQ.correctOptionLetter} — ${options[currentQ.correctOptionIndex]}',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                    color: isDark ? const Color(0xFFFFD54F) : const Color(0xFFB06000),
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  currentQ.localizedExplanation(langCode),
                                                  style: GoogleFonts.inter(
                                                    fontSize: 11,
                                                    height: 1.3,
                                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                  // Option List with Practice Immediate Feedback & Strict Exam Mode
                                  ...List.generate(
                                    options.length,
                                    (index) {
                                      final isSelected = selectedOptionIndex == index;
                                      final isEliminated = state.isOptionEliminated(index);
                                      final optionLetter = String.fromCharCode(65 + index);
                                      final optionText = options[index];
                                      final isCorrectOption = currentQ.correctOptionIndex == index;

                                      // Style Determination
                                      Color containerBg = isDark ? AppColors.darkSurface : Colors.white;
                                      Color borderColor = isDark ? AppColors.darkBorder : AppColors.borderLight;
                                      Color textColor = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;
                                      Color circleColor = Colors.transparent;
                                      Color circleBorderColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
                                      Widget circleChild = Text(
                                        optionLetter,
                                        key: const ValueKey('letter'),
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                        ),
                                      );

                                      if (isPracticeMode && isAnswered) {
                                        // Practice Mode: Instant Correct / Incorrect Visual feedback
                                        if (isCorrectOption) {
                                          // Correct Answer Highlight (Green)
                                          containerBg = isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface;
                                          borderColor = AppColors.googleGreen;
                                          textColor = isDark ? const Color(0xFF81C995) : AppColors.googleGreen;
                                          circleColor = AppColors.googleGreen;
                                          circleBorderColor = AppColors.googleGreen;
                                          circleChild = const Icon(Icons.check, size: 14, color: Colors.white);
                                        } else if (isSelected) {
                                          // Student marked incorrect option (Red)
                                          containerBg = isDark ? const Color(0xFF3C1816) : AppColors.googleRedSurface;
                                          borderColor = AppColors.googleRed;
                                          textColor = isDark ? const Color(0xFFF28B82) : AppColors.googleRed;
                                          circleColor = AppColors.googleRed;
                                          circleBorderColor = AppColors.googleRed;
                                          circleChild = const Icon(Icons.close, size: 14, color: Colors.white);
                                        }
                                      } else if (isSelected) {
                                        // Exam Mode or Practice Mode before answering: Neutral Blue selection
                                        containerBg = isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface;
                                        borderColor = isDark ? AppColors.darkBluePrimary : AppColors.googleBlue;
                                        circleColor = isDark ? AppColors.darkBluePrimary : AppColors.googleBlue;
                                        circleBorderColor = Colors.transparent;
                                        circleChild = const Icon(Icons.check, size: 14, color: Colors.white);
                                      }

                                      return Padding(
                                        padding: const EdgeInsets.only(bottom: 12.0),
                                        child: ScalePress(
                                          scale: 0.98,
                                          onTap: isEliminated ? null : () {
                                            final alreadyAnswered = isAnswered;
                                            context.read<TestEngineCubit>().selectOption(index);

                                            // Practice Mode instant gamification feedback
                                            if (isPracticeMode && !alreadyAnswered) {
                                              if (isCorrectOption) {
                                                _correctStreak++;
                                                if (_correctStreak >= 3) {
                                                  _triggerXpCelebration(l10n.text('streak_in_a_row', {'count': '$_correctStreak'}));
                                                } else {
                                                  _triggerXpCelebration(l10n.text('xp_correct'));
                                                }
                                              } else {
                                                _correctStreak = 0;
                                              }
                                            }
                                          },
                                          child: AnimatedContainer(
                                            duration: AppAnim.normal,
                                            curve: Curves.easeOutCubic,
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                            decoration: BoxDecoration(
                                              color: containerBg,
                                              borderRadius: BorderRadius.circular(AppRadius.md),
                                              border: Border.all(
                                                color: borderColor,
                                                width: (isSelected || (isPracticeMode && isAnswered && isCorrectOption)) ? 2.0 : 1.2,
                                              ),
                                              boxShadow: isSelected
                                                  ? [
                                                      BoxShadow(
                                                        color: (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue).withOpacity(0.15),
                                                        blurRadius: 6,
                                                        offset: const Offset(0, 2),
                                                      ),
                                                    ]
                                                  : null,
                                            ),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.center,
                                              children: [
                                                AnimatedContainer(
                                                  duration: AppAnim.normal,
                                                  width: 32,
                                                  height: 32,
                                                  decoration: BoxDecoration(
                                                    shape: BoxShape.circle,
                                                    color: circleColor,
                                                    border: Border.all(
                                                      color: circleBorderColor,
                                                      width: 1.8,
                                                    ),
                                                  ),
                                                  child: Center(
                                                    child: AnimatedSwitcher(
                                                      duration: AppAnim.fast,
                                                      child: circleChild,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 14),
                                                Expanded(
                                                  child: Text(
                                                    optionText,
                                                    style: GoogleFonts.inter(
                                                      fontSize: 15,
                                                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                                      color: isEliminated ? textColor.withOpacity(0.35) : textColor,
                                                      height: 1.3,
                                                      decoration: isEliminated ? TextDecoration.lineThrough : null,
                                                    ),
                                                  ),
                                                ),
                                                if (isPracticeMode && isAnswered && isCorrectOption)
                                                  const Icon(Icons.check_circle_rounded, size: 22, color: AppColors.googleGreen),
                                                if (isPracticeMode && isAnswered && isSelected && !isCorrectOption)
                                                  const Icon(Icons.cancel_rounded, size: 22, color: AppColors.googleRed),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 8),

                                  // Subtle swipe indicator hint
                                  Center(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.swipe_outlined,
                                          size: 14,
                                          color: isDark ? AppColors.darkTextSecondary.withOpacity(0.6) : AppColors.textTertiary,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Swipe left or right to change questions',
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            color: isDark ? AppColors.darkTextSecondary.withOpacity(0.6) : AppColors.textTertiary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Clean, High-Contrast Bottom Action Bar
                      RepaintBoundary(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.white,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.06),
                                blurRadius: 6,
                                offset: const Offset(0, -2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              // Bookmark Question
                              BlocBuilder<BookmarksCubit, BookmarksState>(
                                builder: (context, bState) {
                                  final isSaved = bState.isBookmarked(currentQ.id);
                                  return ScalePress(
                                    scale: 0.9,
                                    onTap: () async {
                                      final isNowSaved = await context.read<BookmarksCubit>().toggleBookmark(currentQ.id);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              isNowSaved
                                                  ? l10n.text('bookmark_added')
                                                  : l10n.text('bookmark_removed'),
                                            ),
                                            duration: const Duration(seconds: 1),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: isSaved
                                            ? (isDark ? const Color(0xFF3B2F0B) : const Color(0xFFFEF3C7))
                                            : (isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F5F9)),
                                        borderRadius: BorderRadius.circular(AppRadius.md),
                                      ),
                                      child: Icon(
                                        isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                                        size: 22,
                                        color: isSaved
                                            ? const Color(0xFFD97706)
                                            : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(width: 10),

                              // Back Button
                              if (state.currentIndex > 0)
                                OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    side: BorderSide(
                                      color: isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  ),
                                  onPressed: () => context.read<TestEngineCubit>().previousQuestion(),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.arrow_back_rounded, size: 16),
                                      const SizedBox(width: 4),
                                      Text(
                                        l10n.text('btn_back'),
                                        style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                              const Spacer(),

                              // Prominent Next or Submit Button
                              if (state.currentIndex < state.totalQuestions - 1)
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2563EB),
                                    foregroundColor: Colors.white,
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                                  ),
                                  onPressed: () => context.read<TestEngineCubit>().nextQuestion(),
                                  child: Row(
                                    children: [
                                      Text(
                                        l10n.text('btn_next'),
                                        style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Icon(Icons.arrow_forward_rounded, size: 18),
                                    ],
                                  ),
                                )
                              else
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF059669),
                                    foregroundColor: Colors.white,
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                                  ),
                                  onPressed: () => _showSubmitConfirmationDialog(context, state),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle_rounded, size: 18),
                                      const SizedBox(width: 6),
                                      Text(
                                        l10n.text('btn_submit'),
                                        style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Floating Gamification XP / Streak Celebration Toast
                  if (_recentXpMessage != null && _celebrationScaleAnim != null)
                    Positioned(
                      top: 16,
                      left: 20,
                      right: 20,
                      child: Center(
                        child: ScaleTransition(
                          scale: _celebrationScaleAnim!,
                          child: Container(
                            constraints: const BoxConstraints(maxWidth: 340),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF00A8E1), Color(0xFFFFA724)],
                              ),
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF7C3AED).withOpacity(0.4),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.auto_awesome, color: Color(0xFFFFD700), size: 18),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    _recentXpMessage!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ),
      );
    },
    );
  }

  void _showQuestionPaletteSheet(BuildContext context, TestEngineState state) {
    final cubit = context.read<TestEngineCubit>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.text('questions_overview'),
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
              const SizedBox(height: AppSpacing.sm),
              // Legend
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _PaletteLegendItem(
                    color: AppColors.googleGreen,
                    label: '${l10n.text('legend_answered')} (${state.answeredCount})',
                  ),
                  _PaletteLegendItem(
                    color: isDark ? AppColors.darkTextSecondary : AppColors.borderLight,
                    label: '${l10n.text('legend_left')} (${state.unansweredCount})',
                  ),
                  _PaletteLegendItem(
                    color: AppColors.googleYellow,
                    label: '${l10n.text('legend_flagged')} (${state.flaggedCount})',
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  itemCount: state.totalQuestions,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 5,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.3,
                  ),
                  itemBuilder: (context, index) {
                    final q = state.test.questions[index];
                    final isAnswered = state.isQuestionAnswered(q.id);
                    final isFlagged = state.isQuestionFlagged(q.id);
                    final isCurrent = state.currentIndex == index;

                    Color bgColor;
                    if (isFlagged) {
                      bgColor = isDark
                          ? const Color(0xFF3B2F0B)
                          : AppColors.googleYellowSurface;
                    } else if (isAnswered) {
                      bgColor = isDark
                          ? const Color(0xFF13381B)
                          : AppColors.googleGreenSurface;
                    } else {
                      bgColor = isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4);
                    }

                    Color borderColor;
                    if (isCurrent) {
                      borderColor = isDark ? AppColors.darkBluePrimary : AppColors.googleBlue;
                    } else if (isFlagged) {
                      borderColor = AppColors.googleYellow;
                    } else if (isAnswered) {
                      borderColor = AppColors.googleGreen;
                    } else {
                      borderColor = isDark ? AppColors.darkBorder : AppColors.borderLight;
                    }

                    return InkWell(
                      onTap: () {
                        cubit.goToQuestion(index);
                        Navigator.of(sheetCtx).pop();
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        decoration: BoxDecoration(
                          color: bgColor,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: borderColor, width: isCurrent ? 2 : 1),
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: RoyalButton(
                  text: '${l10n.text('btn_submit')} (${state.answeredCount}/${state.totalQuestions})',
                  onPressed: () {
                    Navigator.of(sheetCtx).pop();
                    _showSubmitConfirmationDialog(context, state);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSubmitConfirmationDialog(BuildContext context, TestEngineState state) {
    final cubit = context.read<TestEngineCubit>();
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        title: Text(
          l10n.text('dialog_submit_title'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w500),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.text('dialog_submit_desc'),
              style: GoogleFonts.inter(),
            ),
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.googleBlueBorder,
                ),
              ),
              child: Column(
                children: [
                  _SummaryRow(label: 'Total Questions', value: '${state.totalQuestions}'),
                  _SummaryRow(label: 'Answered', value: '${state.answeredCount}', color: AppColors.googleGreen),
                  _SummaryRow(label: 'Unanswered', value: '${state.unansweredCount}', color: state.unansweredCount > 0 ? AppColors.googleRed : null),
                  _SummaryRow(label: 'Marked for Review', value: '${state.flaggedCount}', color: AppColors.googleYellow),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(l10n.text('btn_keep_testing')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              cubit.submitTest();
            },
            child: Text(l10n.text('btn_confirm_submit')),
          ),
        ],
      ),
    );
  }
}

class _TimerWidget extends StatelessWidget {
  const _TimerWidget();

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: BlocSelector<TestEngineCubit, TestEngineState, int>(
        selector: (state) => state.remainingSeconds,
        builder: (context, remainingSeconds) {
          final isLowTime = remainingSeconds < 300;
          final isUrgent = remainingSeconds < 60;

          Color timerColor = AppColors.textPrimary;
          Color timerBg = AppColors.googleBlueSurface;

          if (isUrgent) {
            timerColor = AppColors.googleRed;
            timerBg = AppColors.googleRedSurface;
          } else if (isLowTime) {
            timerColor = AppColors.googleYellow;
            timerBg = AppColors.googleYellowSurface;
          }

          final minutes = (remainingSeconds ~/ 60).toString().padLeft(2, '0');
          final seconds = (remainingSeconds % 60).toString().padLeft(2, '0');
          final timeString = '$minutes:$seconds';

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: timerBg,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: timerColor.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.timer_outlined, size: 14, color: timerColor),
                const SizedBox(width: 4),
                Text(
                  timeString,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: timerColor,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _PaletteLegendItem extends StatelessWidget {
  const _PaletteLegendItem({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w400),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value, this.color});

  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: color ?? AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
