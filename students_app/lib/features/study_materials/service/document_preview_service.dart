import 'dart:convert';
import 'dart:io';
import 'package:archive/archive.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class PptSlide {
  const PptSlide({
    required this.slideNumber,
    required this.title,
    required this.bulletPoints,
    required this.rawText,
  });

  final int slideNumber;
  final String title;
  final List<String> bulletPoints;
  final String rawText;
}

class DocxParagraph {
  const DocxParagraph({
    required this.text,
    this.isHeading = false,
    this.isBullet = false,
    this.headingLevel = 1,
  });

  final String text;
  final bool isHeading;
  final bool isBullet;
  final int headingLevel;
}

class PdfDocumentPreview {
  const PdfDocumentPreview({
    required this.totalPages,
    required this.pages,
  });

  final int totalPages;
  final List<Uint8List> pages;
}

class DocumentPreviewService {
  DocumentPreviewService._();
  static final DocumentPreviewService instance = DocumentPreviewService._();

  static const MethodChannel _mediaScannerChannel =
      MethodChannel('com.mscit.student_app/media_scanner');

  /// Parses an OpenXML PowerPoint (.pptx) file into a list of slide models.
  List<PptSlide> parsePptx(Uint8List bytes) {
    final slides = <PptSlide>[];
    try {
      final archive = ZipDecoder().decodeBytes(bytes);

      // Find all slide XML files
      final slideFiles = archive.files.where((f) {
        return RegExp(r'ppt/slides/slide\d+\.xml$').hasMatch(f.name);
      }).toList();

      // Sort by slide number
      slideFiles.sort((a, b) {
        final aNum = int.tryParse(RegExp(r'\d+').firstMatch(a.name.split('/').last)?.group(0) ?? '0') ?? 0;
        final bNum = int.tryParse(RegExp(r'\d+').firstMatch(b.name.split('/').last)?.group(0) ?? '0') ?? 0;
        return aNum.compareTo(bNum);
      });

      for (var i = 0; i < slideFiles.length; i++) {
        final file = slideFiles[i];
        final xml = utf8.decode(file.content as List<int>, allowMalformed: true);
        final slide = _parseSingleSlide(i + 1, xml);
        slides.add(slide);
      }
    } catch (e) {
      debugPrint('[DocumentPreview] Error parsing PPTX: $e');
    }
    return slides;
  }

  PptSlide _parseSingleSlide(int slideNumber, String xml) {
    // Look for text shape blocks <p:sp>...</p:sp>
    final shapeRegex = RegExp(r'<p:sp(?:\s[^>]*)?>([\s\S]*?)<\/p:sp>');
    final shapes = shapeRegex.allMatches(xml).map((m) => m.group(1) ?? '').toList();

    String title = '';
    final bulletPoints = <String>[];
    final allParagraphs = <String>[];

    final tRegex = RegExp(r'<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>');
    final pRegex = RegExp(r'<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>');

    for (final shape in shapes) {
      final isTitleShape = shape.contains('type="title"') ||
          shape.contains('type="ctrTitle"') ||
          shape.contains('type="subTitle"');

      final shapeParas = <String>[];
      for (final pMatch in pRegex.allMatches(shape)) {
        final pBody = pMatch.group(1) ?? '';
        final textBuffer = StringBuffer();
        for (final tMatch in tRegex.allMatches(pBody)) {
          textBuffer.write(tMatch.group(1) ?? '');
        }
        final text = textBuffer.toString().trim();
        if (text.isNotEmpty) {
          shapeParas.add(text);
          allParagraphs.add(text);
        }
      }

      if (shapeParas.isNotEmpty) {
        if (isTitleShape && title.isEmpty) {
          title = shapeParas.join(' ');
        } else if (title.isEmpty && shapes.first == shape) {
          title = shapeParas.first;
          bulletPoints.addAll(shapeParas.skip(1));
        } else {
          bulletPoints.addAll(shapeParas);
        }
      }
    }

    if (title.isEmpty && allParagraphs.isNotEmpty) {
      title = allParagraphs.first;
      bulletPoints.clear();
      bulletPoints.addAll(allParagraphs.skip(1));
    }

    if (title.isEmpty) {
      title = 'Slide $slideNumber';
    }

    return PptSlide(
      slideNumber: slideNumber,
      title: title,
      bulletPoints: bulletPoints,
      rawText: allParagraphs.join('\n'),
    );
  }

  /// Parses Word (.docx) XML into structured paragraphs and headings.
  List<DocxParagraph> parseDocx(Uint8List bytes) {
    final result = <DocxParagraph>[];
    try {
      final archive = ZipDecoder().decodeBytes(bytes);
      final docEntry = archive.findFile('word/document.xml');
      if (docEntry == null) return result;

      final xml = utf8.decode(docEntry.content as List<int>, allowMalformed: true);
      final pRegex = RegExp(r'<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>');
      final tRegex = RegExp(r'<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>');

      for (final pMatch in pRegex.allMatches(xml)) {
        final pBody = pMatch.group(1) ?? '';
        final buffer = StringBuffer();
        for (final tMatch in tRegex.allMatches(pBody)) {
          buffer.write(tMatch.group(1) ?? '');
        }
        final trimmed = buffer.toString().trim();
        if (trimmed.isEmpty) continue;

        final isHeading1 = pBody.contains('w:val="Heading1"') || pBody.contains('w:val="Title"');
        final isHeading2 = pBody.contains('w:val="Heading2"');
        final isBullet = pBody.contains('<w:numPr>') || trimmed.startsWith('•') || trimmed.startsWith('-');

        result.add(DocxParagraph(
          text: trimmed,
          isHeading: isHeading1 || isHeading2,
          headingLevel: isHeading1 ? 1 : (isHeading2 ? 2 : 0),
          isBullet: isBullet,
        ));
      }
    } catch (e) {
      debugPrint('[DocumentPreview] Error parsing DOCX: $e');
    }
    return result;
  }

  /// Calls native Android PdfRenderer to render pages into high-res PNG bytes.
  Future<PdfDocumentPreview?> renderPdf(Uint8List bytes, {int maxPages = 12}) async {
    if (!Platform.isAndroid) return null;
    try {
      final result = await _mediaScannerChannel.invokeMethod<Map<Object?, Object?>>(
        'renderPdfPages',
        {
          'bytes': bytes,
          'maxPages': maxPages,
        },
      );
      if (result != null) {
        final total = (result['totalPages'] as int?) ?? 0;
        final rawPages = result['pages'] as List<Object?>?;
        final pageList = <Uint8List>[];
        if (rawPages != null) {
          for (final item in rawPages) {
            if (item is Uint8List) {
              pageList.add(item);
            } else if (item is List<int>) {
              pageList.add(Uint8List.fromList(item));
            }
          }
        }
        return PdfDocumentPreview(totalPages: total, pages: pageList);
      }
    } catch (e) {
      debugPrint('[DocumentPreview] Error rendering PDF: $e');
    }
    return null;
  }
}
