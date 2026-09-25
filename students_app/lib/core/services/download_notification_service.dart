import 'dart:io';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:open_filex/open_filex.dart';

/// Handles Android system notifications for document and study material downloads,
/// with progress indicators, completion chimes, and tap-to-open document handling.
class DownloadNotificationService {
  DownloadNotificationService._();
  static final DownloadNotificationService instance =
      DownloadNotificationService._();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  static const String _channelId = 'downloads_channel';
  static const String _channelName = 'Document Downloads';
  static const String _channelDesc =
      'Notifications for downloaded study materials and documents';

  Future<void> init() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(
      android: androidSettings,
    );

    await _notifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          OpenFilex.open(payload);
        }
      },
    );

    if (Platform.isAndroid) {
      final androidImplementation = _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      await androidImplementation?.requestNotificationsPermission();
    }

    _initialized = true;
  }

  /// Displays an Android system notification upon download completion.
  /// Tapping the notification opens the document using the device default reader.
  Future<void> showDownloadComplete({
    required int id,
    required String fileName,
    required String filePath,
  }) async {
    await init();

    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      playSound: true,
      icon: '@mipmap/ic_launcher',
    );

    const details = NotificationDetails(android: androidDetails);

    await _notifications.show(
      id: id,
      title: 'Download Complete',
      body: '$fileName (Tap to open)',
      notificationDetails: details,
      payload: filePath,
    );
  }

  /// Displays an Android system notification if a download fails.
  Future<void> showDownloadFailed({
    required int id,
    required String fileName,
  }) async {
    await init();

    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      showWhen: true,
      icon: '@mipmap/ic_launcher',
    );

    const details = NotificationDetails(android: androidDetails);

    await _notifications.show(
      id: id,
      title: 'Download Failed',
      body: 'Could not download $fileName. Please try again.',
      notificationDetails: details,
    );
  }
}
