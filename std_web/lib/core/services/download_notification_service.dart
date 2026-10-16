import 'package:flutter/foundation.dart';

/// Handles download notifications.
/// On web browsers, the browser's download manager natively handles
/// file download alerts, progress, and shelf display.
class DownloadNotificationService {
  DownloadNotificationService._();
  static final DownloadNotificationService instance =
      DownloadNotificationService._();

  bool _initialized = false;

  Future<void> init() async {
    _initialized = true;
  }

  Future<void> showDownloadComplete({
    required int id,
    required String fileName,
    required String filePath,
  }) async {
    debugPrint('[DownloadNotificationService] Download complete: $fileName');
  }

  Future<void> showDownloadFailed({
    required int id,
    required String fileName,
  }) async {
    debugPrint('[DownloadNotificationService] Download failed: $fileName');
  }
}
