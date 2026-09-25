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
import '../../results/repository/results_repository.dart';
import '../../test_engine/cubit/test_engine_cubit.dart';
import '../../test_engine/screens/test_screen.dart';
import '../../test_engine/services/test_generator.dart';
import '../models/question_model.dart';
import '../repository/question_bank_repository.dart';

class AllQuestionsScreen extends StatefulWidget {
  const AllQuestionsScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  final int initialTabIndex;

  @override
  State<AllQuestionsScreen> createState() => _AllQuestionsScreenState();
}

class _AllQuestionsScreenState extends State<AllQuestionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  QuestionTopic? _selectedTopic;
  String _searchQuery = '';
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
  }

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
    _tabController.dispose();
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

  void _startPracticeFromBookmarks(
    BuildContext context,
    List<QuestionModel> bookmarkedQuestions,
  ) {
    if (bookmarkedQuestions.isEmpty) return;

    final testGenerator = context.read<TestGenerator>();
    final resultsRepo = context.read<ResultsRepository>();
    final test = testGenerator.generateCustomPracticeTest(
      questions: bookmarkedQuestions,
    );

    final cubit = TestEngineCubit(
      test: test,
      resultsRepository: resultsRepo,
    );

    Navigator.push(context, TestScreen.route(cubit));
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
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
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
                    color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFE8F0FE),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.quiz_outlined,
                    size: 54,
                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Questions Not Uploaded Yet',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'The question bank has not been uploaded by your instructor yet. All topics and practice tests will appear here once published.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.4,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                RoyalButton(
                  text: _isSyncing ? 'Downloading...' : 'Check & Download Questions',
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

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('all_questions_title')),
        actions: [
          IconButton(
            icon: _isSyncing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.sync_rounded),
            tooltip: 'Sync Questions',
            onPressed: _isSyncing ? null : _syncQuestions,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
          labelColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
          unselectedLabelColor:
              isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: [
            Tab(text: '${l10n.text('tab_all_questions')} (${allQuestions.length})'),
            BlocBuilder<BookmarksCubit, BookmarksState>(
              builder: (context, state) {
                return Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(l10n.text('tab_bookmarks')),
                      if (state.count > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkBlueSurface
                                : AppColors.googleBlueSurface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${state.count}',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppColors.darkBluePrimary
                                  : AppColors.googleBlue,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ),
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
                        horizontal: 14, vertical: 10),
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
                          onSelected: (_) => setState(() => _selectedTopic = null),
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

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: All Questions
                _buildQuestionList(
                  context,
                  _filterQuestions(allQuestions, langCode),
                  langCode,
                  isBookmarksTab: false,
                ),

                // Tab 2: Bookmarks
                BlocBuilder<BookmarksCubit, BookmarksState>(
                  builder: (context, bookmarksState) {
                    final bookmarkedList = allQuestions
                        .where((q) => bookmarksState.isBookmarked(q.id))
                        .toList();

                    final filteredBookmarks =
                        _filterQuestions(bookmarkedList, langCode);

                    if (bookmarkedList.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? AppColors.darkSurfaceVariant
                                      : AppColors.googleYellowSurface,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.bookmark_border_rounded,
                                  size: 48,
                                  color: AppColors.googleYellow,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                l10n.text('no_bookmarks_title'),
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isDark
                                      ? AppColors.darkTextPrimary
                                      : AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                l10n.text('no_bookmarks_desc'),
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: isDark
                                      ? AppColors.darkTextSecondary
                                      : AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 20),
                              RoyalButton(
                                text: l10n.text('tab_all_questions'),
                                icon: Icons.explore_outlined,
                                isSecondary: true,
                                onPressed: () => _tabController.animateTo(0),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    return Column(
                      children: [
                        // Sticky Action Bar for Bookmarks Practice
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          color: isDark
                              ? AppColors.darkBlueSurface
                              : AppColors.googleBlueSurface,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${bookmarkedList.length} ${l10n.text('tab_bookmarks')}',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue,
                                ),
                              ),
                              ScalePress(
                                onTap: () => _startPracticeFromBookmarks(
                                    context, bookmarkedList),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? AppColors.darkBluePrimary
                                        : AppColors.googleBlue,
                                    borderRadius:
                                        BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.play_arrow_rounded,
                                          size: 16, color: Colors.white),
                                      const SizedBox(width: 4),
                                      Text(
                                        l10n.text('btn_practice_bookmarks'),
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
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
                        Expanded(
                          child: _buildQuestionList(
                            context,
                            filteredBookmarks,
                            langCode,
                            isBookmarksTab: true,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionList(
    BuildContext context,
    List<QuestionModel> questions,
    String langCode, {
    required bool isBookmarksTab,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (questions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off_rounded,
                  size: 40,
                  color: isDark
                      ? AppColors.darkTextSecondary
                      : AppColors.textSecondary),
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
            child: _InteractiveQuestionExplorerCard(
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

class _InteractiveQuestionExplorerCard extends StatefulWidget {
  const _InteractiveQuestionExplorerCard({
    required this.question,
    required this.langCode,
    required this.index,
  });

  final QuestionModel question;
  final String langCode;
  final int index;

  @override
  State<_InteractiveQuestionExplorerCard> createState() =>
      _InteractiveQuestionExplorerCardState();
}

class _InteractiveQuestionExplorerCardState
    extends State<_InteractiveQuestionExplorerCard> {
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
              // Header: Topic Badge + Bookmark Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
                  Row(
                    children: [
                      Text(
                        '#${widget.index}',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isDark
                              ? AppColors.darkTextSecondary
                              : AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(width: 8),
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
                          size: 22,
                          color: isBookmarked
                              ? AppColors.googleYellow
                              : (isDark
                                  ? AppColors.darkTextSecondary
                                  : AppColors.textSecondary),
                        ),
                      ),
                    ],
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

                Color optionBg =
                    isDark ? AppColors.darkSurface : const Color(0xFFFAFAFA);
                Color borderColor =
                    isDark ? AppColors.darkBorder : AppColors.borderLight;
                Color textColor =
                    isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;
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
                          horizontal: 10, vertical: 8),
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
                                color: _isAnswerRevealed &&
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
                          horizontal: 8, vertical: 3),
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
                      const Icon(Icons.lightbulb_outline_rounded,
                          size: 16, color: AppColors.googleYellow),
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
