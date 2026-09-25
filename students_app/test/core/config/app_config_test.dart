import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/core/config/app_config.dart';

void main() {
  group('AppConfig.validationProblems', () {
    test('reports every missing value', () {
      final problems = AppConfig.validationProblems(
        supabaseUrl: '',
        supabasePublicKey: '',
        backendBaseUrl: '',
      );

      expect(problems, hasLength(3));
    });

    test('passes when all values are supplied', () {
      final problems = AppConfig.validationProblems(
        supabaseUrl: 'https://example.supabase.co',
        supabasePublicKey: 'sb_publishable_key',
        backendBaseUrl: 'http://localhost:3000',
      );

      expect(problems, isEmpty);
    });
  });
}
