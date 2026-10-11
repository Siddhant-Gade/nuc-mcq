import 'dart:convert';
import 'dart:io';
import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../firebase_options.dart';
import 'app_badge_service.dart';

/// Top-level background message handler required by Firebase Messaging.
/// Must be outside of any class and annotated with @pragma('vm:entry-point').
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  debugPrint(
    '[FCM Background] Message received: ${message.messageId}, data: ${message.data}',
  );
  await AppBadgeService.instance.incrementBadge();
}

typedef NotificationPayloadHandler = void Function(Map<String, dynamic> data);

class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  FirebaseMessaging? _messagingInstance;
  FirebaseMessaging? get _messaging {
    if (Firebase.apps.isEmpty) return null;
    return _messagingInstance ??= FirebaseMessaging.instance;
  }

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Dio? _dio;
  bool _initialized = false;
  NotificationPayloadHandler? onNotificationTap;

  static const String _channelId = 'nuc_priority_channel';
  static const String _channelName = 'NUC Student Notifications';
  static const String _channelDesc =
      'This channel is used for important student notifications.';

  /// Initialize Firebase Messaging, permissions, local channels, and foreground listeners.
  Future<void> init({
    Dio? dio,
    NotificationPayloadHandler? onNotificationTap,
  }) async {
    if (_initialized) {
      if (dio != null) _dio = dio;
      if (onNotificationTap != null) this.onNotificationTap = onNotificationTap;
      return;
    }

    _dio = dio;
    this.onNotificationTap = onNotificationTap;

    if (Firebase.apps.isEmpty) {
      debugPrint(
        '[FCM] Firebase not initialized (e.g. in test environment). Skipping native FCM setup.',
      );
      _initialized = true;
      return;
    }
    // 1. Request notification permissions (Android 13+ POST_NOTIFICATIONS / iOS)
    if (Platform.isAndroid) {
      final androidImplementation = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidImplementation?.requestNotificationsPermission();
    }
    final settings = await _messaging?.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    debugPrint('[FCM] Permission status: ${settings?.authorizationStatus}');

    // Enable foreground notification presentation options for heads-up display
    await _messaging?.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 2. Setup high-importance notification channel for Android
    const androidChannel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);

    // 3. Initialize flutter_local_notifications for foreground display & tap handling
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@drawable/ic_nuc_notification'),
    );

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          try {
            final data = jsonDecode(payload) as Map<String, dynamic>;
            this.onNotificationTap?.call(data);
          } catch (e) {
            debugPrint('[FCM] Error decoding notification payload: $e');
          }
        }
      },
    );

    // 4. Foreground message listener -> show heads-up local notification banner
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        '[FCM Foreground] Message received: ${message.notification?.title}',
      );
      final title =
          message.notification?.title ?? message.data['title']?.toString();
      final body =
          message.notification?.body ?? message.data['body']?.toString();

      if (title != null && !kIsWeb) {
        AppBadgeService.instance.incrementBadge();
        _localNotifications.show(
          id: message.hashCode,
          title: title,
          body: body,
          notificationDetails: NotificationDetails(
            android: AndroidNotificationDetails(
              _channelId,
              _channelName,
              channelDescription: _channelDesc,
              icon: '@drawable/ic_nuc_notification',
              largeIcon: const DrawableResourceAndroidBitmap(
                '@drawable/ic_nuc_large_icon',
              ),
              styleInformation: BigTextStyleInformation(
                body ?? '',
                contentTitle: title,
                summaryText: 'NucMCQ • New Unique Computers',
              ),
              importance: Importance.max,
              priority: Priority.high,
              color: const Color(0xFF1A73E8),
              playSound: true,
              enableVibration: true,
              showWhen: true,
            ),
          ),
          payload: jsonEncode(message.data),
        );
      }
    });

    // 5. App opened from background by tapping system notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] App opened via notification: ${message.data}');
      if (message.data.isNotEmpty) {
        this.onNotificationTap?.call(message.data);
      }
    });

    // 6. Token refresh listener
    _messaging?.onTokenRefresh.listen((newToken) {
      debugPrint('[FCM] Token refreshed');
      syncTokenWithBackend(newToken);
    });

    // 7. Sync initial token if available
    final currentToken = await _messaging?.getToken();
    if (currentToken != null) {
      await syncTokenWithBackend(currentToken);
    }

    _initialized = true;
  }

  /// Check if the app was launched from a terminated state via a notification tap.
  Future<RemoteMessage?> getInitialMessage() async {
    return _messaging?.getInitialMessage();
  }

  /// Sends the active device FCM token to the backend.
  Future<void> syncTokenWithBackend([String? token]) async {
    try {
      final fcmToken = token ?? await _messaging?.getToken();
      if (fcmToken == null || fcmToken.isEmpty) return;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_fcm_token', fcmToken);

      if (_dio != null) {
        try {
          await _dio!.post(
            '/api/v1/student/fcm-token',
            data: {
              'token': fcmToken,
              'platform': Platform.isAndroid ? 'android' : 'ios',
            },
          );
          debugPrint('[FCM] Synced token with backend successfully.');
        } on DioException catch (dioErr) {
          if (dioErr.response?.statusCode == 401) {
            // Expected on startup when student is not logged in yet.
            // Token is cached in SharedPreferences and will be synced upon login.
            debugPrint(
              '[FCM] Student not signed in yet (HTTP 401). Token cached locally, will sync upon login.',
            );
            return;
          }
          rethrow;
        }
      }
    } catch (e) {
      debugPrint('[FCM] Could not sync token with backend: $e');
    }
  }

  /// Unregister token from backend and delete it on sign-out.
  Future<void> unregisterOnSignOut() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedToken = prefs.getString('cached_fcm_token');
      if (cachedToken != null && _dio != null) {
        await _dio!.delete(
          '/api/v1/student/fcm-token',
          data: {'token': cachedToken},
        );
      }
      await _messaging?.deleteToken();
      await prefs.remove('cached_fcm_token');
      debugPrint('[FCM] Unregistered token on sign-out.');
    } catch (e) {
      debugPrint('[FCM] Error unregistering token: $e');
    }
  }
}
