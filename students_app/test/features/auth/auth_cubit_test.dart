import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/api/api_exception.dart';
import 'package:student_app/features/auth/cubit/auth_cubit.dart';
import 'package:student_app/features/auth/models/student_identity.dart';
import 'package:student_app/features/auth/repository/auth_repository.dart';

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository({required super.dio});

  bool fakeHasSession = false;
  StudentIdentity? fakeIdentity;
  ApiException? fakeGoogleException;
  bool signedOutCalled = false;

  @override
  bool get hasSession => fakeHasSession;

  @override
  Stream<void> get onAuthSessionChange => const Stream.empty();

  @override
  Future<void> signInWithGoogle({String? webClientId}) async {
    if (fakeGoogleException != null) {
      throw fakeGoogleException!;
    }
    fakeHasSession = true;
  }

  @override
  Future<StudentIdentity> verifyIdentity() async {
    if (fakeIdentity != null) {
      return fakeIdentity!;
    }
    return const StudentIdentity(
      authUserId: 'verified-user-1',
      email: 'student@example.com',
      roles: ['STUDENT'],
      studentId: 'PRN001',
      name: 'Test Student',
    );
  }

  String? lastRequestedPrn;
  String? lastRequestedEmail;
  Map<String, dynamic>? fakeAuthResponse;
  ApiException? fakeAuthException;

  @override
  Future<Map<String, dynamic>> submitPublicAuthorizationRequest({
    String? prn,
    String? email,
    String? name,
  }) async {
    lastRequestedPrn = prn;
    lastRequestedEmail = email;
    if (fakeAuthException != null) throw fakeAuthException!;
    return fakeAuthResponse ?? {'message': 'Success', 'alreadyPending': false};
  }

  @override
  Future<void> signOut() async {
    signedOutCalled = true;
    fakeHasSession = false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late FakeAuthRepository fakeRepo;
  late AuthCubit cubit;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    fakeRepo = FakeAuthRepository(dio: Dio());
    cubit = AuthCubit(fakeRepo);
  });

  tearDown(() async {
    await cubit.close();
  });

  test('initial state is AuthUnauthenticated', () {
    expect(cubit.state, isA<AuthUnauthenticated>());
  });

  test('restoreSession emits AuthChecking then AuthUnauthenticated when no session', () async {
    final states = <AuthState>[];
    final sub = cubit.stream.listen(states.add);

    fakeRepo.fakeHasSession = false;
    await cubit.restoreSession();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(states, [isA<AuthChecking>(), isA<AuthUnauthenticated>()]);
    await sub.cancel();
  });

  test('signInWithGoogle succeeds for active enrolled student', () async {
    final states = <AuthState>[];
    final sub = cubit.stream.listen(states.add);

    await cubit.signInWithGoogle();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(states.length, 2);
    expect(states[0], isA<AuthSigningIn>());
    expect(states[1], isA<AuthAuthenticated>());
    final authState = states[1] as AuthAuthenticated;
    expect(authState.identity.name, 'Test Student');
    expect(authState.identity.isStudent, isTrue);

    await sub.cancel();
  });

  test('signInWithGoogle user cancellation resets to AuthUnauthenticated without error', () async {
    fakeRepo.fakeGoogleException = const ApiException(
      'CANCELLED',
      'Sign-in cancelled by user.',
    );

    final states = <AuthState>[];
    final sub = cubit.stream.listen(states.add);

    await cubit.signInWithGoogle();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(states.length, 2);
    expect(states[0], isA<AuthSigningIn>());
    expect(states[1], isA<AuthUnauthenticated>());
    expect((states[1] as AuthUnauthenticated).error, isNull);

    await sub.cancel();
  });

  test('signInWithGoogle unenrolled student routes to AuthUnauthorized approval queue', () async {
    fakeRepo.fakeGoogleException = const ApiException(
      'STUDENT_NOT_ENROLLED',
      'No admitted student record found with Google email: newstudent@gmail.com.',
    );

    final states = <AuthState>[];
    final sub = cubit.stream.listen(states.add);

    await cubit.signInWithGoogle();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(states.length, 2);
    expect(states[0], isA<AuthSigningIn>());
    expect(states[1], isA<AuthUnauthorized>());
    final unauth = states[1] as AuthUnauthorized;
    expect(unauth.identity.email, 'newstudent@gmail.com');

    await sub.cancel();
  });

  test('signInWithGoogle pending access student routes to AuthUnauthorized', () async {
    fakeRepo.fakeGoogleException = const ApiException(
      'ACCESS_NOT_ACTIVE',
      'Your student admission for Rahul Sharma is currently PENDING. Email: rahul@gmail.com',
    );

    final states = <AuthState>[];
    final sub = cubit.stream.listen(states.add);

    await cubit.signInWithGoogle();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    expect(states.length, 2);
    expect(states[0], isA<AuthSigningIn>());
    expect(states[1], isA<AuthUnauthorized>());

    await sub.cancel();
  });

  test('signOut clears credentials and emits AuthUnauthenticated', () async {
    await cubit.signOut();
    expect(fakeRepo.signedOutCalled, isTrue);
    expect(cubit.state, isA<AuthUnauthenticated>());
  });

  test('submitPublicAuthorizationRequest passes PRN and returns result', () async {
    fakeRepo.fakeAuthResponse = {'message': 'Request submitted', 'alreadyPending': false};
    final res = await fakeRepo.submitPublicAuthorizationRequest(prn: 'PRN123');
    expect(fakeRepo.lastRequestedPrn, 'PRN123');
    expect(res['message'], 'Request submitted');
  });

  test('submitPublicAuthorizationRequest handles already pending response', () async {
    fakeRepo.fakeAuthResponse = {'message': 'Already pending', 'alreadyPending': true};
    final res = await fakeRepo.submitPublicAuthorizationRequest(prn: 'PRN123');
    expect(res['alreadyPending'], isTrue);
  });

  test('submitPublicAuthorizationRequest submits Gmail without PRN successfully', () async {
    fakeRepo.fakeAuthResponse = {'message': 'Request submitted for new student', 'alreadyPending': false};
    final res = await fakeRepo.submitPublicAuthorizationRequest(email: 'newstudent@gmail.com');
    expect(fakeRepo.lastRequestedEmail, 'newstudent@gmail.com');
    expect(fakeRepo.lastRequestedPrn, isNull);
    expect(res['message'], 'Request submitted for new student');
  });
}
