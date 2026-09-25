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

  @override
  Future<List<Broadcast>> fetchPublished() async => _items;
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
    test('computes unreadCount and updates app icon badge', () async {
      final now = DateTime.now();
      final items = [
        Broadcast(id: '1', title: 'A', message: 'M1', publishedAt: now),
        Broadcast(id: '2', title: 'B', message: 'M2', publishedAt: now.subtract(const Duration(minutes: 5))),
      ];
      final repo = _FakeBroadcastRepository(items);
      final cubit = BroadcastCubit(repo);

      await cubit.load();

      expect(cubit.state, isA<BroadcastsLoaded>());
      final loaded = cubit.state as BroadcastsLoaded;
      expect(loaded.unreadCount, 2);
      expect(loaded.hasUnread, isTrue);

      final badgeCount = await AppBadgeService.instance.getBadgeCount();
      expect(badgeCount, 2);
      expect(methodCalls.any((c) => c.method == 'updateBadge' && c.arguments['count'] == 2), isTrue);
    });

    test('markAllAsSeen resets unreadCount and removes app icon badge', () async {
      final now = DateTime.now();
      final items = [
        Broadcast(id: '1', title: 'A', message: 'M1', publishedAt: now),
      ];
      final repo = _FakeBroadcastRepository(items);
      final cubit = BroadcastCubit(repo);

      await cubit.load();
      expect((cubit.state as BroadcastsLoaded).unreadCount, 1);

      await cubit.markAllAsSeen();

      final updated = cubit.state as BroadcastsLoaded;
      expect(updated.unreadCount, 0);
      expect(updated.hasUnread, isFalse);

      final badgeCount = await AppBadgeService.instance.getBadgeCount();
      expect(badgeCount, 0);
      expect(methodCalls.any((c) => c.method == 'removeBadge'), isTrue);
    });
  });
}
