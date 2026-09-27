import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/config/app_config.dart';
import '../models/student_identity.dart';

/// Bridges Supabase authentication with the Express API.
class AuthRepository {
  AuthRepository({SupabaseClient? supabase, required Dio dio})
      : _supabase = supabase,
        _dio = dio;

  final SupabaseClient? _supabase;
  final Dio _dio;

  Session? get currentSession => _supabase?.auth.currentSession;
  bool get hasSession => currentSession != null;

  /// Stream that emits whenever Supabase auth signs in or refreshes a session.
  Stream<void> get onAuthSessionChange {
    return _supabase?.auth.onAuthStateChange
            .where((data) =>
                data.event == AuthChangeEvent.signedIn ||
                data.event == AuthChangeEvent.tokenRefreshed)
            .map((_) {}) ??
        const Stream.empty();
  }

  static String prnToAuthEmail(String identifier) {
    final trimmed = identifier.trim();
    if (trimmed.contains('@')) {
      return trimmed.toLowerCase();
    }
    final clean = trimmed.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_.-]'), '');
    return '$clean@student.unique';
  }

  Future<Map<String, dynamic>?> resolveStudent(String identifier) async {
    final trimmed = identifier.trim();
    if (trimmed.isEmpty) return null;
    try {
      final res = await _dio.post<Object?>(
        '/api/v1/auth/resolve-identifier',
        data: {'identifier': trimmed},
      );
      final data = requireSuccessData(res.data);
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
    } catch (_) {}
    return null;
  }

  Future<void> signIn({required String prn, required String password}) async {
    if (_supabase == null) {
      throw const ApiException('SUPABASE_NOT_INITIALIZED', 'Supabase authentication is not configured.');
    }
    final trimmed = prn.trim();
    final authEmail = prnToAuthEmail(trimmed);

    // Attempt 1: Sign in with PRN alias
    try {
      await _supabase.auth.signInWithPassword(email: authEmail, password: password);
      return;
    } catch (_) {}

    // Attempt 2: If student was admitted with an email, resolve and try with that email
    try {
      final res = await _dio.post<Object?>(
        '/api/v1/auth/resolve-identifier',
        data: {'identifier': trimmed},
      );
      final data = requireSuccessData(res.data);
      if (data is Map && data['email'] != null && data['email'].toString().isNotEmpty) {
        final profileEmail = data['email'].toString().trim().toLowerCase();
        if (profileEmail != authEmail) {
          try {
            await _supabase.auth.signInWithPassword(email: profileEmail, password: password);
            return;
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Attempt 3 (Seamless Multi-Device / Custom Password Sync):
    // If the student is admitted and trying to log in with their custom password on a new device,
    // sync & register the custom password via backend directly.
    try {
      final response = await _dio.post<Object?>(
        '/api/v1/auth/student-register',
        data: {'prn': trimmed, 'password': password},
      );
      final data = requireSuccessData(response.data);
      if (data is Map) {
        try {
          await _supabase.auth.signInWithPassword(email: authEmail, password: password);
          return;
        } catch (_) {
          final profileEmail = data['email']?.toString().trim().toLowerCase();
          if (profileEmail != null && profileEmail.isNotEmpty) {
            await _supabase.auth.signInWithPassword(email: profileEmail, password: password);
            return;
          }
        }
      }
    } on DioException catch (dioErr) {
      final appEx = exceptionFromDio(dioErr);
      if (appEx.code == 'STUDENT_NOT_FOUND') {
        throw ApiException(
          'STUDENT_NOT_FOUND',
          'Student with PRN "$trimmed" was not found. Please ensure you are admitted by the institute admin.',
        );
      }
    } catch (_) {}

    // If all attempts failed:
    throw const ApiException(
      'AUTH_FAILED',
      'Invalid credentials. Please verify your PRN and password, or tap "Create Account" above to set a new password.',
    );
  }

  Future<void> signUp({required String prn, required String password}) async {
    if (_supabase == null) {
      throw const ApiException('SUPABASE_NOT_INITIALIZED', 'Supabase authentication is not configured.');
    }

    final trimmedPrn = prn.trim();
    final authEmail = prnToAuthEmail(trimmedPrn);

    // Step 1: Register password directly via backend (bypasses email limits, sets pgcrypto crypt, activates access)
    Map<String, dynamic>? registerData;
    try {
      final response = await _dio.post<Object?>(
        '/api/v1/auth/student-register',
        data: {'prn': trimmedPrn, 'password': password},
      );
      final data = requireSuccessData(response.data);
      if (data is Map) {
        registerData = Map<String, dynamic>.from(data);
      }
    } on DioException catch (e) {
      throw exceptionFromDio(e);
    }

    // Step 2: Instantly sign in with the configured password
    try {
      await _supabase.auth.signInWithPassword(email: authEmail, password: password);
      return;
    } catch (_) {
      final profileEmail = registerData?['email']?.toString().trim().toLowerCase();
      if (profileEmail != null && profileEmail.isNotEmpty && profileEmail != authEmail) {
        try {
          await _supabase.auth.signInWithPassword(email: profileEmail, password: password);
          return;
        } catch (_) {}
      }
    }

    // Final attempt: re-throw error if sign-in fails
    try {
      await _supabase.auth.signInWithPassword(email: authEmail, password: password);
    } on AuthException catch (e) {
      throw ApiException('AUTH_FAILED', e.message);
    } catch (e) {
      throw ApiException('SIGN_IN_ERROR', 'Sign-in failed: ${e.toString()}');
    }
  }

  /// Google OAuth sign-in: native Google Sign-In with backend email verification.
  /// Authenticates the student natively on Android without opening an external browser.
  Future<void> signInWithGoogle({String? webClientId}) async {
    if (_supabase == null) {
      throw const ApiException(
        'SUPABASE_NOT_INITIALIZED',
        'Supabase authentication is not configured.',
      );
    }

    final effectiveClientId = (webClientId != null && webClientId.isNotEmpty)
        ? webClientId
        : AppConfig.fromEnvironment().googleWebClientId;

    final googleSignIn = GoogleSignIn(
      serverClientId: effectiveClientId.isNotEmpty ? effectiveClientId : null,
      scopes: ['email', 'profile'],
    );

    // Always clear the previously selected account so the picker is shown every time.
    try { await googleSignIn.signOut(); } catch (_) {}

    final account = await googleSignIn.signIn();
    if (account == null) {
      throw const ApiException('CANCELLED', 'Google sign-in was cancelled.');
    }

    final email = account.email.trim().toLowerCase();

    // Authenticate student with backend using verified Google email
    try {
      final response = await _dio.post<Object?>(
        '/api/v1/auth/google-student-auth',
        data: {
          'email': email,
          'name': account.displayName ?? '',
          'googleId': account.id,
        },
      );
      final data = requireSuccessData(response.data);
      if (data is Map && data['authToken'] != null) {
        final token = data['authToken'].toString();
        final targetEmail = data['email']?.toString() ?? email;

        await _supabase.auth.signInWithPassword(
          email: targetEmail,
          password: token,
        );
        return;
      }
      throw const ApiException('AUTH_FAILED', 'Failed to authenticate student with backend.');
    } on DioException catch (e) {
      throw exceptionFromDio(e);
    }
  }

  Future<void> signOut() async {
    // Clear the cached Google account so the picker shows next time.
    try { await GoogleSignIn().signOut(); } catch (_) {}
    if (_supabase != null) {
      try {
        await _supabase.auth.signOut();
      } catch (_) {}
    }
  }

  static const _identityCacheKey = 'cached_student_identity_v1';

  /// Verifies the current session against the backend, falling back to cached identity if offline.
  Future<StudentIdentity> verifyIdentity() async {
    final session = _supabase?.auth.currentSession;
    if (session == null) {
      throw const ApiException('NO_SESSION', 'No active session found.');
    }

    try {
      final response = await _dio.get<Object?>('/api/v1/auth/me');
      final data = requireSuccessData(response.data);
      if (data is! Map || data['identity'] is! Map) {
        throw const ApiException('MALFORMED_RESPONSE', 'The server returned an unexpected identity.');
      }
      final identity = StudentIdentity.fromMap(Map<String, dynamic>.from(data['identity'] as Map));
      
      // Cache verified identity locally for offline sessions
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_identityCacheKey, jsonEncode(identity.toMap()));
      } catch (_) {}

      return identity;
    } on DioException catch (e) {
      // If network is offline or server unreachable, check local cached identity
      try {
        final prefs = await SharedPreferences.getInstance();
        final raw = prefs.getString(_identityCacheKey);
        if (raw != null && raw.isNotEmpty) {
          final decoded = jsonDecode(raw) as Map<String, dynamic>;
          final cachedIdentity = StudentIdentity.fromMap(decoded);
          if (cachedIdentity.authUserId == session.user.id && cachedIdentity.isStudent) {
            return cachedIdentity;
          }
        }
      } catch (_) {}

      throw exceptionFromDio(e);
    }
  }

  Future<void> sendAuthorizationRequest({String? prn}) async {
    final payload = (prn != null && prn.trim().isNotEmpty) ? {'prn': prn.trim()} : null;
    try {
      final response = await _dio.post<Object?>(
        '/api/v1/authorization-requests/mine',
        data: payload,
      );
      requireSuccessData(response.data);
    } on DioException catch (firstErr) {
      final appEx = exceptionFromDio(firstErr);
      // 409 CONFLICT = request already pending — treat as success
      if (appEx.code == 'CONFLICT') return;
      // Otherwise retry once after a short delay (handles rare identity-link timing gap)
      await Future<void>.delayed(const Duration(milliseconds: 1200));
      try {
        final retry = await _dio.post<Object?>(
          '/api/v1/authorization-requests/mine',
          data: payload,
        );
        requireSuccessData(retry.data);
      } on DioException catch (retryErr) {
        final retryEx = exceptionFromDio(retryErr);
        if (retryEx.code == 'CONFLICT') return; // already pending after retry — fine
        throw retryEx;
      }
    }
  }
}
