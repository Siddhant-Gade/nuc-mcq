import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/features/auth/models/student_identity.dart';

void main() {
  group('StudentIdentity.fromMap', () {
    test('parses a full verified identity', () {
      final identity = StudentIdentity.fromMap(const {
        'authUserId': 'user-123',
        'email': 'student@example.com',
        'roles': ['STUDENT'],
      });

      expect(identity.authUserId, 'user-123');
      expect(identity.email, 'student@example.com');
      expect(identity.roles, ['STUDENT']);
      expect(identity.isStudent, isTrue);
    });

    test('tolerates a missing email and empty roles', () {
      final identity = StudentIdentity.fromMap(const {
        'authUserId': 'user-123',
        'roles': <String>[],
      });

      expect(identity.email, isNull);
      expect(identity.roles, isEmpty);
      expect(identity.isStudent, isFalse);
    });
  });
}
