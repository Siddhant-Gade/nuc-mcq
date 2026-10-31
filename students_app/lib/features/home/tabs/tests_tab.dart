import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/scale_press.dart';
import '../../question_bank/models/question_model.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../../results/repository/results_repository.dart';
import '../../test_engine/cubit/test_engine_cubit.dart';
import '../../test_engine/screens/test_config_dialog.dart';
import '../../test_engine/screens/test_screen.dart';
import '../../test_engine/services/test_generator.dart';

/// Design palette and theme tokens tailored to match the target UI design.
class _TestsPalette {
  _TestsPalette._();

  static const Color primaryBlue = Color(0xFF1D72FE);
  static const Color deepNavy = Color(0xFF0F172A);
  static const Color pageBg = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF64748B);

  // Dark Mode Tokens
  static const Color darkPageBg = Color(0xFF121214);
  static const Color darkTextPrimary = Color(0xFFF1F5F9);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
}

/// Visual theme configuration for each subject card matching Image 2.
class _TopicVisualConfig {
  final Color cardBg;
  final Color border;
  final Color badgeBg;
  final Color badgeText;
  final Color arrowBg;
  final Color arrowColor;
  final Color darkCardBg;
  final Color darkBorder;

  const _TopicVisualConfig({
    required this.cardBg,
    required this.border,
    required this.badgeBg,
    required this.badgeText,
    required this.arrowBg,
    required this.arrowColor,
    required this.darkCardBg,
    required this.darkBorder,
  });
}

_TopicVisualConfig _getTopicVisualConfig(QuestionTopic topic) {
  switch (topic) {
    case QuestionTopic.computerFundamentals:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFF2F7FE),
        border: Color(0xFFDCE8FC),
        badgeBg: Color(0xFFE0EDFE),
        badgeText: Color(0xFF1D72FE),
        arrowBg: Color(0xFFE0EDFE),
        arrowColor: Color(0xFF1D72FE),
        darkCardBg: Color(0xFF14223A),
        darkBorder: Color(0xFF1E3557),
      );
    case QuestionTopic.os:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFF2FBF6),
        border: Color(0xFFD6F5E4),
        badgeBg: Color(0xFFE2F7EB),
        badgeText: Color(0xFF059669),
        arrowBg: Color(0xFFE2F7EB),
        arrowColor: Color(0xFF059669),
        darkCardBg: Color(0xFF132B22),
        darkBorder: Color(0xFF1D4435),
      );
    case QuestionTopic.excel:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFF2FBF6),
        border: Color(0xFFD6F5E4),
        badgeBg: Color(0xFFE2F7EB),
        badgeText: Color(0xFF047857),
        arrowBg: Color(0xFFE2F7EB),
        arrowColor: Color(0xFF047857),
        darkCardBg: Color(0xFF132B22),
        darkBorder: Color(0xFF1D4435),
      );
    case QuestionTopic.word:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFF4F6FE),
        border: Color(0xFFDFE4FC),
        badgeBg: Color(0xFFE6E9FD),
        badgeText: Color(0xFF3846D4),
        arrowBg: Color(0xFFE6E9FD),
        arrowColor: Color(0xFF3846D4),
        darkCardBg: Color(0xFF19203E),
        darkBorder: Color(0xFF27315E),
      );
    case QuestionTopic.powerpoint:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFFFF7ED),
        border: Color(0xFFFEE6CD),
        badgeBg: Color(0xFFFFEDD5),
        badgeText: Color(0xFFEA580C),
        arrowBg: Color(0xFFFFEDD5),
        arrowColor: Color(0xFFEA580C),
        darkCardBg: Color(0xFF2E1C14),
        darkBorder: Color(0xFF4C2A1E),
      );
    case QuestionTopic.outlook:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFF0F9FF),
        border: Color(0xFFDCECFB),
        badgeBg: Color(0xFFE0F2FE),
        badgeText: Color(0xFF0284C7),
        arrowBg: Color(0xFFE0F2FE),
        arrowColor: Color(0xFF0284C7),
        darkCardBg: Color(0xFF11263B),
        darkBorder: Color(0xFF1A3D5E),
      );
    case QuestionTopic.internet:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFFAF5FF),
        border: Color(0xFFECE0FD),
        badgeBg: Color(0xFFF3E8FF),
        badgeText: Color(0xFF7C3AED),
        arrowBg: Color(0xFFF3E8FF),
        arrowColor: Color(0xFF7C3AED),
        darkCardBg: Color(0xFF241738),
        darkBorder: Color(0xFF3E2363),
      );
    case QuestionTopic.pagemaker:
      return const _TopicVisualConfig(
        cardBg: Color(0xFFFFF1F2),
        border: Color(0xFFFDD9DE),
        badgeBg: Color(0xFFFFE4E6),
        badgeText: Color(0xFFE11D48),
        arrowBg: Color(0xFFFFE4E6),
        arrowColor: Color(0xFFE11D48),
        darkCardBg: Color(0xFF2D141A),
        darkBorder: Color(0xFF4D1E28),
      );
  }
}

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
  bool _isLaunchingExam = false;

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

  Future<void> _startMockExam() async {
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

  String _getTopicDisplayTitle(QuestionTopic topic, String langCode) {
    if (langCode == 'mr') return topic.labelMr;
    if (langCode == 'hi') return topic.labelHi;
    if (topic == QuestionTopic.os) return 'Windows OS';
    return topic.label;
  }

  String _getTopicDescription(QuestionTopic topic) {
    switch (topic) {
      case QuestionTopic.computerFundamentals:
        return 'Hardware, Memory, CPU &\nArchitecture';
      case QuestionTopic.os:
        return 'Windows, File System,\nOS Settings';
      case QuestionTopic.excel:
        return 'Formulas, Spreadsheets,\nFunctions & More';
      case QuestionTopic.word:
        return 'Documents, Formatting,\nLayout & Tools';
      case QuestionTopic.powerpoint:
        return 'Slides, Presentations,\nAnimations & Design';
      case QuestionTopic.outlook:
        return 'Email, Scheduling,\nContacts & More';
      case QuestionTopic.internet:
        return 'Browsing, Web Safety,\nCloud & Search';
      case QuestionTopic.pagemaker:
        return 'Desktop Publishing,\nLayouts & Typography';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final topicCounts = widget.questionBank.getTopicCounts();

    return Scaffold(
      backgroundColor: isDark ? _TestsPalette.darkPageBg : _TestsPalette.pageBg,
      body: RefreshIndicator(
        color: _TestsPalette.primaryBlue,
        onRefresh: _sync,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1040),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Section 1: Page Header with Title and Refresh Action
                    _buildHeader(context, isDark, l10n),
                    const SizedBox(height: 18),

                    // Section 2: Prominent Full Mock Exam Card
                    _buildMockExamCard(context, isDark),
                    const SizedBox(height: 24),

                    // Section 3: Practice by Subject Header
                    _buildSectionHeader(context, isDark),
                    const SizedBox(height: 14),

                    // Section 4: Modern Pastel Subject Cards Grid
                    _buildSubjectGrid(context, isDark, langCode, topicCounts),

                    // Generous bottom padding to ensure clean scroll above bottom navigation
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Page Header displaying "Tests" and aligned Refresh action matching Image 2.
  Widget _buildHeader(
    BuildContext context,
    bool isDark,
    AppLocalizations l10n,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.text('tab_tests'),
              style: GoogleFonts.inter(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: isDark
                    ? _TestsPalette.darkTextPrimary
                    : _TestsPalette.deepNavy,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Practice and prepare for your MS-CIT exam',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w400,
                color: isDark
                    ? _TestsPalette.darkTextSecondary
                    : _TestsPalette.textSecondary,
              ),
            ),
          ],
        ),
        ScalePress(
          onTap: _isSyncing ? null : _sync,
          child: Tooltip(
            message: 'Refresh Questions',
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 7.5,
              ),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF334155)
                      : const Color(0xFFE2E8F0),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_isSyncing)
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    Icon(
                      Icons.sync_rounded,
                      size: 16,
                      color: isDark
                          ? _TestsPalette.darkTextPrimary
                          : _TestsPalette.deepNavy,
                    ),
                  const SizedBox(width: 5),
                  Text(
                    _isSyncing ? 'Syncing...' : 'Refresh',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? _TestsPalette.darkTextPrimary
                          : _TestsPalette.deepNavy,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Full Mock Exam card matching Image 2 with exam illustration, metadata pills, and Start Exam CTA.
  Widget _buildMockExamCard(BuildContext context, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF122238), const Color(0xFF0F1E33)]
              : [const Color(0xFFF3F8FF), const Color(0xFFE8F2FE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF1D3557) : const Color(0xFFD6E6FD),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1D72FE).withOpacity(isDark ? 0.2 : 0.08),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Row: Leading Clipboard Icon + Title + Illustration on the right
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Clipboard Icon squircle
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF1C3454)
                      : const Color(0xFFE0EEFF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark
                        ? const Color(0xFF2563EB).withOpacity(0.4)
                        : const Color(0xFFBFDBFE),
                    width: 1,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.assignment_turned_in_rounded,
                    color: Color(0xFF1D72FE),
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Title, Badge, and Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Recommended Tag
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF38290E) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        'OFFICIAL ASSESSMENT',
                        style: GoogleFonts.inter(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                          color: isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Full Mock Exam',
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: isDark
                            ? _TestsPalette.darkTextPrimary
                            : _TestsPalette.deepNavy,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Practice under real MS-CIT exam conditions',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: isDark
                            ? _TestsPalette.darkTextSecondary
                            : _TestsPalette.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // Visual Exam Illustration (Exam sheet + Mortarboard + Clock)
              _buildMockExamIllustration(isDark),
            ],
          ),
          const SizedBox(height: 12),

          // Metadata Chips Row (25 Questions, 30 Minutes, Official Pattern)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _buildMetadataChip(
                icon: Icons.description_outlined,
                label: '25 Questions',
                isDark: isDark,
              ),
              _buildMetadataChip(
                icon: Icons.access_time_rounded,
                label: '30 Minutes',
                isDark: isDark,
              ),
              _buildMetadataChip(
                icon: Icons.verified_outlined,
                label: 'Official Pattern',
                isDark: isDark,
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Start Exam Button matching Image 2 ("▶ Start Exam →")
          ScalePress(
            onTap: _isLaunchingExam ? null : _startMockExam,
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1D72FE), Color(0xFF155DFC)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D72FE).withOpacity(0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: _isLaunchingExam
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Start Exam',
                            style: GoogleFonts.inter(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                            size: 16,
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Exam illustration rendering the checklist, mortarboard, and timer clock from Image 2.
  Widget _buildMockExamIllustration(bool isDark) {
    return SizedBox(
      width: 76,
      height: 70,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Checklist Sheet
          Positioned(
            left: 8,
            top: 6,
            child: Container(
              width: 44,
              height: 52,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2D44) : Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF2A4366)
                      : const Color(0xFFDCEAFE),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D72FE).withOpacity(0.08),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildCheckRow(isDark),
                  _buildCheckRow(isDark),
                  _buildCheckRow(isDark),
                ],
              ),
            ),
          ),
          // Graduation Cap on Top Right of Checklist
          Positioned(
            top: 0,
            right: 8,
            child: Transform.rotate(
              angle: 0.1,
              child: const Icon(
                Icons.school_rounded,
                color: Color(0xFF1D4ED8),
                size: 30,
              ),
            ),
          ),
          // Analog Clock Timer on Bottom Right
          Positioned(
            bottom: 2,
            right: 0,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2D44) : Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF3B82F6), width: 2.2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1D72FE).withOpacity(0.18),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 3,
                      height: 3,
                      decoration: const BoxDecoration(
                        color: Color(0xFF1D4ED8),
                        shape: BoxShape.circle,
                      ),
                    ),
                    Positioned(
                      top: 5,
                      child: Container(
                        width: 1.5,
                        height: 7,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1D4ED8),
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 5,
                      child: Container(
                        width: 6,
                        height: 1.5,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1D4ED8),
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckRow(bool isDark) {
    return Row(
      children: [
        Container(
          width: 7.5,
          height: 7.5,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            borderRadius: BorderRadius.circular(2),
          ),
          child: const Icon(Icons.check, size: 6, color: Colors.white),
        ),
        const SizedBox(width: 3.5),
        Expanded(
          child: Container(
            height: 2,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF3B567D) : const Color(0xFFBFDBFE),
              borderRadius: BorderRadius.circular(1),
            ),
          ),
        ),
      ],
    );
  }

  /// Metadata chip for exam properties matching Image 2.
  Widget _buildMetadataChip({
    required IconData icon,
    required String label,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2942) : Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? const Color(0xFF2D436B) : const Color(0xFFD6E4FB),
          width: 0.9,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF1D72FE)),
          const SizedBox(width: 4.5),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  /// Section Header: Practice by Subject with Custom Mix action.
  Widget _buildSectionHeader(BuildContext context, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Practice by Subject',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isDark
                      ? _TestsPalette.darkTextPrimary
                      : _TestsPalette.deepNavy,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Choose a subject to sharpen your skills',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  color: isDark
                      ? _TestsPalette.darkTextSecondary
                      : _TestsPalette.textSecondary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
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
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A2E4C) : const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isDark
                    ? const Color(0xFF2563EB).withOpacity(0.5)
                    : const Color(0xFFBFDBFE),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.tune_rounded,
                  size: 15,
                  color: Color(0xFF1D72FE),
                ),
                const SizedBox(width: 5),
                Text(
                  'Custom Mix',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1D72FE),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Responsive pastel Subject Cards Grid matching Image 2.
  Widget _buildSubjectGrid(
    BuildContext context,
    bool isDark,
    String langCode,
    Map<QuestionTopic, int> topicCounts,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        int crossAxisCount = 2;
        double childAspectRatio = 0.94;
        double spacing = 12;

        if (width >= 960) {
          crossAxisCount = 4;
          childAspectRatio = 1.05;
          spacing = 16;
        } else if (width >= 640) {
          crossAxisCount = 3;
          childAspectRatio = 1.0;
          spacing = 14;
        } else {
          crossAxisCount = 2;
          // Responsive aspect ratio on mobile to match the spacious portrait cards in Image 2
          childAspectRatio = width < 360 ? 0.88 : (width < 400 ? 0.93 : 0.96);
          spacing = 12;
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: QuestionTopic.values.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: spacing,
            mainAxisSpacing: spacing,
            childAspectRatio: childAspectRatio,
          ),
          itemBuilder: (context, index) {
            final topic = QuestionTopic.values[index];
            final count = topicCounts[topic] ?? 0;
            final label = _getTopicDisplayTitle(topic, langCode);
            return _buildSubjectCard(
              context: context,
              topic: topic,
              label: label,
              count: count,
              isDark: isDark,
            );
          },
        );
      },
    );
  }

  /// Modern pastel Subject Card matching Image 2 with large recognizable icon,
  /// question count badge, title, 2-line description, and circular arrow.
  Widget _buildSubjectCard({
    required BuildContext context,
    required QuestionTopic topic,
    required String label,
    required int count,
    required bool isDark,
  }) {
    final visuals = _getTopicVisualConfig(topic);
    final description = _getTopicDescription(topic);

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
          color: isDark ? visuals.darkCardBg : visuals.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? visuals.darkBorder : visuals.border,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF172B4D).withOpacity(isDark ? 0.2 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Large recognizable Subject Icon + Question Count Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSubjectBrandIcon(topic),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 3.5,
                  ),
                  decoration: BoxDecoration(
                    color: visuals.badgeBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: visuals.border, width: 0.8),
                  ),
                  child: Text(
                    count > 0 ? '$count Qs' : '0 Qs',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: visuals.badgeText,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Subject Title
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: isDark
                    ? _TestsPalette.darkTextPrimary
                    : _TestsPalette.deepNavy,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 4),

            // Subject Description (2 lines without awkward truncation)
            Text(
              description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: isDark
                    ? _TestsPalette.darkTextSecondary
                    : _TestsPalette.textSecondary,
                height: 1.25,
              ),
            ),

            const Spacer(),

            // Bottom Right: Circular Arrow Action Button matching Image 2
            Align(
              alignment: Alignment.bottomRight,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: visuals.arrowBg,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    Icons.arrow_forward_rounded,
                    size: 14,
                    color: visuals.arrowColor,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Builds the large, recognizable, beautiful brand icons matching Image 2.
  Widget _buildSubjectBrandIcon(QuestionTopic topic) {
    switch (topic) {
      case QuestionTopic.computerFundamentals:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE0EDFE),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 28,
                  height: 19,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1D72FE),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Center(
                    child: Container(
                      width: 22,
                      height: 13,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEBF3FE),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: Center(
                        child: Container(
                          width: 5,
                          height: 5,
                          decoration: const BoxDecoration(
                            color: Color(0xFF1D72FE),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Container(width: 4, height: 3, color: const Color(0xFF155DFC)),
                Container(
                  width: 14,
                  height: 2.5,
                  decoration: BoxDecoration(
                    color: const Color(0xFF155DFC),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ],
            ),
          ),
        );

      case QuestionTopic.os:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE2F7EB),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: SizedBox(
              width: 25,
              height: 25,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSquare(const Color(0xFF10B981)),
                      _buildSquare(const Color(0xFF10B981)),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSquare(const Color(0xFF10B981)),
                      _buildSquare(const Color(0xFF10B981)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );

      case QuestionTopic.excel:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE2F7EB),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 26,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF107C41),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      padding: const EdgeInsets.all(3),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [_buildGridDot(), _buildGridDot()],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [_buildGridDot(), _buildGridDot()],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    top: 2,
                    width: 17,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0E5C31),
                        borderRadius: BorderRadius.circular(3.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 3,
                            offset: const Offset(1, 1),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          'X',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
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

      case QuestionTopic.word:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE6E9FD),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 26,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF185ABD),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 4,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 12,
                            height: 2,
                            color: Colors.white.withOpacity(0.7),
                          ),
                          Container(
                            width: 10,
                            height: 2,
                            color: Colors.white.withOpacity(0.7),
                          ),
                          Container(
                            width: 14,
                            height: 2,
                            color: Colors.white.withOpacity(0.7),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    top: 2,
                    width: 17,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF103F80),
                        borderRadius: BorderRadius.circular(3.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 3,
                            offset: const Offset(1, 1),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          'W',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
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

      case QuestionTopic.powerpoint:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFFFEDD5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 26,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFD83B01),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white.withOpacity(0.8),
                              width: 2,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    top: 2,
                    width: 17,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF982600),
                        borderRadius: BorderRadius.circular(3.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 3,
                            offset: const Offset(1, 1),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          'P',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
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

      case QuestionTopic.outlook:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFE0F2FE),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 26,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0078D4),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: Icon(
                          Icons.mail_outline_rounded,
                          color: Colors.white.withOpacity(0.9),
                          size: 14,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    top: 2,
                    width: 17,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF004D8C),
                        borderRadius: BorderRadius.circular(3.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 3,
                            offset: const Offset(1, 1),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          'O',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
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

      case QuestionTopic.internet:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFF3E8FF),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Icon(
              Icons.language_rounded,
              color: Color(0xFF7C3AED),
              size: 26,
            ),
          ),
        );

      case QuestionTopic.pagemaker:
        return Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFFFE4E6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Icon(
              Icons.auto_stories_rounded,
              color: Color(0xFFE11D48),
              size: 26,
            ),
          ),
        );
    }
  }

  Widget _buildSquare(Color color) {
    return Container(
      width: 11.5,
      height: 11.5,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2.5),
      ),
    );
  }

  Widget _buildGridDot() {
    return Container(
      width: 6,
      height: 4,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(1),
      ),
    );
  }

  /// Bottom sheet for selecting practice question count.
  void _showTopicPracticeSheet(
    BuildContext context,
    QuestionTopic topic,
    String label,
    int availableCount,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final baseOptions = [5, 10, 15, 20, 25, 30, 50];
    final countOptions = baseOptions
        .where((opt) => opt < availableCount)
        .toList();
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
      backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF2E2E33)
                              : const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _buildSubjectBrandIcon(topic),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                label,
                                style: GoogleFonts.inter(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: isDark
                                      ? _TestsPalette.darkTextPrimary
                                      : _TestsPalette.deepNavy,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$availableCount questions available for practice',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: isDark
                                      ? _TestsPalette.darkTextSecondary
                                      : _TestsPalette.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.close_rounded,
                            size: 20,
                            color: isDark
                                ? _TestsPalette.darkTextSecondary
                                : _TestsPalette.textSecondary,
                          ),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(
                      height: 1,
                      color: isDark
                          ? const Color(0xFF2E2E33)
                          : const Color(0xFFE2E8F0),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Select Number of Questions',
                      style: GoogleFonts.inter(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? _TestsPalette.darkTextPrimary
                            : _TestsPalette.deepNavy,
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
                          borderRadius: BorderRadius.circular(10),
                          onTap: () {
                            setModalState(() => selectedCount = opt);
                          },
                          child: AnimatedContainer(
                            duration: AppAnim.fast,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8.5,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? (isDark
                                        ? const Color(0xFF1E3A5F)
                                        : const Color(0xFFEFF6FF))
                                  : (isDark
                                        ? const Color(0xFF1A2638)
                                        : const Color(0xFFF8FAFC)),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF1D72FE)
                                    : (isDark
                                          ? const Color(0xFF283A54)
                                          : const Color(0xFFE2E8F0)),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Text(
                              isAll ? 'All ($opt Qs)' : '$opt Qs',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? const Color(0xFF1D72FE)
                                    : (isDark
                                          ? _TestsPalette.darkTextPrimary
                                          : _TestsPalette.deepNavy),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1A2638)
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isDark
                              ? const Color(0xFF2B3D58)
                              : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.tips_and_updates_outlined,
                            size: 18,
                            color: Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Instant hints, answers & full explanations included.',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
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
                    ScalePress(
                      onTap: () {
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
                      child: Container(
                        height: 46,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1D72FE), Color(0xFF155DFC)],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF1D72FE).withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Start Practice ($selectedCount Questions)',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
