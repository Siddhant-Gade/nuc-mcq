import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../models/broadcast.dart';

/// Reads broadcasts the authenticated student is allowed to see.
class BroadcastRepository {
  BroadcastRepository(this._dio);

  final Dio _dio;

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
}
