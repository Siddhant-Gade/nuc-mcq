import 'package:flutter_test/flutter_test.dart';
import 'package:std_web/core/config/app_config.dart';

void main() {
  test('AppConfig initializes with default environment values', () {
    final config = AppConfig.fromEnvironment();
    expect(config.backendBaseUrl.isNotEmpty, isTrue);
    expect(config.supabaseUrl.isNotEmpty, isTrue);
    expect(config.supabasePublicKey.isNotEmpty, isTrue);
  });
}
