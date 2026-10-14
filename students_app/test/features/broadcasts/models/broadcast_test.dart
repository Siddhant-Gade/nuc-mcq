import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/features/broadcasts/models/broadcast.dart';

void main() {
  group('Broadcast.fromMap', () {
    test('parses a complete broadcast payload', () {
      final broadcast = Broadcast.fromMap(const {
        'id': 'b1',
        'title': 'Mid-term Exam Schedule',
        'message': 'Exams start on 15th September 2026.',
        'audienceType': 'ALL',
        'publishedAt': '2026-08-21T09:30:00.000Z',
        'isRead': true,
        'readAt': '2026-08-21T10:00:00.000Z',
      });

      expect(broadcast.id, 'b1');
      expect(broadcast.title, 'Mid-term Exam Schedule');
      expect(broadcast.publishedAt, DateTime.utc(2026, 8, 21, 9, 30));
      expect(broadcast.audienceType, 'ALL');
      expect(broadcast.isRead, isTrue);
      expect(broadcast.readAt, DateTime.utc(2026, 8, 21, 10, 0));
    });

    test('tolerates missing optional fields', () {
      final broadcast = Broadcast.fromMap(const {
        'id': 'b2',
        'title': 'Notice',
        'message': 'Body',
      });

      expect(broadcast.audienceType, isNull);
      expect(broadcast.publishedAt, isNull);
      expect(broadcast.isRead, isFalse);
      expect(broadcast.readAt, isNull);
    });
  });
}
