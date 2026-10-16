enum StudyDocType {
  pdf('PDF', 'PDF Document'),
  doc('DOCX', 'Word Document'),
  ppt('PPTX', 'Presentation'),
  notes('GUIDE', 'Study Guide');

  const StudyDocType(this.code, this.label);
  final String code;
  final String label;
}

class StudyMaterialModel {
  const StudyMaterialModel({
    required this.id,
    required this.title,
    required this.category,
    required this.description,
    required this.type,
    required this.readTimeMinutes,
    required this.content,
    required this.keyPoints,
    this.fileName,
    this.fileSize,
    this.kind = 'DOCUMENT',
    this.documentType,
    this.embedUrl,
    this.titleMr,
    this.categoryMr,
    this.descriptionMr,
    this.contentMr,
    this.keyPointsMr,
    this.titleHi,
    this.categoryHi,
    this.descriptionHi,
    this.contentHi,
    this.keyPointsHi,
    this.createdAt,
  });

  factory StudyMaterialModel.fromJson(Map<String, dynamic> json) {
    StudyDocType parseType(String? t, String? docType, String? fileName) {
      final combined = '${t ?? ''} ${docType ?? ''} ${fileName ?? ''}'.toUpperCase();
      if (combined.contains('DOCX') || combined.contains('DOC') || combined.contains('WORD')) {
        return StudyDocType.doc;
      }
      if (combined.contains('PPTX') || combined.contains('PPT') || combined.contains('PRESENTATION')) {
        return StudyDocType.ppt;
      }
      if (combined.contains('NOTES') || combined.contains('GUIDE')) {
        return StudyDocType.notes;
      }
      return StudyDocType.pdf;
    }

    final kpRaw = json['keyPoints'] ?? json['key_points'] ?? [];
    final keyPointsList = kpRaw is List ? kpRaw.map((e) => e.toString()).toList() : <String>[];

    return StudyMaterialModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      description: json['description']?.toString() ?? '',
      type: parseType(json['type']?.toString(), json['documentType']?.toString(), json['fileName']?.toString()),
      readTimeMinutes: json['readTimeMinutes'] is int ? json['readTimeMinutes'] as int : 5,
      content: json['content']?.toString() ?? '',
      keyPoints: keyPointsList,
      fileName: json['fileName']?.toString(),
      fileSize: json['fileSize'] is int ? json['fileSize'] as int : null,
      kind: json['kind']?.toString() ?? 'DOCUMENT',
      documentType: json['documentType']?.toString(),
      embedUrl: json['embedUrl']?.toString(),
      titleMr: json['titleMr']?.toString(),
      categoryMr: json['categoryMr']?.toString(),
      descriptionMr: json['descriptionMr']?.toString(),
      contentMr: json['contentMr']?.toString(),
      titleHi: json['titleHi']?.toString(),
      categoryHi: json['categoryHi']?.toString(),
      descriptionHi: json['descriptionHi']?.toString(),
      contentHi: json['contentHi']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : (json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null),
    );
  }

  final String id;
  final String title;
  final String category;
  final String description;
  final StudyDocType type;
  final int readTimeMinutes;
  final String content;
  final List<String> keyPoints;
  final String? fileName;
  final int? fileSize;
  final String kind;
  final String? documentType;
  final String? embedUrl;
  final DateTime? createdAt;

  final String? titleMr;
  final String? categoryMr;
  final String? descriptionMr;
  final String? contentMr;
  final List<String>? keyPointsMr;

  final String? titleHi;
  final String? categoryHi;
  final String? descriptionHi;
  final String? contentHi;
  final List<String>? keyPointsHi;

  String formattedUploadTime() {
    if (createdAt != null) {
      final now = DateTime.now();
      final diff = now.difference(createdAt!);
      if (diff.inDays == 0) {
        if (diff.inHours == 0) {
          return 'Uploaded recently';
        }
        return 'Uploaded ${diff.inHours}h ago';
      } else if (diff.inDays == 1) {
        return 'Uploaded yesterday';
      } else if (diff.inDays < 30) {
        return 'Uploaded ${diff.inDays} days ago';
      }
    }
    return 'General • $readTimeMinutes min read/watch';
  }

  String localizedTitle(String lang) {
    if (lang == 'mr' && titleMr != null && titleMr!.isNotEmpty) return titleMr!;
    if (lang == 'hi' && titleHi != null && titleHi!.isNotEmpty) return titleHi!;
    return title;
  }

  String localizedCategory(String lang) {
    if (lang == 'mr' && categoryMr != null && categoryMr!.isNotEmpty) return categoryMr!;
    if (lang == 'hi' && categoryHi != null && categoryHi!.isNotEmpty) return categoryHi!;
    return category;
  }

  String localizedDescription(String lang) {
    if (lang == 'mr' && descriptionMr != null && descriptionMr!.isNotEmpty) return descriptionMr!;
    if (lang == 'hi' && descriptionHi != null && descriptionHi!.isNotEmpty) return descriptionHi!;
    return description;
  }

  String localizedContent(String lang) {
    if (lang == 'mr' && contentMr != null && contentMr!.isNotEmpty) return contentMr!;
    if (lang == 'hi' && contentHi != null && contentHi!.isNotEmpty) return contentHi!;
    return content;
  }

  List<String> localizedKeyPoints(String lang) {
    if (lang == 'mr' && keyPointsMr != null && keyPointsMr!.isNotEmpty) return keyPointsMr!;
    if (lang == 'hi' && keyPointsHi != null && keyPointsHi!.isNotEmpty) return keyPointsHi!;
    return keyPoints;
  }
}
