import 'dart:async';
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

  try {
    await AppBadgeService.instance.incrementBadge();
  } catch (_) {}
  final currentBadge = await AppBadgeService.instance.getBadgeCount();
  final badgeNumber = currentBadge > 0 ? currentBadge : 1;

  final title =
      message.notification?.title ?? message.data['title']?.toString();
  final body = message.notification?.body ?? message.data['body']?.toString();

  // If message.notification != null, Google Play Services natively displays the
  // notification banner and content in the Android notification panel.
  // We explicitly present a local notification for data-only push messages to avoid duplicate notifications.
  if (message.notification == null && title != null && title.isNotEmpty && !kIsWeb) {
    try {
      final localNotifications = FlutterLocalNotificationsPlugin();
      const initSettings = InitializationSettings(
        android: AndroidInitializationSettings('ic_nuc_notification'),
      );
      await localNotifications.initialize(settings: initSettings);

      final broadcastId = message.data['broadcastId']?.toString();
      final materialId = message.data['materialId']?.toString();
      final notifId = broadcastId != null
          ? broadcastId.hashCode
          : (materialId != null ? materialId.hashCode : message.hashCode);

      await localNotifications.show(
        id: notifId,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            'nuc_priority_channel',
            'NUC Student Notifications',
            channelDescription:
                'This channel is used for important student notifications.',
            icon: 'ic_nuc_notification',
            largeIcon: const DrawableResourceAndroidBitmap('ic_nuc_large_icon'),
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
            channelShowBadge: true,
            number: badgeNumber,
          ),
        ),
        payload: jsonEncode(message.data),
      );
    } catch (e) {
      debugPrint('[FCM Background] Local notification error: $e');
    }
  }
}

typedef NotificationPayloadHandler = void Function(Map<String, dynamic> data);
typedef NotificationReceivedHandler = void Function(Map<String, dynamic> data);

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
  final Completer<void> _initCompleter = Completer<void>();

  NotificationPayloadHandler? _onNotificationTap;
  NotificationReceivedHandler? onNotificationReceived;
  Map<String, dynamic>? _pendingTapPayload;

  NotificationPayloadHandler? get onNotificationTap => _onNotificationTap;
  set onNotificationTap(NotificationPayloadHandler? handler) {
    _onNotificationTap = handler;
    if (handler != null && _pendingTapPayload != null) {
      final payload = _pendingTapPayload!;
      _pendingTapPayload = null;
      handler(payload);
    }
  }

  static const String _channelId = 'nuc_priority_channel';
  static const String _channelName = 'NUC Student Notifications';
  static const String _channelDesc =
      'This channel is used for important student notifications.';

  /// Initialize Firebase Messaging, permissions, local channels, and foreground listeners.
  Future<void> init({
    Dio? dio,
    NotificationPayloadHandler? onNotificationTap,
    NotificationReceivedHandler? onNotificationReceived,
  }) async {
    if (_initialized) {
      if (dio != null) _dio = dio;
      if (onNotificationTap != null) this.onNotificationTap = onNotificationTap;
      if (onNotificationReceived != null) this.onNotificationReceived = onNotificationReceived;
      return;
    }

    _dio = dio;
    if (onNotificationTap != null) this.onNotificationTap = onNotificationTap;
    if (onNotificationReceived != null) this.onNotificationReceived = onNotificationReceived;

    if (Firebase.apps.isEmpty) {
      debugPrint(
        '[FCM] Firebase not initialized (e.g. in test environment). Skipping native FCM setup.',
      );
      _initialized = true;
      if (!_initCompleter.isCompleted) _initCompleter.complete();
      return;
    }

    try {
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

      // 2. Setup high-importance notification channel with showBadge: true
      const androidChannel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDesc,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        showBadge: true,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(androidChannel);

      // 3. Initialize flutter_local_notifications for foreground display & tap handling
      const initSettings = InitializationSettings(
        android: AndroidInitializationSettings('ic_nuc_notification'),
      );

      await _localNotifications.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (response) {
          final payload = response.payload;
          if (payload != null && payload.isNotEmpty) {
            try {
              final data = jsonDecode(payload) as Map<String, dynamic>;
              if (_onNotificationTap != null) {
                _onNotificationTap!(data);
              } else {
                _pendingTapPayload = data;
              }
            } catch (e) {
              debugPrint('[FCM] Error decoding notification payload: $e');
            }
          }
        },
      );

      // 4. Foreground message listener -> show heads-up local notification banner with badge number
      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        debugPrint(
          '[FCM Foreground] Message received: ${message.notification?.title}',
        );
        final title =
            message.notification?.title ?? message.data['title']?.toString();
        final body =
            message.notification?.body ?? message.data['body']?.toString();

        if (title != null && !kIsWeb) {
          await AppBadgeService.instance.incrementBadge();
          final currentBadge = await AppBadgeService.instance.getBadgeCount();
          final badgeNumber = currentBadge > 0 ? currentBadge : 1;

          final broadcastId = message.data['broadcastId']?.toString();
          final notifId = broadcastId != null ? broadcastId.hashCode : message.hashCode;

          await _localNotifications.show(
            id: notifId,
            title: title,
            body: body,
            notificationDetails: NotificationDetails(
              android: AndroidNotificationDetails(
                _channelId,
                _channelName,
                channelDescription: _channelDesc,
                icon: 'ic_nuc_notification',
                largeIcon: const DrawableResourceAndroidBitmap(
                  'ic_nuc_large_icon',
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
                channelShowBadge: true,
                number: badgeNumber,
              ),
            ),
            payload: jsonEncode(message.data),
          );
        }

        if (message.data.isNotEmpty) {
          onNotificationReceived?.call(message.data);
        }
      });

      // 5. App opened from background by tapping system notification
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[FCM] App opened via notification: ${message.data}');
        if (message.data.isNotEmpty) {
          if (_onNotificationTap != null) {
            _onNotificationTap!(message.data);
          } else {
            _pendingTapPayload = message.data;
          }
        }
      });

      // 6. Token refresh listener
      _messaging?.onTokenRefresh.listen((newToken) {
        debugPrint('[FCM] Token refreshed');
        syncTokenWithBackend(newToken);
      });

      // 7. Sync initial token if available asynchronously
      _messaging?.getToken().then((currentToken) {
        if (currentToken != null) {
          syncTokenWithBackend(currentToken);
        }
      }).catchError((e) {
        debugPrint('[FCM] Error fetching initial token: $e');
      });

      _initialized = true;
    } catch (e) {
      debugPrint('[FCM] Initialization error: $e');
    } finally {
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
    }
  }

  /// Checks whether notifications are currently allowed on the device.
  Future<bool> areNotificationsEnabled() async {
    try {
      if (Platform.isAndroid) {
        final androidImplementation = _localNotifications
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >();
        final enabled = await androidImplementation?.areNotificationsEnabled();
        return enabled ?? true;
      }
      final settings = await _messaging?.getNotificationSettings();
      return settings?.authorizationStatus == AuthorizationStatus.authorized;
    } catch (_) {
      return true;
    }
  }

  /// Explicitly requests notification permissions from the user when UI is active (Android 13+ / iOS).
  Future<bool> requestNotificationPermissions() async {
    try {
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
      debugPrint('[FCM] Runtime permission status: ${settings?.authorizationStatus}');
      return settings?.authorizationStatus == AuthorizationStatus.authorized;
    } catch (e) {
      debugPrint('[FCM] Error requesting notification permissions: $e');
      return false;
    }
  }

  /// Check if the app was launched from a terminated state via a notification tap.
  Future<RemoteMessage?> getInitialMessage() async {
    return _messaging?.getInitialMessage();
  }

  bool _initialPayloadHandled = false;

  /// Check if the app was launched from terminated state via either FCM or local notification tap.
  Future<Map<String, dynamic>?> getInitialPayload() async {
    if (_initialPayloadHandled) return null;
    try {
      if (!_initialized) {
        await _initCompleter.future.timeout(
          const Duration(seconds: 3),
          onTimeout: () {},
        );
      }

      if (_pendingTapPayload != null) {
        final pending = _pendingTapPayload;
        _pendingTapPayload = null;
        _initialPayloadHandled = true;
        return pending;
      }

      final fcmMessage = await _messaging?.getInitialMessage();
      if (fcmMessage != null && fcmMessage.data.isNotEmpty) {
        _initialPayloadHandled = true;
        return fcmMessage.data;
      }
      final launchDetails =
          await _localNotifications.getNotificationAppLaunchDetails();
      if (launchDetails != null && launchDetails.didNotificationLaunchApp) {
        final payload = launchDetails.notificationResponse?.payload;
        if (payload != null && payload.isNotEmpty) {
          _initialPayloadHandled = true;
          return jsonDecode(payload) as Map<String, dynamic>;
        }
      }
    } catch (e) {
      debugPrint('[FCM] Error getting initial payload: $e');
    }
    return null;
  }

  /// Dismisses a notification from the Android notification panel by broadcast ID.
  Future<void> dismissNotification(String broadcastId) async {
    try {
      await _localNotifications.cancel(id: broadcastId.hashCode);
      await AppBadgeService.instance.decrementBadge();
    } catch (e) {
      debugPrint('[FCM] Error dismissing notification $broadcastId: $e');
    }
  }

  /// Dismisses all notifications from the Android notification panel.
  Future<void> dismissAllNotifications() async {
    try {
      await _localNotifications.cancelAll();
      await AppBadgeService.instance.removeBadge();
    } catch (e) {
      debugPrint('[FCM] Error dismissing all notifications: $e');
    }
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
