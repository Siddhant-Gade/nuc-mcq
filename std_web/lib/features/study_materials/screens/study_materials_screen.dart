import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
import '../../bookmarks/cubit/bookmarks_cubit.dart';
import '../../question_bank/models/question_model.dart';
import '../models/study_material_model.dart';
import '../repository/study_materials_repository.dart';
import '../service/document_preview_service.dart';
import '../widgets/embedded_document_viewers.dart';

class StudyMaterialsScreen extends StatefulWidget {
  const StudyMaterialsScreen({super.key, required this.repository});

  final StudyMaterialsRepository repository;

  static void openReaderModal(
    BuildContext context,
    StudyMaterialModel item,
    StudyMaterialsRepository repository,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final langCode = Localizations.localeOf(context).languageCode;
    final l10n = AppLocalizations.of(context);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return StudyMaterialReaderSheet(
          item: item,
          langCode: langCode,
          l10n: l10n,
          isDark: isDark,
          repository: repository,
        );
      },
    );
  }

  @override
  State<StudyMaterialsScreen> createState() => _StudyMaterialsScreenState();
}

class _StudyMaterialsScreenState extends State<StudyMaterialsScreen> {
  String _selectedCategory = 'ALL';
  List<StudyMaterialModel> _allMaterials = [];
  List<StudyMaterialModel> _displayedMaterials = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMaterials();
  }

  void _filterMaterials() {
    if (_selectedCategory == 'ALL') {
      _displayedMaterials = List.from(_allMaterials);
    } else {
      _displayedMaterials = _allMaterials.where((m) => m.category == _selectedCategory).toList();
    }
  }

  Future<void> _loadMaterials({bool forceRefresh = false}) async {
    if (_allMaterials.isEmpty) {
      setState(() => _isLoading = true);
    }
    final items = await widget.repository.getAllMaterials(forceRefresh: forceRefresh);
    if (mounted) {
      setState(() {
        _allMaterials = items;
        _filterMaterials();
        _isLoading = false;
      });
    }
  }

  final List<String> _categories = [
    'ALL',
    'Computer Basics',
    'MS Word',
    'MS Excel',
    'MS PowerPoint',
    'Internet & Cyber Security',
  ];

  String _getCategoryLabel(String cat, String langCode, AppLocalizations l10n) {
    if (cat == 'ALL') {
      return l10n.text('all_topics');
    }
    for (final topic in QuestionTopic.values) {
      if (topic.label == cat) {
        return topic.localizedLabel(langCode);
      }
    }
    return cat;
  }

  Future<void> _handleDownload(StudyMaterialModel item) async {
    final l10n = AppLocalizations.of(context);
    final fileName = item.fileName ?? '${item.title}.pdf';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(l10n.text('downloading')),
        duration: const Duration(seconds: 2),
      ),
    );

    try {
      final path = await widget.repository.downloadAndSaveFile(item.id, fileName);
      if (mounted) {
        if (path != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.text('download_success', {'path': path})),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 4),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.text('download_failed')),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.text('download_failed')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final l10n = AppLocalizations.of(context);

    final bgColor = isDark ? AppColors.darkBg : const Color(0xFFF5F7FB);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page Header Title: "Study Materials & Guides (24)"
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    l10n.text('notes_title'),
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      color: isDark ? AppColors.darkTextPrimary : const Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '(${_displayedMaterials.length})',
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),

            // Topic Filter Chips (Matching Reference Image)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: _categories.map((cat) {
                  final isSelected = _selectedCategory == cat;
                  final displayLabel = _getCategoryLabel(cat, langCode, l10n);

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ScalePress(
                      onTap: () {
                        if (_selectedCategory != cat) {
                          setState(() {
                            _selectedCategory = cat;
                            _filterMaterials();
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDCECFE))
                              : (isDark ? AppColors.darkSurface : Colors.white),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: isSelected
                                ? (isDark ? const Color(0xFF60A5FA) : const Color(0xFF3B82F6))
                                : (isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1)),
                            width: isSelected ? 1.2 : 1,
                          ),
                        ),
                        child: Text(
                          displayLabel,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected
                                ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8))
                                : (isDark ? AppColors.darkTextSecondary : const Color(0xFF334155)),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 8),

            // Material Cards List with Pull-to-Refresh
            Expanded(
              child: RefreshIndicator(
                color: const Color(0xFF1D4ED8),
                onRefresh: () => _loadMaterials(forceRefresh: true),
                child: _isLoading && _allMaterials.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _displayedMaterials.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              SizedBox(height: MediaQuery.of(context).size.height * 0.18),
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.menu_book_outlined,
                                      size: 48,
                                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF94A3B8),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      l10n.text('no_materials'),
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                            itemCount: _displayedMaterials.length,
                            itemBuilder: (context, index) {
                              final item = _displayedMaterials[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _MaterialCard(
                                  material: item,
                                  langCode: langCode,
                                  l10n: l10n,
                                  onTap: () => StudyMaterialsScreen.openReaderModal(
                                    context,
                                    item,
                                    widget.repository,
                                  ),
                                  onDownload: () => _handleDownload(item),
                                ),
                              );
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MaterialCard extends StatelessWidget {
  const _MaterialCard({
    required this.material,
    required this.langCode,
    required this.l10n,
    required this.onTap,
    required this.onDownload,
  });

  final StudyMaterialModel material;
  final String langCode;
  final AppLocalizations l10n;
  final VoidCallback onTap;
  final VoidCallback onDownload;

  bool _isPpt() {
    final fn = (material.fileName ?? '').toLowerCase();
    return material.type == StudyDocType.ppt || fn.endsWith('.ppt') || fn.endsWith('.pptx');
  }

  bool _isVideo() {
    return material.kind == 'VIDEO' || (material.embedUrl != null && material.embedUrl!.trim().isNotEmpty);
  }

  bool _isPdf() {
    final fn = (material.fileName ?? '').toLowerCase();
    return material.type == StudyDocType.pdf || fn.endsWith('.pdf');
  }

  String _getPillTag() {
    if (_isPpt()) return 'PPT';
    if (_isPdf()) return 'PDF Document';
    if (_isVideo()) {
      final titleLow = material.title.toLowerCase();
      final catLow = material.category.toLowerCase();
      if (titleLow.contains('test') || catLow.contains('test')) {
        return 'Test Video';
      }
      return 'Video Lecture';
    }
    if (material.type == StudyDocType.doc) return 'Word Document';
    return 'Study Guide';
  }

  Widget _buildLeadingIcon(bool isDark) {
    if (_isPpt()) {
      return Container(
        width: 48,
        height: 50,
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
                fontSize: 12,
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
        width: 48,
        height: 50,
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
              size: 24,
            ),
          ],
        ),
      );
    }

    if (_isVideo()) {
      // Elegant warm gradient matching reference cards
      final titleHash = material.title.hashCode.abs();
      final LinearGradient gradient;
      if (titleHash % 3 == 0) {
        gradient = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE55D5D), Color(0xFFAC3B82)],
        );
      } else if (titleHash % 3 == 1) {
        gradient = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0D9488), Color(0xFF0284C7)],
        );
      } else {
        gradient = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF97316), Color(0xFFBE185D)],
        );
      }

      return Container(
        width: 48,
        height: 50,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Container(
            width: 26,
            height: 26,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.play_arrow_rounded,
              color: Color(0xFFAC3B82),
              size: 18,
            ),
          ),
        ),
      );
    }

    // Default Word / Guide
    return Container(
      width: 48,
      height: 50,
      decoration: BoxDecoration(
        color: const Color(0xFF1E40AF),
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
            Icons.article_rounded,
            color: Colors.white,
            size: 24,
          ),
        ],
      ),
    );
  }

  IconData _getMetaIcon() {
    if (material.createdAt != null) {
      final diff = DateTime.now().difference(material.createdAt!);
      if (diff.inDays <= 30) {
        return Icons.calendar_today_outlined;
      }
    }
    if (_isVideo()) return Icons.play_circle_outline_rounded;
    if (_isPdf() || _isPpt()) return Icons.article_outlined;
    return Icons.language_rounded;
  }

  String _getMetaText() {
    if (material.createdAt != null) {
      final diff = DateTime.now().difference(material.createdAt!);
      if (diff.inDays <= 30) {
        return material.formattedUploadTime();
      }
    }
    final category = material.localizedCategory(langCode);
    final catName = category.isNotEmpty ? category : 'General';
    return '$catName • ${material.readTimeMinutes} min read/watch';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bookmarkKey = 'mat_${material.id}';
    final isBookmarked = context.watch<BookmarksCubit>().state.isBookmarked(bookmarkKey);

    final cardBg = isDark ? AppColors.darkSurface : Colors.white;
    final cardBorder = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final titleColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final metaColor = isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B);
    final tagBg = isDark ? AppColors.darkSurfaceVariant : const Color(0xFFE8EEF5);
    final tagTextColor = isDark ? AppColors.darkTextSecondary : const Color(0xFF475569);

    final tagText = _getPillTag();
    final isPptMaterial = _isPpt();

    return ScalePress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
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
            // Left Custom Media Icon (PPT / PDF / Video gradient)
            _buildLeadingIcon(isDark),

            const SizedBox(width: 14),

            // Middle Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // For PPT: Title with inline PPT badge if PPT, or Tag Pill on top
                  if (!isPptMaterial) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                      margin: const EdgeInsets.only(bottom: 6),
                      decoration: BoxDecoration(
                        color: tagBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        tagText,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: tagTextColor,
                        ),
                      ),
                    ),
                  ],

                  // Title (with inline tag for PPT matching Reference Image Card 1)
                  if (isPptMaterial) ...[
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        Text(
                          material.localizedTitle(langCode),
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: titleColor,
                            height: 1.25,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: tagBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'PPT',
                            style: GoogleFonts.inter(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: tagTextColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    Text(
                      material.localizedTitle(langCode),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: titleColor,
                        height: 1.25,
                      ),
                    ),
                  ],

                  const SizedBox(height: 6),

                  // Meta Row (Icon + Text)
                  Row(
                    children: [
                      Icon(
                        _getMetaIcon(),
                        size: 13.5,
                        color: metaColor,
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          _getMetaText(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: metaColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 10),

            // Trailing Actions Column: Bookmark on top, Download at bottom
            Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ScalePress(
                  onTap: () {
                    context.read<BookmarksCubit>().toggleBookmark(bookmarkKey);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      isBookmarked ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      color: isBookmarked ? const Color(0xFF0284C7) : const Color(0xFF94A3B8),
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ScalePress(
                  onTap: onDownload,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.download_rounded,
                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Improved, spacious, modern content viewer modal sheet for slides, PDFs, and YouTube videos.
class StudyMaterialReaderSheet extends StatefulWidget {
  const StudyMaterialReaderSheet({
    super.key,
    required this.item,
    required this.langCode,
    required this.l10n,
    required this.isDark,
    required this.repository,
  });

  final StudyMaterialModel item;
  final String langCode;
  final AppLocalizations l10n;
  final bool isDark;
  final StudyMaterialsRepository repository;

  @override
  State<StudyMaterialReaderSheet> createState() => _StudyMaterialReaderSheetState();
}

class _StudyMaterialReaderSheetState extends State<StudyMaterialReaderSheet> {
  bool _isDownloading = false;
  bool _isLoadingDoc = false;
  String? _docError;
  List<PptSlide>? _pptSlides;
  PdfDocumentPreview? _pdfPreview;
  List<DocxParagraph>? _docxParagraphs;
  YoutubePlayerController? _ytController;

  @override
  void initState() {
    super.initState();
    _initYoutubePlayerIfNeeded();
    if (widget.item.kind == 'DOCUMENT' && widget.item.fileName != null) {
      _loadDocumentPreview();
    }
  }

  void _initYoutubePlayerIfNeeded() {
    final videoId = _extractYoutubeId(widget.item.embedUrl);
    if (videoId != null && videoId.isNotEmpty) {
      _ytController = YoutubePlayerController.fromVideoId(
        videoId: videoId,
        autoPlay: false,
        params: const YoutubePlayerParams(
          showFullscreenButton: true,
          showControls: true,
          mute: false,
          origin: 'https://www.youtube-nocookie.com',
          strictRelatedVideos: true,
        ),
      );
    }
  }

  String? _extractYoutubeId(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    final trimmed = url.trim();
    if (RegExp(r'^[a-zA-Z0-9_-]{11}$').hasMatch(trimmed)) {
      return trimmed;
    }
    return YoutubePlayerController.convertUrlToId(trimmed);
  }

  @override
  void dispose() {
    _ytController?.close();
    super.dispose();
  }

  Future<void> _loadDocumentPreview() async {
    setState(() {
      _isLoadingDoc = true;
      _docError = null;
    });

    try {
      final bytes = await widget.repository.downloadMaterialBytes(widget.item.id);
      if (bytes != null && bytes.isNotEmpty) {
        final fileName = (widget.item.fileName ?? '').toLowerCase();

        if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx') || widget.item.type == StudyDocType.ppt) {
          final slides = DocumentPreviewService.instance.parsePptx(bytes);
          if (mounted) {
            setState(() {
              _pptSlides = slides;
              _isLoadingDoc = false;
            });
            return;
          }
        } else if (fileName.endsWith('.pdf') || widget.item.type == StudyDocType.pdf) {
          final preview = await DocumentPreviewService.instance.renderPdf(bytes);
          if (mounted) {
            setState(() {
              _pdfPreview = preview;
              _isLoadingDoc = false;
            });
            return;
          }
        } else {
          final paragraphs = DocumentPreviewService.instance.parseDocx(bytes);
          if (mounted) {
            setState(() {
              _docxParagraphs = paragraphs;
              _isLoadingDoc = false;
            });
            return;
          }
        }
      }
    } catch (e) {
      debugPrint('[StudyMaterials] Preview load failed: $e');
    }

    if (mounted) {
      setState(() {
        _isLoadingDoc = false;
        _docError = widget.l10n.text('extract_failed');
      });
    }
  }

  Future<void> _openInExternalApp() async {
    final access = await widget.repository.getMaterialAccess(widget.item.id);
    final url = access?['url']?.toString();
    if (url != null && url.isNotEmpty) {
      final uri = Uri.tryParse(url);
      if (uri != null && await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
        return;
      }
    }
    await _handleDownload();
  }

  Future<void> _handleDownload() async {
    setState(() => _isDownloading = true);
    final fileName = widget.item.fileName ?? '${widget.item.title}.pdf';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(widget.l10n.text('downloading')),
        duration: const Duration(seconds: 2),
      ),
    );

    try {
      final path = await widget.repository.downloadAndSaveFile(widget.item.id, fileName);
      if (mounted) {
        setState(() => _isDownloading = false);
        if (path != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.l10n.text('download_success', {'path': path})),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 5),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.l10n.text('download_failed')),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isDownloading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.l10n.text('download_failed')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final isDark = widget.isDark;
    final langCode = widget.langCode;
    final l10n = widget.l10n;

    final sheetBg = isDark ? AppColors.darkSurface : Colors.white;
    final titleColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final subtitleColor = isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B);

    final bookmarkKey = 'mat_${item.id}';
    final isBookmarked = context.watch<BookmarksCubit>().state.isBookmarked(bookmarkKey);

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.96,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: sheetBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Grab Handle
              Center(
                child: Container(
                  width: 44,
                  height: 4.5,
                  margin: const EdgeInsets.only(top: 10, bottom: 8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2.5),
                  ),
                ),
              ),

              // Header Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFE8EEF5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.type.label,
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkBluePrimary : const Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l10n.text('min_read', {'min': item.readTimeMinutes.toString()}),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: subtitleColor,
                      ),
                    ),
                    const Spacer(),
                    ScalePress(
                      onTap: () {
                        context.read<BookmarksCubit>().toggleBookmark(bookmarkKey);
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(6),
                        child: Icon(
                          isBookmarked ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                          color: isBookmarked ? const Color(0xFF0284C7) : const Color(0xFF94A3B8),
                          size: 22,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    ScalePress(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: subtitleColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Title Header
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
                child: Text(
                  item.localizedTitle(langCode),
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: titleColor,
                  ),
                ),
              ),

              // Attached File Banner (if available)
              if (item.fileName != null && item.fileName!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.insert_drive_file_rounded,
                          size: 20,
                          color: Color(0xFF1D4ED8),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            item.fileName!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: titleColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ScalePress(
                          onTap: _openInExternalApp,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1D4ED8),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.open_in_new_rounded, size: 13, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  'Open',
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
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
                ),

              const Divider(height: 1),

              // Main Viewer Scroll Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
                  children: [
                    // YouTube Video Player Viewer
                    if (_ytController != null) ...[
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(isDark ? 0.35 : 0.08),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: YoutubePlayer(
                          controller: _ytController!,
                          aspectRatio: 16 / 9,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            visualDensity: VisualDensity.compact,
                          ),
                          icon: const Icon(Icons.open_in_new_rounded, size: 14),
                          label: Text(
                            'Open in YouTube App',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                          onPressed: () {
                            final vidId = _extractYoutubeId(item.embedUrl);
                            if (vidId != null) {
                              final ytUri = Uri.parse('https://www.youtube.com/watch?v=$vidId');
                              launchUrl(ytUri, mode: LaunchMode.externalApplication);
                            }
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                    ] else if (_isLoadingDoc) ...[
                      Container(
                        height: 200,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 32,
                              height: 32,
                              child: CircularProgressIndicator(strokeWidth: 2.5),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              l10n.text('loading_doc'),
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: subtitleColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ] else if (_pptSlides != null && _pptSlides!.isNotEmpty) ...[
                      EmbeddedPptViewer(
                        slides: _pptSlides!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: 16),
                    ] else if (_pdfPreview != null && _pdfPreview!.pages.isNotEmpty) ...[
                      EmbeddedPdfViewer(
                        preview: _pdfPreview!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: 16),
                    ] else if (_docxParagraphs != null && _docxParagraphs!.isNotEmpty) ...[
                      EmbeddedWordViewer(
                        paragraphs: _docxParagraphs!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: 16),
                    ] else if (_docError != null && item.kind == 'DOCUMENT') ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18, color: subtitleColor),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _docError!,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: subtitleColor,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _openInExternalApp,
                              icon: const Icon(Icons.open_in_new_rounded, size: 14),
                              label: const Text('Open'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Description
                    if (item.localizedDescription(langCode).isNotEmpty) ...[
                      Text(
                        item.localizedDescription(langCode),
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          height: 1.5,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Key Takeaways Box
                    if (item.localizedKeyPoints(langCode).isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.darkSurfaceVariant
                              : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : const Color(0xFFBFDBFE),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.lightbulb_outline_rounded,
                                  size: 18,
                                  color: Color(0xFF1D4ED8),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  l10n.text('key_takeaways'),
                                  style: GoogleFonts.inter(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF1D4ED8),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ...item.localizedKeyPoints(langCode).map(
                                  (kp) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '• ',
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF1D4ED8),
                                          ),
                                        ),
                                        Expanded(
                                          child: Text(
                                            kp,
                                            style: GoogleFonts.inter(
                                              fontSize: 13,
                                              height: 1.4,
                                              color: isDark
                                                  ? AppColors.darkTextPrimary
                                                  : const Color(0xFF1E293B),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],

                    // Full Content Body
                    if (item.localizedContent(langCode).isNotEmpty) ...[
                      SelectableText(
                        item.localizedContent(langCode),
                        style: GoogleFonts.inter(
                          fontSize: 14.5,
                          height: 1.6,
                          color: titleColor,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Bottom Actions Toolbar
              if (item.fileName != null && item.fileName!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  decoration: BoxDecoration(
                    color: sheetBg,
                    border: Border(
                      top: BorderSide(
                        color: isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: RoyalButton(
                          text: l10n.text('btn_download_file'),
                          icon: Icons.download_rounded,
                          height: 44,
                          isLoading: _isDownloading,
                          onPressed: _handleDownload,
                        ),
                      ),
                      const SizedBox(width: 12),
                      ScalePress(
                        onTap: _openInExternalApp,
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1),
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            Icons.open_in_new_rounded,
                            size: 18,
                            color: titleColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
