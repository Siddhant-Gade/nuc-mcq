/// A published announcement as returned by
/// `GET /api/v1/student/broadcasts` (Phase 12 backend contract).
class Broadcast {
  const Broadcast({
    required this.id,
    required this.title,
    required this.message,
    required this.publishedAt,
    this.audienceType,
  });

  final String id;
  final String title;
  final String message;
  final DateTime? publishedAt;
  final String? audienceType;

  factory Broadcast.fromMap(Map<String, dynamic> map) {
    return Broadcast(
      id: '${map['id'] ?? ''}',
      title: '${map['title'] ?? ''}',
      message: '${map['message'] ?? ''}',
      audienceType: map['audienceType'] == null ? null : '${map['audienceType']}',
      publishedAt: map['publishedAt'] == null
          ? null
          : DateTime.tryParse('${map['publishedAt']}'),
    );
  }
}
