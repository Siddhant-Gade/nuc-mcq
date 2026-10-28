import 'dart:async';
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
import '../../study_materials/models/study_material_model.dart';
import '../models/question_model.dart';
import '../repository/question_bank_repository.dart';

class AllQuestionsScreen extends StatefulWidget {
  const AllQuestionsScreen({super.key, this.initialTabIndex = 0});

  final int initialTabIndex;

  @override
  State<AllQuestionsScreen> createState() => _AllQuestionsScreenState();
}

class _AllQuestionsScreenState extends State<AllQuestionsScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  QuestionTopic? _selectedTopic;
  String _searchQuery = '';
  bool _isSyncing = false;

  Future<void> _syncQuestions() async {
    setState(() => _isSyncing = true);
    try {
      final qb = context.read<QuestionBankRepository>();
      final count = await qb.syncFromBackend();
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              count > 0
                  ? 'Successfully downloaded $count questions for 100% offline practice!'
                  : 'No questions currently uploaded on the server.',
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
            content: Text('Could not reach server. Using offline cache.'),
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

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 150), () {
      if (mounted) {
        setState(() => _searchQuery = val.trim());
      }
    });
  }

  List<QuestionModel> _filterQuestions(
    List<QuestionModel> questions,
    String langCode,
  ) {
    return questions.where((q) {
      if (_selectedTopic != null && q.topic != _selectedTopic) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final text = q.localizedQuestionText(langCode).toLowerCase();
        final explanation = q.localizedExplanation(langCode).toLowerCase();
        final options = q
            .localizedOptions(langCode)
            .map((o) => o.toLowerCase())
            .join(' ');
        final topic = q.topic.localizedLabel(langCode).toLowerCase();

        return text.contains(query) ||
            explanation.contains(query) ||
            options.contains(query) ||
            topic.contains(query) ||
            q.id.toLowerCase().contains(query);
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final questionBank = context.read<QuestionBankRepository>();
    final allQuestions = questionBank.getAllQuestions();

    if (allQuestions.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.text('all_questions_title')),
          actions: [
            IconButton(
              icon: _isSyncing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.sync_rounded),
              tooltip: 'Sync Questions',
              onPressed: _isSyncing ? null : _syncQuestions,
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkSurfaceVariant
                        : const Color(0xFFE8F0FE),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.quiz_outlined,
                    size: 54,
                    color: isDark
                        ? AppColors.darkBluePrimary
                        : AppColors.googleBlue,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Questions Not Uploaded Yet',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.darkTextPrimary
                        : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'The question bank has not been uploaded by your instructor yet. All topics and practice tests will appear here once published.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.4,
                    color: isDark
                        ? AppColors.darkTextSecondary
                        : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                RoyalButton(
                  text: _isSyncing
                      ? 'Downloading...'
                      : 'Check & Download Questions',
                  icon: Icons.cloud_download_outlined,
                  isLoading: _isSyncing,
                  onPressed: _isSyncing ? null : _syncQuestions,
                ),
              ],
            ),
          ),
        ),
      );
    }

    final filteredQuestions = _filterQuestions(allQuestions, langCode);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('all_questions_title')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: _isSyncing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync_rounded),
            tooltip: 'Sync Questions',
            onPressed: _isSyncing ? null : _syncQuestions,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : Colors.white,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                  width: 1,
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  style: GoogleFonts.inter(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: l10n.text('search_questions_hint'),
                    hintStyle: GoogleFonts.inter(
                      fontSize: 13,
                      color: isDark
                          ? AppColors.darkTextSecondary
                          : AppColors.textTertiary,
                    ),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: isDark
                        ? AppColors.darkSurfaceVariant
                        : const Color(0xFFF1F3F4),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Horizontal Topic Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(l10n.text('all_topics')),
                          selected: _selectedTopic == null,
                          showCheckmark: false,
                          selectedColor: isDark
                              ? AppColors.darkBlueSurface
                              : AppColors.googleBlueSurface,
                          backgroundColor: isDark
                              ? AppColors.darkSurfaceVariant
                              : const Color(0xFFF8F9FA),
                          side: BorderSide(
                            color: _selectedTopic == null
                                ? (isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue)
                                : (isDark
                                      ? AppColors.darkBorder
                                      : AppColors.borderLight),
                          ),
                          labelStyle: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: _selectedTopic == null
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: _selectedTopic == null
                                ? (isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue)
                                : (isDark
                                      ? AppColors.darkTextPrimary
                                      : AppColors.textPrimary),
                          ),
                          onSelected: (_) =>
                              setState(() => _selectedTopic = null),
                        ),
                      ),
                      ...QuestionTopic.values.map((topic) {
                        final isSelected = _selectedTopic == topic;
                        final label = topic.localizedLabel(langCode);

                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: FilterChip(
                            label: Text(label),
                            selected: isSelected,
                            showCheckmark: false,
                            selectedColor: isDark
                                ? AppColors.darkBlueSurface
                                : AppColors.googleBlueSurface,
                            backgroundColor: isDark
                                ? AppColors.darkSurfaceVariant
                                : const Color(0xFFF8F9FA),
                            side: BorderSide(
                              color: isSelected
                                  ? (isDark
                                        ? AppColors.darkBluePrimary
                                        : AppColors.googleBlue)
                                  : (isDark
                                        ? AppColors.darkBorder
                                        : AppColors.borderLight),
                            ),
                            labelStyle: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: isSelected
                                  ? (isDark
                                        ? AppColors.darkBluePrimary
                                        : AppColors.googleBlue)
                                  : (isDark
                                        ? AppColors.darkTextPrimary
                                        : AppColors.textPrimary),
                            ),
                            onSelected: (_) => setState(() {
                              _selectedTopic = isSelected ? null : topic;
                            }),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Question Count Subheader
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: isDark
                ? AppColors.darkSurfaceVariant.withOpacity(0.5)
                : const Color(0xFFF8FAFC),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  filteredQuestions.length == allQuestions.length
                      ? '${allQuestions.length} Questions'
                      : '${filteredQuestions.length} of ${allQuestions.length} Questions',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.darkTextSecondary
                        : const Color(0xFF64748B),
                  ),
                ),
                if (_selectedTopic != null)
                  Text(
                    _selectedTopic!.localizedLabel(langCode),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark
                          ? AppColors.darkBluePrimary
                          : AppColors.googleBlue,
                    ),
                  ),
              ],
            ),
          ),

          // Question List
          Expanded(
            child: _buildQuestionList(context, filteredQuestions, langCode),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionList(
    BuildContext context,
    List<QuestionModel> questions,
    String langCode,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (questions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.search_off_rounded,
                size: 40,
                color: isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.textSecondary,
              ),
              const SizedBox(height: 8),
              Text(
                'No matching questions found',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark
                      ? AppColors.darkTextPrimary
                      : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: questions.length,
      itemBuilder: (context, index) {
        final q = questions[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: RepaintBoundary(
            child: InteractiveQuestionExplorerCard(
              question: q,
              langCode: langCode,
              index: index + 1,
            ),
          ),
        );
      },
    );
  }
}

class InteractiveQuestionExplorerCard extends StatefulWidget {
  const InteractiveQuestionExplorerCard({
    super.key,
    required this.question,
    required this.langCode,
    required this.index,
  });

  final QuestionModel question;
  final String langCode;
  final int index;

  @override
  State<InteractiveQuestionExplorerCard> createState() =>
      _InteractiveQuestionExplorerCardState();
}

class _InteractiveQuestionExplorerCardState
    extends State<InteractiveQuestionExplorerCard> {
  bool _isAnswerRevealed = false;
  int? _selectedPracticeOption;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final q = widget.question;
    final questionText = q.localizedQuestionText(widget.langCode);
    final options = q.localizedOptions(widget.langCode);
    final explanation = q.localizedExplanation(widget.langCode);
    final topicLabel = q.topic.localizedLabel(widget.langCode);

    return BlocBuilder<BookmarksCubit, BookmarksState>(
      builder: (context, bookmarksState) {
        final isBookmarked = bookmarksState.isBookmarked(q.id);

        return FrostedCard(
          padding: const EdgeInsets.all(16),
          elevation: 1,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header: clear question number, topic badge, and bookmark button
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    constraints: const BoxConstraints(
                      minWidth: 42,
                      minHeight: 42,
                    ),
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.darkBluePrimary
                          : AppColors.googleBlue,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Text(
                      '${widget.index}',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkBlueSurface
                                : AppColors.googleBlueSurface,
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            topicLabel,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppColors.darkBluePrimary
                                  : AppColors.googleBlue,
                            ),
                          ),
                        ),
                        Text(
                          'Question ${widget.index}',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark
                                ? AppColors.darkTextPrimary
                                : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  ScalePress(
                    onTap: () async {
                      final isAdded = await context
                          .read<BookmarksCubit>()
                          .toggleBookmark(q.id);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              isAdded
                                  ? l10n.text('bookmark_added')
                                  : l10n.text('bookmark_removed'),
                            ),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
                    child: Icon(
                      isBookmarked
                          ? Icons.bookmark_rounded
                          : Icons.bookmark_border_rounded,
                      color: isBookmarked
                          ? AppColors.primeGold
                          : (isDark
                                ? AppColors.darkTextSecondary
                                : AppColors.textTertiary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Question Text
              Text(
                questionText,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  height: 1.35,
                  color: isDark
                      ? AppColors.darkTextPrimary
                      : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              // Options
              ...List.generate(options.length, (idx) {
                final optionLetter = String.fromCharCode(65 + idx);
                final optionText = options[idx];
                final isAnswerKey = q.correctOptionIndex == idx;
                final isSelected = _selectedPracticeOption == idx;

                Color optionBg = isDark
                    ? AppColors.darkSurface
                    : const Color(0xFFFAFAFA);
                Color borderColor = isDark
                    ? AppColors.darkBorder
                    : AppColors.borderLight;
                Color textColor = isDark
                    ? AppColors.darkTextPrimary
                    : AppColors.textPrimary;
                FontWeight fontWeight = FontWeight.w400;

                if (_isAnswerRevealed) {
                  if (isAnswerKey) {
                    optionBg = isDark
                        ? const Color(0xFF13381B)
                        : AppColors.googleGreenSurface;
                    borderColor = AppColors.googleGreen;
                    textColor = AppColors.googleGreen;
                    fontWeight = FontWeight.w600;
                  } else if (isSelected) {
                    optionBg = isDark
                        ? const Color(0xFF3C1816)
                        : AppColors.googleRedSurface;
                    borderColor = AppColors.googleRed;
                    textColor = AppColors.googleRed;
                  }
                } else if (isSelected) {
                  optionBg = isDark
                      ? AppColors.darkBlueSurface
                      : AppColors.googleBlueSurface;
                  borderColor = isDark
                      ? AppColors.darkBluePrimary
                      : AppColors.googleBlue;
                  fontWeight = FontWeight.w500;
                }

                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    onTap: () {
                      setState(() {
                        _selectedPracticeOption = idx;
                        _isAnswerRevealed = true;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: optionBg,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: borderColor, width: 1),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _isAnswerRevealed && isAnswerKey
                                  ? AppColors.googleGreen
                                  : (_isAnswerRevealed &&
                                            isSelected &&
                                            !isAnswerKey
                                        ? AppColors.googleRed
                                        : Colors.transparent),
                              border: Border.all(
                                color: _isAnswerRevealed && isAnswerKey
                                    ? AppColors.googleGreen
                                    : borderColor,
                              ),
                            ),
                            child: Text(
                              _isAnswerRevealed && isAnswerKey
                                  ? '✓'
                                  : (_isAnswerRevealed &&
                                            isSelected &&
                                            !isAnswerKey
                                        ? '✗'
                                        : optionLetter),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color:
                                    _isAnswerRevealed &&
                                        (isAnswerKey ||
                                            (isSelected && !isAnswerKey))
                                    ? Colors.white
                                    : textColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              optionText,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: fontWeight,
                                color: textColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),

              // Reveal Answer Button / Explanation Panel
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _isAnswerRevealed = !_isAnswerRevealed;
                      });
                    },
                    icon: Icon(
                      _isAnswerRevealed
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 16,
                    ),
                    label: Text(
                      _isAnswerRevealed
                          ? l10n.text('btn_hide_answer')
                          : l10n.text('btn_show_answer'),
                      style: GoogleFonts.inter(fontSize: 12),
                    ),
                  ),
                  if (_isAnswerRevealed)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF13381B)
                            : AppColors.googleGreenSurface,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${l10n.text('help_answer_prefix')}: ${q.correctOptionLetter}',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.googleGreen,
                        ),
                      ),
                    ),
                ],
              ),

              if (_isAnswerRevealed) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkSurfaceVariant
                        : const Color(0xFFF1F3F4),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(
                      color: isDark
                          ? AppColors.darkBorder
                          : AppColors.borderLight,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.lightbulb_outline_rounded,
                        size: 16,
                        color: AppColors.googleYellow,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          explanation,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            height: 1.3,
                            color: isDark
                                ? AppColors.darkTextSecondary
                                : AppColors.textSecondary,
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
      },
    );
  }
}

class BookmarkedMaterialCard extends StatelessWidget {
  const BookmarkedMaterialCard({
    super.key,
    required this.material,
    required this.langCode,
    required this.l10n,
    required this.onTap,
    required this.onToggleBookmark,
  });

  final StudyMaterialModel material;
  final String langCode;
  final AppLocalizations l10n;
  final VoidCallback onTap;
  final VoidCallback onToggleBookmark;

  bool _isPpt() {
    final fn = (material.fileName ?? '').toLowerCase();
    return material.type == StudyDocType.ppt ||
        fn.endsWith('.ppt') ||
        fn.endsWith('.pptx');
  }

  bool _isVideo() {
    return material.kind == 'VIDEO' ||
        (material.embedUrl != null && material.embedUrl!.trim().isNotEmpty);
  }

  bool _isPdf() {
    final fn = (material.fileName ?? '').toLowerCase();
    return material.type == StudyDocType.pdf || fn.endsWith('.pdf');
  }

  String _getPillTag() {
    if (_isPpt()) return 'PPT';
    if (_isPdf()) return 'PDF Document';
    if (_isVideo()) return 'Video Lecture';
    if (material.type == StudyDocType.doc) return 'Word Document';
    return 'Study Guide';
  }

  Widget _buildLeadingIcon(bool isDark) {
    if (_isPpt()) {
      return Container(
        width: 46,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFF991B1B),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  color: Color(0x40FFFFFF),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(7),
                    topRight: Radius.circular(12),
                  ),
                ),
              ),
            ),
            Text(
              'PPT',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      );
    }

    if (_isPdf()) {
      return Container(
        width: 46,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFF1976D2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  color: Color(0x40FFFFFF),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(7),
                    topRight: Radius.circular(12),
                  ),
                ),
              ),
            ),
            const Icon(
              Icons.picture_as_pdf_rounded,
              color: Colors.white,
              size: 22,
            ),
          ],
        ),
      );
    }

    if (_isVideo()) {
      return Container(
        width: 46,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE55D5D), Color(0xFFAC3B82)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.play_arrow_rounded,
              color: Color(0xFFAC3B82),
              size: 16,
            ),
          ),
        ),
      );
    }

    return Container(
      width: 46,
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFF1E40AF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.article_rounded, color: Colors.white, size: 22),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : Colors.white;
    final cardBorder = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final titleColor = isDark
        ? AppColors.darkTextPrimary
        : const Color(0xFF0F172A);
    final metaColor = isDark
        ? AppColors.darkTextSecondary
        : const Color(0xFF64748B);
    final tagBg = isDark
        ? AppColors.darkSurfaceVariant
        : const Color(0xFFE8EEF5);
    final tagTextColor = isDark
        ? AppColors.darkTextSecondary
        : const Color(0xFF475569);

    final tagText = _getPillTag();
    final category = material.localizedCategory(langCode);
    final catName = category.isNotEmpty ? category : 'General';
    final metaText = '$catName • ${material.readTimeMinutes} min read/watch';

    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: cardBorder, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.25 : 0.035),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLeadingIcon(isDark),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2.5,
                    ),
                    margin: const EdgeInsets.only(bottom: 5),
                    decoration: BoxDecoration(
                      color: tagBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      tagText,
                      style: GoogleFonts.inter(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                        color: tagTextColor,
                      ),
                    ),
                  ),
                  Text(
                    material.localizedTitle(langCode),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: titleColor,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    metaText,
                    style: GoogleFonts.inter(fontSize: 11.5, color: metaColor),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(
                Icons.bookmark_rounded,
                color: Color(0xFF0284C7),
                size: 22,
              ),
              tooltip: 'Remove bookmark',
              onPressed: onToggleBookmark,
            ),
          ],
        ),
      ),
    );
  }
}
