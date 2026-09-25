import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/services/app_badge_service.dart';

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
        if (methodCall.method == 'isAppBadgeSupported') {
          return true;
        }
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

  group('AppBadgeService', () {
    test('updateBadge persists count and calls platform channel with positive count', () async {
      await AppBadgeService.instance.updateBadge(5);

      expect(await AppBadgeService.instance.getBadgeCount(), 5);
      expect(methodCalls.length, 1);
      expect(methodCalls.first.method, 'updateBadge');
      expect(methodCalls.first.arguments, {'count': 5});
    });

    test('updateBadge with 0 removes badge from app icon', () async {
      await AppBadgeService.instance.updateBadge(0);

      expect(await AppBadgeService.instance.getBadgeCount(), 0);
      expect(methodCalls.length, 1);
      expect(methodCalls.first.method, 'removeBadge');
    });

    test('incrementBadge adds to existing count', () async {
      await AppBadgeService.instance.updateBadge(2);
      methodCalls.clear();

      await AppBadgeService.instance.incrementBadge(3);
      expect(await AppBadgeService.instance.getBadgeCount(), 5);
      expect(methodCalls.last.arguments, {'count': 5});
    });

    test('removeBadge sets count to 0 and invokes removeBadge', () async {
      await AppBadgeService.instance.updateBadge(4);
      methodCalls.clear();

      await AppBadgeService.instance.removeBadge();
      expect(await AppBadgeService.instance.getBadgeCount(), 0);
      expect(methodCalls.last.method, 'removeBadge');
    });

    test('isSupported reports platform capability', () async {
      final supported = await AppBadgeService.instance.isSupported();
      expect(supported, isTrue);
    });
  });
}
