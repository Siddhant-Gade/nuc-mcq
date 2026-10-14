import 'dart:async';
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
import '../../question_bank/screens/all_questions_screen.dart';
import '../../results/repository/results_repository.dart';
import '../../study_materials/models/study_material_model.dart';
import '../../study_materials/repository/study_materials_repository.dart';
import '../../study_materials/screens/study_materials_screen.dart';
import '../../test_engine/cubit/test_engine_cubit.dart';
import '../../test_engine/screens/test_screen.dart';
import '../../test_engine/services/test_generator.dart';
import '../cubit/bookmarks_cubit.dart';

/// Dedicated Bookmarks Screen focused strictly on saved items:
/// - Saved Questions (with search, topic filters, and practice mode)
/// - Saved Study Materials / Notes (PDFs, PPTs, Video lectures)
/// Contains NO misplaced Question Bank / All Questions entry points.
class BookmarksScreen extends StatefulWidget {
  const BookmarksScreen({super.key});

  @override
  State<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends State<BookmarksScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  QuestionTopic? _selectedTopic;
  String _searchQuery = '';
  int _selectedBookmarkType = 0; // 0 = Questions, 1 = Study Materials
  List<StudyMaterialModel> _studyMaterials = [];
  bool _isLoadingMaterials = true;
  String? _materialsError;

  @override
  void initState() {
    super.initState();
    _loadStudyMaterials();
  }

  Future<void> _loadStudyMaterials({bool forceRefresh = false}) async {
    setState(() {
      _isLoadingMaterials = true;
      _materialsError = null;
    });
    try {
      final repo = context.read<StudyMaterialsRepository>();
      final items = await repo.getAllMaterials(forceRefresh: forceRefresh);
      if (mounted) {
        setState(() {
          _studyMaterials = items;
          _isLoadingMaterials = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _materialsError = e.toString();
          _isLoadingMaterials = false;
        });
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

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('bookmarks_title')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocBuilder<BookmarksCubit, BookmarksState>(
        builder: (context, bookmarksState) {
          final bookmarkedQuestions = allQuestions
              .where((q) => bookmarksState.isQuestionBookmarked(q.id))
              .toList();

          final filteredBookmarks =
              _filterQuestions(bookmarkedQuestions, langCode);

          final bookmarkedMaterials = _studyMaterials
              .where((m) => bookmarksState.isMaterialBookmarked(m.id))
              .toList();

          return Column(
            children: [
              // Segment selector: Questions vs Notes & Materials
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedBookmarkType = 0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 7.5),
                            decoration: BoxDecoration(
                              color: _selectedBookmarkType == 0
                                  ? (isDark ? AppColors.darkSurface : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: _selectedBookmarkType == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.quiz_outlined,
                                    size: 15,
                                    color: _selectedBookmarkType == 0
                                        ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                        : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Questions (${bookmarkedQuestions.length})',
                                    style: GoogleFonts.inter(
                                      fontSize: 12.5,
                                      fontWeight: _selectedBookmarkType == 0
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                      color: _selectedBookmarkType == 0
                                          ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                                          : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedBookmarkType = 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 7.5),
                            decoration: BoxDecoration(
                              color: _selectedBookmarkType == 1
                                  ? (isDark ? AppColors.darkSurface : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: _selectedBookmarkType == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.menu_book_rounded,
                                    size: 15,
                                    color: _selectedBookmarkType == 1
                                        ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                        : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Notes (${bookmarkedMaterials.length})',
                                    style: GoogleFonts.inter(
                                      fontSize: 12.5,
                                      fontWeight: _selectedBookmarkType == 1
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                      color: _selectedBookmarkType == 1
                                          ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                                          : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
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

              // Search & Filter Header (when there are items to filter)
              if (_selectedBookmarkType == 0 && bookmarkedQuestions.isNotEmpty)
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
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

              // Content according to selected type
              Expanded(
                child: _selectedBookmarkType == 0
                    ? (bookmarkedQuestions.isEmpty
                        ? Center(
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
                                ],
                              ),
                            ),
                          )
                        : Column(
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
                                      '${bookmarkedQuestions.length} ${l10n.text('tab_bookmarks')}',
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
                                          context, bookmarkedQuestions),
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
                                ),
                              ),
                            ],
                          ))
                    : (_isLoadingMaterials
                        ? const Center(
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : (_materialsError != null
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(24.0),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.error_outline_rounded,
                                          size: 40, color: AppColors.googleRed),
                                      const SizedBox(height: 12),
                                      Text(
                                        'Failed to load study materials',
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: isDark
                                              ? AppColors.darkTextPrimary
                                              : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 14),
                                      RoyalButton(
                                        text: 'Retry',
                                        onPressed: () =>
                                            _loadStudyMaterials(forceRefresh: true),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : (bookmarkedMaterials.isEmpty
                                ? Center(
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
                                                  : const Color(0xFFEFF6FF),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              Icons.menu_book_rounded,
                                              size: 48,
                                              color: isDark
                                                  ? AppColors.darkBluePrimary
                                                  : AppColors.googleBlue,
                                            ),
                                          ),
                                          const SizedBox(height: 16),
                                          Text(
                                            'No Bookmarked Notes Yet',
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
                                            'Bookmark PDFs, PPTs, and video lectures from the Notes page to access them quickly here.',
                                            textAlign: TextAlign.center,
                                            style: GoogleFonts.inter(
                                              fontSize: 13,
                                              color: isDark
                                                  ? AppColors.darkTextSecondary
                                                  : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                : RefreshIndicator(
                                    onRefresh: () =>
                                        _loadStudyMaterials(forceRefresh: true),
                                    child: ListView.separated(
                                      padding: const EdgeInsets.all(16),
                                      itemCount: bookmarkedMaterials.length,
                                      separatorBuilder: (context, index) =>
                                          const SizedBox(height: 12),
                                      itemBuilder: (context, index) {
                                        final item = bookmarkedMaterials[index];
                                        return BookmarkedMaterialCard(
                                          material: item,
                                          langCode: langCode,
                                          l10n: l10n,
                                          onTap: () {
                                            final repo = context
                                                .read<StudyMaterialsRepository>();
                                            StudyMaterialsScreen.openReaderModal(
                                              context,
                                              item,
                                              repo,
                                            );
                                          },
                                          onToggleBookmark: () async {
                                            final isNowSaved = await context
                                                .read<BookmarksCubit>()
                                                .toggleMaterialBookmark(item.id);
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context)
                                                  .hideCurrentSnackBar();
                                              ScaffoldMessenger.of(context)
                                                  .showSnackBar(
                                                SnackBar(
                                                  content: Text(
                                                    isNowSaved
                                                        ? l10n.text('bookmark_added')
                                                        : l10n.text('bookmark_removed'),
                                                  ),
                                                  duration:
                                                      const Duration(seconds: 1),
                                                  behavior:
                                                      SnackBarBehavior.floating,
                                                ),
                                              );
                                            }
                                          },
                                        );
                                      },
                                    ),
                                  )))),
              ),
            ],
          );
        },
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
              Icon(Icons.search_off_rounded,
                  size: 40,
                  color: isDark
                      ? AppColors.darkTextSecondary
                      : AppColors.textSecondary),
              const SizedBox(height: 8),
              Text(
                'No matching bookmarks found',
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
