import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Centralized service to manage home screen app icon badge count via native platform channel.
/// Handles errors gracefully on unsupported launchers, platforms, web, or test environments.
class AppBadgeService {
  AppBadgeService._();
  static final AppBadgeService instance = AppBadgeService._();

  static const MethodChannel _channel = MethodChannel('flutter_app_icon_badge');
  static const String _badgeCountKey = 'app_icon_badge_count';

  /// Updates the launcher app icon badge count.
  /// If [count] > 0, shows the badge number.
  /// If [count] <= 0, clears/removes the badge.
  Future<void> updateBadge(int count) async {
    final clamped = count < 0 ? 0 : count;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_badgeCountKey, clamped);

      if (clamped > 0) {
        await _channel.invokeMethod('updateBadge', {'count': clamped});
        debugPrint('[AppBadgeService] Updated app icon badge to: $clamped');
      } else {
        await _channel.invokeMethod('removeBadge');
        debugPrint('[AppBadgeService] Cleared app icon badge');
      }
    } on MissingPluginException catch (_) {
      debugPrint('[AppBadgeService] flutter_app_icon_badge channel not implemented on current platform.');
    } on PlatformException catch (e) {
      debugPrint('[AppBadgeService] Platform exception setting badge: ${e.message}');
    } catch (e) {
      debugPrint('[AppBadgeService] Failed to update badge: $e');
    }
  }

  /// Clears the badge from the launcher app icon.
  Future<void> removeBadge() async {
    await updateBadge(0);
  }

  /// Increments the current app icon badge count by [by].
  Future<void> incrementBadge([int by = 1]) async {
    try {
      final current = await getBadgeCount();
      await updateBadge(current + by);
    } catch (e) {
      debugPrint('[AppBadgeService] Failed to increment badge: $e');
    }
  }

  /// Decrements the current app icon badge count by [by].
  Future<void> decrementBadge([int by = 1]) async {
    try {
      final current = await getBadgeCount();
      final next = (current - by).clamp(0, 9999);
      await updateBadge(next);
    } catch (e) {
      debugPrint('[AppBadgeService] Failed to decrement badge: $e');
    }
  }

  /// Returns the current locally persisted badge count.
  Future<int> getBadgeCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getInt(_badgeCountKey) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// Checks if the current launcher/device supports dynamic app icon badges.
  Future<bool> isSupported() async {
    try {
      final supported = await _channel.invokeMethod<bool>('isAppBadgeSupported');
      return supported ?? false;
    } catch (_) {
      return false;
    }
  }
}
