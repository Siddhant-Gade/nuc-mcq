import 'dart:js_interop';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:web/web.dart' as web;
import '../../../core/services/download_notification_service.dart';
import '../models/study_material_model.dart';

class StudyMaterialsRepository {
  StudyMaterialsRepository({Dio? dio}) : _dio = dio;

  final Dio? _dio;
  List<StudyMaterialModel> _materials = [];
  final Map<String, Uint8List> _bytesCache = {};

  Future<List<StudyMaterialModel>> getAllMaterials({bool forceRefresh = false}) async {
    if (!forceRefresh && _materials.isNotEmpty) {
      return List.unmodifiable(_materials);
    }
    if (_dio != null) {
      try {
        final response = await _dio.get<Object?>('/api/v1/student/study-materials');
        if (response.data is Map && (response.data as Map)['success'] == true) {
          final list = (response.data as Map)['data'];
          if (list is List) {
            _materials = list
                .whereType<Map>()
                .map<StudyMaterialModel>((m) => StudyMaterialModel.fromJson(Map<String, dynamic>.from(m)))
                .toList();
          }
        }
      } catch (_) {
        // Fallback safely to empty list
      }
    }
    return List.unmodifiable(_materials);
  }

  Future<List<StudyMaterialModel>> getMaterialsByCategory(String category, {bool forceRefresh = false}) async {
    final all = await getAllMaterials(forceRefresh: forceRefresh);
    if (category == 'ALL') return all;
    return all.where((m) => m.category == category).toList();
  }

  void setMaterials(List<StudyMaterialModel> items) {
    _materials = List<StudyMaterialModel>.from(items);
  }

  /// Fetches material access information (signed URL or embed info)
  Future<Map<String, dynamic>?> getMaterialAccess(String id) async {
    if (_dio == null) return null;
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/v1/student/study-materials/$id/access');
      if (response.data != null && response.data!['success'] == true) {
        return response.data!['data'] as Map<String, dynamic>?;
      }
    } catch (_) {}
    return null;
  }

  /// Downloads raw material file bytes with caching and multi-tier fallback
  Future<Uint8List?> downloadMaterialBytes(String id) async {
    final cached = _bytesCache[id];
    if (cached != null && cached.isNotEmpty) {
      return cached;
    }

    if (_dio == null) {
      debugPrint('[StudyMaterials] Dio client is null');
      return null;
    }

    // Tier 1: Direct authenticated download endpoint
    try {
      final response = await _dio.get<List<int>>(
        '/api/v1/student/study-materials/$id/download',
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: true,
          receiveTimeout: const Duration(seconds: 45),
          headers: {'Accept': '*/*'},
        ),
      );
      if (response.data != null && response.data!.isNotEmpty) {
        final bytes = Uint8List.fromList(response.data!);
        _bytesCache[id] = bytes;
        return bytes;
      }
    } catch (e) {
      debugPrint('[StudyMaterials] Direct download attempt failed for $id: $e');
    }

    // Tier 2: Fetch signed/access URL and download via clean client (avoids forwarding Bearer header to signed storage URL)
    try {
      final access = await getMaterialAccess(id);
      final url = access?['url']?.toString();
      if (url != null && url.isNotEmpty) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          final cleanDio = Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 45),
              responseType: ResponseType.bytes,
            ),
          );
          final response = await cleanDio.get<List<int>>(url);
          if (response.data != null && response.data!.isNotEmpty) {
            final bytes = Uint8List.fromList(response.data!);
            _bytesCache[id] = bytes;
            return bytes;
          }
        } else {
          final response = await _dio.get<List<int>>(
            url,
            options: Options(
              responseType: ResponseType.bytes,
              receiveTimeout: const Duration(seconds: 45),
              headers: {'Accept': '*/*'},
            ),
          );
          if (response.data != null && response.data!.isNotEmpty) {
            final bytes = Uint8List.fromList(response.data!);
            _bytesCache[id] = bytes;
            return bytes;
          }
        }
      }
    } catch (e) {
      debugPrint('[StudyMaterials] Access URL fallback failed for $id: $e');
    }

    return null;
  }

  String _getMimeType(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    return 'application/octet-stream';
  }

  /// Downloads material file and triggers browser download
  Future<String?> downloadAndSaveFile(String id, String fileName) async {
    final bytes = await downloadMaterialBytes(id);
    if (bytes == null || bytes.isEmpty) {
      debugPrint('[StudyMaterials] Cannot save file: bytes is empty or null for $id');
      DownloadNotificationService.instance.showDownloadFailed(
        id: id.hashCode,
        fileName: fileName,
      );
      return null;
    }

    final cleanFileName = fileName.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
    final mimeType = _getMimeType(cleanFileName);

    try {
      final blob = web.Blob([bytes.toJS].toJS, web.BlobPropertyBag(type: mimeType));
      final url = web.URL.createObjectURL(blob);
      final anchor = web.document.createElement('a') as web.HTMLAnchorElement;
      anchor.href = url;
      anchor.download = cleanFileName;
      web.document.body?.appendChild(anchor);
      anchor.click();
      anchor.remove();
      web.URL.revokeObjectURL(url);

      DownloadNotificationService.instance.showDownloadComplete(
        id: id.hashCode,
        fileName: cleanFileName,
        filePath: cleanFileName,
      );
      return cleanFileName;
    } catch (e) {
      debugPrint('[StudyMaterials] Browser blob download error: $e');
      return null;
    }
  }
}
