import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:open_filex/open_filex.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_cubit.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../../../core/widgets/scale_press.dart';
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
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
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
  List<StudyMaterialModel> _materials = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMaterials();
  }

  Future<void> _loadMaterials() async {
    setState(() => _isLoading = true);
    final items = await widget.repository.getMaterialsByCategory(_selectedCategory);
    if (mounted) {
      setState(() {
        _materials = items;
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final langCode = context.watch<LocaleCubit>().state.languageCode;
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.text('notes_title')),
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
            child: Row(
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat;
                final displayLabel = _getCategoryLabel(cat, langCode, l10n);
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: ScalePress(
                    onTap: () {
                      setState(() => _selectedCategory = cat);
                      _loadMaterials();
                    },
                    child: FilterChip(
                      label: Text(displayLabel),
                      selected: isSelected,
                      showCheckmark: false,
                      selectedColor: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
                      side: BorderSide(
                        color: isSelected
                            ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                            : (isDark ? AppColors.darkBorder : AppColors.borderLight),
                        width: 1,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                      labelStyle: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
                        color: isSelected
                            ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                            : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                      ),
                      onSelected: (_) {
                        setState(() => _selectedCategory = cat);
                        _loadMaterials();
                      },
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _materials.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.menu_book_outlined,
                              size: 48,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              l10n.text('no_materials'),
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
                        itemCount: _materials.length,
                        itemBuilder: (context, index) {
                          final item = _materials[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: _MaterialCard(
                              material: item,
                              langCode: langCode,
                              l10n: l10n,
                              onTap: () => _openReaderModal(context, item, langCode, l10n),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _openReaderModal(
    BuildContext context,
    StudyMaterialModel item,
    String langCode,
    AppLocalizations l10n,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return StudyMaterialReaderSheet(
          item: item,
          langCode: langCode,
          l10n: l10n,
          isDark: isDark,
          repository: widget.repository,
        );
      },
    );
  }
}

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
  String? _localFilePath;
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
    // If it's directly an 11-char ID
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
          // Word document (.docx / .doc)
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
    if (_localFilePath != null) {
      await OpenFilex.open(_localFilePath!);
      return;
    }
    final fileName = widget.item.fileName ?? '${widget.item.title}.docx';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(widget.l10n.text('downloading')),
        duration: const Duration(seconds: 1),
      ),
    );
    final path = await widget.repository.downloadAndSaveFile(widget.item.id, fileName);
    if (path != null) {
      _localFilePath = path;
      await OpenFilex.open(path);
    }
  }

  Future<void> _handleDownload() async {
    setState(() => _isDownloading = true);
    final fileName = widget.item.fileName ?? '${widget.item.title}.docx';

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
          _localFilePath = path;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.l10n.text('download_success', {'path': path})),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: 'OPEN',
                textColor: Colors.white,
                onPressed: () => OpenFilex.open(path),
              ),
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
    } catch (e) {
      debugPrint('[StudyMaterials] _handleDownload error: $e');
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

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.type.code,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    l10n.text('min_read', {'min': item.readTimeMinutes.toString()}),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                item.localizedTitle(langCode),
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.2,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),

              if (item.fileName != null && item.fileName!.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8F9FA),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.insert_drive_file_outlined,
                        size: 20,
                        color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item.fileName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      RoyalButton(
                        text: l10n.text('btn_download_file'),
                        icon: Icons.download_rounded,
                        height: 34,
                        isLoading: _isDownloading,
                        onPressed: _handleDownload,
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.md),
              Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.borderLight),

              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  children: [
                    if (_ytController != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        child: YoutubePlayer(
                          controller: _ytController!,
                          aspectRatio: 16 / 9,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            visualDensity: VisualDensity.compact,
                          ),
                          icon: const Icon(Icons.open_in_new_rounded, size: 14),
                          label: Text(
                            'Open in YouTube App',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
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
                      const SizedBox(height: AppSpacing.sm),
                    ] else if (_isLoadingDoc) ...[
                      Container(
                        height: 180,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(strokeWidth: 2.5),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              l10n.text('loading_doc'),
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ] else if (_pptSlides != null && _pptSlides!.isNotEmpty) ...[
                      EmbeddedPptViewer(
                        slides: _pptSlides!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ] else if (_pdfPreview != null && _pdfPreview!.pages.isNotEmpty) ...[
                      EmbeddedPdfViewer(
                        preview: _pdfPreview!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ] else if (_docxParagraphs != null && _docxParagraphs!.isNotEmpty) ...[
                      EmbeddedWordViewer(
                        paragraphs: _docxParagraphs!,
                        isDark: isDark,
                        onOpenExternal: _openInExternalApp,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ] else if (_docError != null && item.kind == 'DOCUMENT') ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _docError!,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
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
                      const SizedBox(height: AppSpacing.md),
                    ],

                    if (item.localizedDescription(langCode).isNotEmpty) ...[
                      Text(
                        item.localizedDescription(langCode),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],

                    if (item.localizedKeyPoints(langCode).isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.darkSurfaceVariant
                              : AppColors.googleBlueSurface,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          border: Border.all(
                            color: isDark ? AppColors.darkBorder : AppColors.googleBlueBorder,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.lightbulb_outline_rounded,
                                  size: 16,
                                  color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  l10n.text('key_takeaways'),
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ...item.localizedKeyPoints(langCode).map((kp) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('• ',
                                          style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
                                      Expanded(
                                        child: Text(
                                          kp,
                                          style: GoogleFonts.inter(fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                )),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],

                    if (item.localizedContent(langCode).isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.md),
                      SelectableText(
                        item.localizedContent(langCode),
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          height: 1.5,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                    ],
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

class _MaterialCard extends StatelessWidget {
  const _MaterialCard({
    required this.material,
    required this.langCode,
    required this.l10n,
    required this.onTap,
  });

  final StudyMaterialModel material;
  final String langCode;
  final AppLocalizations l10n;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ScalePress(
      onTap: onTap,
      child: FrostedCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        elevation: 1,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(
                material.kind == 'VIDEO' || (material.embedUrl != null && material.embedUrl!.isNotEmpty)
                    ? Icons.play_circle_outline_rounded
                    : Icons.description_outlined,
                color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                size: 22,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          material.localizedCategory(langCode),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        l10n.text('min_short', {'min': material.readTimeMinutes.toString()}),
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
                    material.localizedTitle(langCode),
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    material.localizedDescription(langCode),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

