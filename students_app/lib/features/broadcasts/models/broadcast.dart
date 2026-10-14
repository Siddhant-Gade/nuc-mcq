/// A published announcement as returned by
/// `GET /api/v1/student/broadcasts` (Phase 12 backend contract).
class Broadcast {
  const Broadcast({
    required this.id,
    required this.title,
    required this.message,
    required this.publishedAt,
    this.audienceType,
    this.isRead = false,
    this.readAt,
  });

  final String id;
  final String title;
  final String message;
  final DateTime? publishedAt;
  final String? audienceType;
  final bool isRead;
  final DateTime? readAt;

  factory Broadcast.fromMap(Map<String, dynamic> map) {
    return Broadcast(
      id: '${map['id'] ?? ''}',
      title: '${map['title'] ?? ''}',
      message: '${map['message'] ?? ''}',
      audienceType: map['audienceType'] == null ? null : '${map['audienceType']}',
      publishedAt: map['publishedAt'] == null
          ? null
          : DateTime.tryParse('${map['publishedAt']}'),
      isRead: map['isRead'] == true,
      readAt: map['readAt'] == null
          ? null
          : DateTime.tryParse('${map['readAt']}'),
    );
  }

  Broadcast copyWith({
    String? id,
    String? title,
    String? message,
    DateTime? publishedAt,
    String? audienceType,
    bool? isRead,
    DateTime? readAt,
  }) {
    return Broadcast(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      publishedAt: publishedAt ?? this.publishedAt,
      audienceType: audienceType ?? this.audienceType,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
    );
  }
}
