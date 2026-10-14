import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/services/app_badge_service.dart';
import 'package:student_app/features/broadcasts/cubit/broadcast_cubit.dart';
import 'package:student_app/features/broadcasts/models/broadcast.dart';
import 'package:student_app/features/broadcasts/repository/broadcast_repository.dart';

class _FakeBroadcastRepository extends BroadcastRepository {
  _FakeBroadcastRepository(this._items) : super(Dio());

  final List<Broadcast> _items;
  final List<String> markedReadIds = [];
  bool markAllReadCalled = false;
  bool syncPendingReadsCalled = false;

  @override
  Future<List<Broadcast>> fetchPublished() async => _items;

  @override
  Future<void> syncPendingReads() async {
    syncPendingReadsCalled = true;
  }

  @override
  Future<void> markRead(String id) async {
    markedReadIds.add(id);
  }

  @override
  Future<void> markAllRead() async {
    markAllReadCalled = true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final List<MethodCall> methodCalls = [];

  setUp(() {
    methodCalls.clear();
    SharedPreferences.setMockInitialValues({});

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('flutter_app_icon_badge'),
      (MethodCall methodCall) async {
        methodCalls.add(methodCall);
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('flutter_app_icon_badge'),
      null,
    );
  });

  group('BroadcastCubit with AppBadgeService', () {
    test('computes unreadCount and updates app icon badge based on isRead', () async {
      final now = DateTime.now();
      final items = [
        Broadcast(id: '1', title: 'A', message: 'M1', publishedAt: now, isRead: false),
        Broadcast(id: '2', title: 'B', message: 'M2', publishedAt: now.subtract(const Duration(minutes: 5)), isRead: true),
        Broadcast(id: '3', title: 'C', message: 'M3', publishedAt: now.subtract(const Duration(minutes: 10)), isRead: false),
      ];
      final repo = _FakeBroadcastRepository(items);
      final cubit = BroadcastCubit(repo);

      await cubit.load();

      expect(repo.syncPendingReadsCalled, isTrue);
      expect(cubit.state, isA<BroadcastsLoaded>());
      final loaded = cubit.state as BroadcastsLoaded;
      expect(loaded.unreadCount, 2);
      expect(loaded.hasUnread, isTrue);

      final badgeCount = await AppBadgeService.instance.getBadgeCount();
      expect(badgeCount, 2);
      expect(methodCalls.any((c) => c.method == 'updateBadge' && c.arguments['count'] == 2), isTrue);
    });

    test('markAsRead marks individual broadcast as read and updates badge', () async {
      final now = DateTime.now();
      final items = [
        Broadcast(id: '1', title: 'A', message: 'M1', publishedAt: now, isRead: false),
        Broadcast(id: '2', title: 'B', message: 'M2', publishedAt: now, isRead: false),
      ];
      final repo = _FakeBroadcastRepository(items);
      final cubit = BroadcastCubit(repo);

      await cubit.load();
      expect((cubit.state as BroadcastsLoaded).unreadCount, 2);

      await cubit.markAsRead('1');

      final loaded = cubit.state as BroadcastsLoaded;
      expect(loaded.unreadCount, 1);
      expect(loaded.broadcasts[0].isRead, isTrue);
      expect(loaded.broadcasts[1].isRead, isFalse);
      expect(repo.markedReadIds, contains('1'));

      final badgeCount = await AppBadgeService.instance.getBadgeCount();
      expect(badgeCount, 1);
    });

    test('markAllAsSeen resets unreadCount and removes app icon badge', () async {
      final now = DateTime.now();
      final items = [
        Broadcast(id: '1', title: 'A', message: 'M1', publishedAt: now, isRead: false),
      ];
      final repo = _FakeBroadcastRepository(items);
      final cubit = BroadcastCubit(repo);

      await cubit.load();
      expect((cubit.state as BroadcastsLoaded).unreadCount, 1);

      await cubit.markAllAsSeen();

      final updated = cubit.state as BroadcastsLoaded;
      expect(updated.unreadCount, 0);
      expect(updated.hasUnread, isFalse);
      expect(repo.markAllReadCalled, isTrue);

      final badgeCount = await AppBadgeService.instance.getBadgeCount();
      expect(badgeCount, 0);
      expect(methodCalls.any((c) => c.method == 'removeBadge'), isTrue);
    });
  });
}
