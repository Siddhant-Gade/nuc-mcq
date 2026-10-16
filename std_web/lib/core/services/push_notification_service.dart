import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_badge_service.dart';

typedef NotificationPayloadHandler = void Function(Map<String, dynamic> data);

/// Web-compatible Notification Service for student web portal.
/// Handles student notification payload routing, badge counting,
/// and backend notification state integration without native Android/iOS dependencies.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  Dio? _dio;
  bool _initialized = false;
  NotificationPayloadHandler? onNotificationTap;

  Future<void> init({
    Dio? dio,
    NotificationPayloadHandler? onNotificationTap,
  }) async {
    _dio = dio;
    if (onNotificationTap != null) this.onNotificationTap = onNotificationTap;
    _initialized = true;
    debugPrint('[PushNotificationService] Initialized for Web');
  }

  Future<Map<String, dynamic>?> getInitialPayload() async {
    return null;
  }

  Future<void> dismissNotification(String broadcastId) async {
    debugPrint('[PushNotificationService] Dismissed notification: $broadcastId');
  }

  Future<void> dismissAllNotifications() async {
    await AppBadgeService.instance.removeBadge();
    debugPrint('[PushNotificationService] Dismissed all notifications');
  }

  Future<void> syncTokenWithBackend([String? token]) async {
    try {
      if (_dio == null) return;
      final prefs = await SharedPreferences.getInstance();
      final webToken = token ?? prefs.getString('cached_web_fcm_token');
      if (webToken != null && webToken.isNotEmpty) {
        await _dio!.post(
          '/api/v1/student/fcm-token',
          data: {
            'token': webToken,
            'platform': 'web',
          },
        );
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Token sync notice: $e');
    }
  }

  Future<void> unregisterOnSignOut() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedToken = prefs.getString('cached_web_fcm_token');
      if (cachedToken != null && _dio != null) {
        await _dio!.delete(
          '/api/v1/student/fcm-token',
          data: {'token': cachedToken},
        );
      }
      await prefs.remove('cached_web_fcm_token');
    } catch (_) {}
  }
}
