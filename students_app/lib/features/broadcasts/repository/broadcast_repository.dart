import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../models/broadcast.dart';

/// Reads and synchronizes broadcasts for the authenticated student.
class BroadcastRepository {
  BroadcastRepository(this._dio);

  final Dio _dio;
  static const String _pendingReadIdsKey = 'pending_read_broadcast_ids_v1';
  static const String _pendingReadAllKey = 'pending_read_all_broadcasts_v1';

  Future<List<Broadcast>> fetchPublished() async {
    try {
      final response = await _dio.get<Object?>('/api/v1/student/broadcasts');
      final data = requireSuccessData(response.data);
      if (data is! List) {
        throw const ApiException('MALFORMED_RESPONSE', 'Unexpected broadcast list from the server.');
      }
      return data
          .whereType<Map>()
          .map((item) => Broadcast.fromMap(Map<String, dynamic>.from(item)))
          .toList(growable: false);
    } on DioException catch (error) {
      throw exceptionFromDio(error);
    }
  }

  Future<int> fetchUnreadCount() async {
    try {
      final response = await _dio.get<Object?>('/api/v1/student/broadcasts/unread-count');
      final data = requireSuccessData(response.data);
      if (data is Map && (data['unreadCount'] is num || data['count'] is num)) {
        final value = data['unreadCount'] ?? data['count'];
        return (value as num).toInt();
      }
      return 0;
    } on DioException catch (error) {
      throw exceptionFromDio(error);
    }
  }

  Future<void> markRead(String id) async {
    try {
      final response = await _dio.patch<Object?>('/api/v1/student/broadcasts/$id/read');
      requireSuccessData(response.data);
    } catch (e) {
      debugPrint('[BroadcastRepository] Error marking broadcast $id as read online: $e. Enqueueing offline.');
      await _enqueuePendingRead(id);
    }
  }

  Future<void> markAllRead() async {
    try {
      final response = await _dio.post<Object?>('/api/v1/student/broadcasts/read-all');
      requireSuccessData(response.data);
    } catch (e) {
      debugPrint('[BroadcastRepository] Error marking all broadcasts as read online: $e. Enqueueing offline.');
      await _enqueuePendingReadAll();
    }
  }

  Future<void> _enqueuePendingRead(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final set = (prefs.getStringList(_pendingReadIdsKey) ?? []).toSet();
      set.add(id);
      await prefs.setStringList(_pendingReadIdsKey, set.toList());
    } catch (_) {}
  }

  Future<void> _enqueuePendingReadAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_pendingReadAllKey, true);
    } catch (_) {}
  }

  Future<void> syncPendingReads() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingReadAll = prefs.getBool(_pendingReadAllKey) ?? false;
      if (pendingReadAll) {
        try {
          final res = await _dio.post<Object?>('/api/v1/student/broadcasts/read-all');
          requireSuccessData(res.data);
          await prefs.remove(_pendingReadAllKey);
          await prefs.remove(_pendingReadIdsKey);
          return;
        } catch (_) {
          return;
        }
      }

      final pendingIds = prefs.getStringList(_pendingReadIdsKey) ?? [];
      if (pendingIds.isEmpty) return;

      final remaining = <String>[];
      for (final id in pendingIds) {
        try {
          final res = await _dio.patch<Object?>('/api/v1/student/broadcasts/$id/read');
          requireSuccessData(res.data);
        } catch (e) {
          remaining.add(id);
        }
      }

      if (remaining.isEmpty) {
        await prefs.remove(_pendingReadIdsKey);
      } else {
        await prefs.setStringList(_pendingReadIdsKey, remaining);
      }
    } catch (_) {}
  }
}
