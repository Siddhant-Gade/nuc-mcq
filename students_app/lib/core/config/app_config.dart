/// Compile-time configuration injected with `--dart-define`.
///
/// Nothing here is committed: values are supplied on the command line or by
/// your IDE launch configuration. See README.md for run commands.
class AppConfig {
  const AppConfig({
    required this.backendBaseUrl,
    required this.supabaseUrl,
    required this.supabasePublicKey,
  });

  /// Base URL of the Express backend, e.g. http://localhost:3000
  /// (use http://10.0.2.2:3000 for an Android emulator).
  final String backendBaseUrl;

  /// Supabase project URL, e.g. https://xyzcompany.supabase.co
  final String supabaseUrl;

  /// Supabase public key — the new publishable key (`sb_publishable_...`) or
  /// the legacy anon key. Both are safe for client apps; never the service-role key.
  final String supabasePublicKey;

  static const _backendBaseUrl = String.fromEnvironment(
    'BACKEND_BASE_URL',
    defaultValue: String.fromEnvironment('API_BASE_URL', defaultValue: 'https://nuc-mcq-server.onrender.com'),
  );
  static const _supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://hwgnzhromdavlnttozai.supabase.co',
  );
  static const _supabasePublicKey = String.fromEnvironment(
    'SUPABASE_PUBLIC_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Z256aHJvbWRhdmxudHRvemFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODgwNzEsImV4cCI6MjEwMzE2NDA3MX0.XKlEU0AVMtDq5ZLOfiilp_oyKK0tiRoy7A2jDYdFdRA',
  );

  factory AppConfig.fromEnvironment() => const AppConfig(
        backendBaseUrl: _backendBaseUrl,
        supabaseUrl: _supabaseUrl,
        supabasePublicKey: _supabasePublicKey,
      );

  /// Returns human-readable configuration problems; empty means usable.
  static List<String> validationProblems({
    required String supabaseUrl,
    required String supabasePublicKey,
    required String backendBaseUrl,
  }) {
    final problems = <String>[];
    if (supabaseUrl.isEmpty) {
      problems.add('SUPABASE_URL was not supplied.');
    }
    if (supabasePublicKey.isEmpty) {
      problems.add('SUPABASE_PUBLIC_KEY was not supplied.');
    }
    if (backendBaseUrl.isEmpty) {
      problems.add('BACKEND_BASE_URL was not supplied.');
    }
    return problems;
  }

  List<String> validationProblemsForEnvironment() => validationProblems(
        supabaseUrl: supabaseUrl,
        supabasePublicKey: supabasePublicKey,
        backendBaseUrl: backendBaseUrl,
      );
}
