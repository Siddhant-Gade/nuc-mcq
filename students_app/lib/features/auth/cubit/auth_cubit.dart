import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/services/push_notification_service.dart';
import '../models/student_identity.dart';
import '../repository/auth_repository.dart';

sealed class AuthState {
  const AuthState();
}

/// Initial state before any session check has run.
class AuthUnknown extends AuthState {
  const AuthUnknown();
}

class AuthChecking extends AuthState {
  const AuthChecking();
}

class AuthSigningIn extends AuthState {
  const AuthSigningIn(this.email);

  final String email;
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated({this.error});

  /// Optional failure message to display on the login screen.
  final String? error;
}

/// Verified by the backend and allowed into the student app.
class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.identity);

  final StudentIdentity identity;
}

/// Signed in successfully, but the account is not a student (or has no role).
class AuthUnauthorized extends AuthState {
  const AuthUnauthorized(this.identity);

  final StudentIdentity identity;
}

class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._repository) : super(const AuthUnauthenticated()) {
    _authSub = _repository.onAuthSessionChange.listen((_) {
      if (_repository.hasSession && state is! AuthAuthenticated) {
        _verifySession();
      }
    });
  }

  final AuthRepository _repository;
  StreamSubscription<void>? _authSub;
  AuthRepository get repository => _repository;

  @override
  Future<void> close() {
    _authSub?.cancel();
    return super.close();
  }

  /// Restores a persisted Supabase session, if any, and verifies it.
  Future<void> restoreSession() async {
    emit(const AuthChecking());
    if (_repository.currentSession == null) {
      emit(const AuthUnauthenticated());
      return;
    }
    await _verifySession();
  }

  Future<void> signIn(String prn, String password) async {
    emit(AuthSigningIn(prn));
    try {
      await _repository.signIn(prn: prn.trim(), password: password);
    } on ApiException catch (error) {
      emit(AuthUnauthenticated(error: error.message));
      return;
    } catch (_) {
      emit(
        const AuthUnauthenticated(error: 'Sign-in failed. Please try again.'),
      );
      return;
    }
    await _verifySession();
  }

  Future<void> signUp(String prn, String password) async {
    emit(AuthSigningIn(prn));
    try {
      await _repository.signUp(prn: prn.trim(), password: password);
    } on ApiException catch (error) {
      emit(AuthUnauthenticated(error: error.message));
      return;
    } catch (_) {
      emit(
        const AuthUnauthenticated(
          error: 'Registration failed. Please try again.',
        ),
      );
      return;
    }
    await _verifySession();
  }

  Future<void> signInWithGoogle() async {
    emit(const AuthSigningIn('Google'));
    try {
      await _repository.signInWithGoogle();
    } on ApiException catch (error) {
      if (error.code == 'CANCELLED') {
        emit(const AuthUnauthenticated());
        return;
      }
      // STUDENT_NOT_ENROLLED: email not in the system at all → no session possible.
      // ACCESS_NOT_ACTIVE: admission is pending or inactive.
      // Show unauthorized screen with only the email extracted from the error message.
      if (error.code == 'STUDENT_NOT_ENROLLED' || error.code == 'ACCESS_NOT_ACTIVE') {
        String? extractedEmail;
        final words = error.message.split(' ');
        for (final w in words) {
          if (w.contains('@')) {
            extractedEmail = w
                .replaceAll(RegExp(r'[^a-zA-Z0-9@._+-]'), '')
                .replaceAll(RegExp(r'[.,;:]+$'), '');
            break;
          }
        }
        final pendingIdentity = StudentIdentity(
          authUserId: '',
          roles: const [],
          email: extractedEmail,
        );
        emit(AuthUnauthorized(pendingIdentity));
        return;
      }
      debugPrint(
        '[AuthCubit] Google sign-in rejected: [${error.code}] ${error.message}',
      );
      emit(AuthUnauthenticated(error: error.message));
      return;
    } catch (e, stackTrace) {
      debugPrint(
        '[AuthCubit] Google sign-in unexpected error: $e\n$stackTrace',
      );
      emit(
        const AuthUnauthenticated(
          error: 'Google sign-in failed. Please try again.',
        ),
      );
      return;
    }
    await _verifySession();
  }

  Future<void> signOut() async {
    await PushNotificationService.instance.unregisterOnSignOut();
    await _repository.signOut();
    emit(const AuthUnauthenticated());
  }

  Future<bool> requestAccess({String? prn}) async {
    try {
      await _repository.sendAuthorizationRequest(prn: prn);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Checks if the student access is now approved without immediately altering the state.
  /// Returns the verified [StudentIdentity] if approved, or null if still pending/unauthorized.
  Future<StudentIdentity?> checkApprovalStatus() async {
    try {
      final identity = await _repository.verifyIdentity();
      if (identity.isStudent) {
        return identity;
      }
    } catch (_) {}
    return null;
  }

  /// Transitions to [AuthAuthenticated] once the celebration animation has finished displaying.
  void markAuthenticated(StudentIdentity identity) {
    emit(AuthAuthenticated(identity));
  }

  Future<void> refreshStatus({bool silent = false}) async {
    try {
      final identity = await _repository.verifyIdentity();
      if (identity.isStudent) {
        emit(AuthAuthenticated(identity));
      } else if (!silent) {
        emit(AuthUnauthorized(identity));
      }
    } catch (e) {
      if (!silent) {
        if (e is ApiException) {
          emit(AuthUnauthenticated(error: e.message));
        } else {
          emit(
            const AuthUnauthenticated(
              error:
                  'Could not verify your session. Check the backend URL and try again.',
            ),
          );
        }
      }
    }
  }

  Future<void> _verifySession() async {
    try {
      final identity = await _repository.verifyIdentity();
      if (identity.isStudent) {
        emit(AuthAuthenticated(identity));
        PushNotificationService.instance.syncTokenWithBackend();
      } else {
        emit(AuthUnauthorized(identity));
        PushNotificationService.instance.syncTokenWithBackend();
      }
    } on ApiException catch (error) {
      // Expired/rejected token or unreachable backend both land here; the
      // login screen shows the reason either way.
      emit(AuthUnauthenticated(error: error.message));
    } catch (_) {
      emit(
        const AuthUnauthenticated(
          error:
              'Could not verify your session. Check the backend URL and try again.',
        ),
      );
    }
  }
}
