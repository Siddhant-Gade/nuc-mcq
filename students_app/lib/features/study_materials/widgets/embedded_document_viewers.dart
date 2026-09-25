import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../service/document_preview_service.dart';

/// Embedded 16:9 presentation slide viewer for PPT and PPTX documents.
class EmbeddedPptViewer extends StatefulWidget {
  const EmbeddedPptViewer({
    super.key,
    required this.slides,
    required this.isDark,
    this.onOpenExternal,
  });

  final List<PptSlide> slides;
  final bool isDark;
  final VoidCallback? onOpenExternal;

  @override
  State<EmbeddedPptViewer> createState() => _EmbeddedPptViewerState();
}

class _EmbeddedPptViewerState extends State<EmbeddedPptViewer> {
  late final PageController _pageController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToSlide(int index) {
    if (index >= 0 && index < widget.slides.length) {
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final total = widget.slides.length;
    const pptColor = Color(0xFFD24726); // PowerPoint Orange/Red brand color

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Presentation Top Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2A1C19) : const Color(0xFFFDF4F2),
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : const Color(0xFFF9D6CF),
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.co_present_rounded, size: 16, color: pptColor),
                const SizedBox(width: 8),
                Text(
                  'SLIDE ${_currentIndex + 1} OF $total',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: pptColor,
                  ),
                ),
                const Spacer(),
                if (widget.onOpenExternal != null)
                  InkWell(
                    onTap: widget.onOpenExternal,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Open Full',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.open_in_new_rounded,
                            size: 13,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // 16:9 Slide Canvas
          AspectRatio(
            aspectRatio: 16 / 9,
            child: PageView.builder(
              controller: _pageController,
              itemCount: total,
              onPageChanged: (idx) => setState(() => _currentIndex = idx),
              itemBuilder: (context, index) {
                final slide = widget.slides[index];
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Slide Title
                      Text(
                        slide.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        width: 32,
                        height: 3,
                        decoration: BoxDecoration(
                          color: pptColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Bullet Points / Content
                      Expanded(
                        child: slide.bulletPoints.isNotEmpty
                            ? ListView.builder(
                                physics: const ClampingScrollPhysics(),
                                itemCount: slide.bulletPoints.length,
                                itemBuilder: (context, bIdx) {
                                  final point = slide.bulletPoints[bIdx];
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          margin: const EdgeInsets.only(top: 5, right: 8),
                                          width: 5,
                                          height: 5,
                                          decoration: BoxDecoration(
                                            color: pptColor.withOpacity(0.8),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        Expanded(
                                          child: Text(
                                            point,
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              height: 1.4,
                                              color: isDark
                                                  ? AppColors.darkTextSecondary
                                                  : AppColors.textSecondary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              )
                            : Center(
                                child: Text(
                                  slide.rawText.isNotEmpty ? slide.rawText : 'Slide ${index + 1}',
                                  maxLines: 4,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Bottom Navigation Controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFFAFAFA),
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_rounded, size: 14),
                  visualDensity: VisualDensity.compact,
                  onPressed: _currentIndex > 0 ? () => _goToSlide(_currentIndex - 1) : null,
                ),
                // Indicator dots / progress
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(
                    total > 8 ? 8 : total,
                    (i) {
                      final active = total > 8
                          ? (i == (_currentIndex * 7 / (total - 1)).round())
                          : i == _currentIndex;
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2.5),
                        width: active ? 14 : 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: active ? pptColor : (isDark ? Colors.white24 : Colors.black12),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      );
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  visualDensity: VisualDensity.compact,
                  onPressed: _currentIndex < total - 1 ? () => _goToSlide(_currentIndex + 1) : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Embedded high-resolution PDF page viewer.
class EmbeddedPdfViewer extends StatefulWidget {
  const EmbeddedPdfViewer({
    super.key,
    required this.preview,
    required this.isDark,
    this.onOpenExternal,
  });

  final PdfDocumentPreview preview;
  final bool isDark;
  final VoidCallback? onOpenExternal;

  @override
  State<EmbeddedPdfViewer> createState() => _EmbeddedPdfViewerState();
}

class _EmbeddedPdfViewerState extends State<EmbeddedPdfViewer> {
  late final PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToPage(int page) {
    if (page >= 0 && page < widget.preview.pages.length) {
      _pageController.animateToPage(
        page,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final total = widget.preview.totalPages;
    final loaded = widget.preview.pages.length;
    const pdfColor = Color(0xFFE5252A); // Adobe PDF Red brand color

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // PDF Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF261919) : const Color(0xFFFDF3F3),
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : const Color(0xFFFAD1D1),
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.picture_as_pdf_rounded, size: 16, color: pdfColor),
                const SizedBox(width: 8),
                Text(
                  'PAGE ${_currentPage + 1} OF $total',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: pdfColor,
                  ),
                ),
                const Spacer(),
                if (widget.onOpenExternal != null)
                  InkWell(
                    onTap: widget.onOpenExternal,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Open PDF',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.open_in_new_rounded,
                            size: 13,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Rendered PDF Page View (Height constrained with InteractiveViewer for zoom)
          SizedBox(
            height: 280,
            child: PageView.builder(
              controller: _pageController,
              itemCount: loaded,
              onPageChanged: (idx) => setState(() => _currentPage = idx),
              itemBuilder: (context, index) {
                final pageBytes = widget.preview.pages[index];
                return Container(
                  color: const Color(0xFFEFEFEF),
                  child: InteractiveViewer(
                    maxScale: 3.0,
                    child: Center(
                      child: Image.memory(
                        pageBytes,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFFAFAFA),
              border: Border(
                top: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_rounded, size: 14),
                  visualDensity: VisualDensity.compact,
                  onPressed: _currentPage > 0 ? () => _goToPage(_currentPage - 1) : null,
                ),
                Text(
                  'Page ${_currentPage + 1} of $total',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  visualDensity: VisualDensity.compact,
                  onPressed: _currentPage < loaded - 1 ? () => _goToPage(_currentPage + 1) : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Embedded structured Word document reader.
class EmbeddedWordViewer extends StatelessWidget {
  const EmbeddedWordViewer({
    super.key,
    required this.paragraphs,
    required this.isDark,
    this.onOpenExternal,
  });

  final List<DocxParagraph> paragraphs;
  final bool isDark;
  final VoidCallback? onOpenExternal;

  @override
  Widget build(BuildContext context) {
    const docColor = Color(0xFF2B579A); // Word Blue brand color

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Word Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF19202B) : const Color(0xFFF2F5FB),
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : const Color(0xFFD4E0F4),
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.description_rounded, size: 16, color: docColor),
                const SizedBox(width: 8),
                Text(
                  'DOCUMENT PREVIEW • ${paragraphs.length} PARAGRAPHS',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: docColor,
                  ),
                ),
                const Spacer(),
                if (onOpenExternal != null)
                  InkWell(
                    onTap: onOpenExternal,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Open Word',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.open_in_new_rounded,
                            size: 13,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Structured Content
          Container(
            constraints: const BoxConstraints(maxHeight: 280),
            padding: const EdgeInsets.all(16),
            child: ListView.builder(
              itemCount: paragraphs.length,
              itemBuilder: (context, index) {
                final p = paragraphs[index];
                if (p.isHeading) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 4),
                    child: Text(
                      p.text,
                      style: GoogleFonts.inter(
                        fontSize: p.headingLevel == 1 ? 15 : 13,
                        fontWeight: FontWeight.w700,
                        color: docColor,
                      ),
                    ),
                  );
                }
                if (p.isBullet) {
                  return Padding(
                    padding: const EdgeInsets.only(left: 8, bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          margin: const EdgeInsets.only(top: 6, right: 8),
                          width: 4,
                          height: 4,
                          decoration: const BoxDecoration(
                            color: docColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            p.text.replaceFirst(RegExp(r'^[•\-]\s*'), ''),
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              height: 1.5,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    p.text,
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      height: 1.5,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
