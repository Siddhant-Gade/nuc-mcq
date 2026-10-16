import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

typedef AccessTokenReader = String? Function();

/// Extracts `data` from the backend envelope `{ success: true, data: ... }`,
/// throwing [ApiException] for the error shape or a malformed body.
Object? requireSuccessData(Object? body) {
  if (body is Map && body['success'] == true) {
    return body['data'];
  }
  if (body is Map && body['error'] is Map) {
    final error = body['error'] as Map;
    throw ApiException(
      '${error['code'] ?? 'UNKNOWN'}',
      '${error['message'] ?? 'The request was rejected.'}',
    );
  }
  throw const ApiException('MALFORMED_RESPONSE', 'Unexpected response from the server.');
}

/// Maps transport-level failures to user-facing [ApiException]s.
ApiException exceptionFromDio(DioException error) {
  final data = error.response?.data;
  if (data is Map && (data['success'] == false || data['error'] is Map)) {
    try {
      return exceptionFromEnvelope(data);
    } on ApiException {
      return _networkException(error);
    } catch (_) {
      return _networkException(error);
    }
  }
  return _networkException(error);
}

/// Maps an already-decoded backend error envelope to an [ApiException].
ApiException exceptionFromEnvelope(Object? body) {
  if (body is Map && body['error'] is Map) {
    final error = body['error'] as Map;
    return ApiException(
      '${error['code'] ?? 'UNKNOWN'}',
      '${error['message'] ?? 'The request was rejected.'}',
    );
  }
  throw const ApiException('MALFORMED_RESPONSE', 'Unexpected response from the server.');
}

ApiException _networkException(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.transformTimeout:
      return const ApiException('NETWORK_TIMEOUT', 'The server took too long to respond.');
    case DioExceptionType.connectionError:
      return const ApiException(
        'NETWORK_UNAVAILABLE',
        'Could not reach the server. Check your connection and the backend URL.',
      );
    case DioExceptionType.badCertificate:
      return const ApiException('BAD_CERTIFICATE', 'The server certificate could not be trusted.');
    case DioExceptionType.cancel:
      return const ApiException('REQUEST_CANCELLED', 'The request was cancelled.');
    case DioExceptionType.badResponse:
      final statusCode = error.response?.statusCode;
      return ApiException(
        'HTTP_$statusCode',
        'The server returned an unexpected response ($statusCode).',
      );
    case DioExceptionType.unknown:
      return const ApiException('UNKNOWN', 'Something went wrong. Please try again.');
  }
}

const List<String> _candidateBaseUrls = [
  'https://nuc-mcq-server.onrender.com',
  'http://192.168.29.37:3000',
  'http://192.168.29.253:3000',
  'http://localhost:3000',
  'http://10.0.2.2:3000',
];

/// Builds the shared Dio client: backend base URL + Bearer token injection + auto-fallback.
Dio createApiClient(AppConfig config, AccessTokenReader readAccessToken) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.backendBaseUrl,
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Accept': 'application/json'},
      responseType: ResponseType.json,
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = readAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Only attempt automatic fallback on connection errors
        if (error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout) {
          final isRetried = error.requestOptions.extra['auto_fallback_retried'] == true;
          if (!isRetried) {
            for (final candidate in _candidateBaseUrls) {
              if (candidate == dio.options.baseUrl) continue;
              try {
                final probeDio = Dio(BaseOptions(
                  baseUrl: candidate,
                  connectTimeout: const Duration(milliseconds: 1500),
                  receiveTimeout: const Duration(milliseconds: 1500),
                ));
                final probe = await probeDio.get<Object?>('/health');
                if (probe.statusCode == 200) {
                  // Found reachable server! Switch base URL
                  dio.options.baseUrl = candidate;
                  final retryOptions = error.requestOptions;
                  retryOptions.baseUrl = candidate;
                  retryOptions.extra['auto_fallback_retried'] = true;
                  final response = await dio.fetch<Object?>(retryOptions);
                  return handler.resolve(response);
                }
              } catch (_) {
                // Try next candidate
              }
            }
          }
        }
        return handler.next(error);
      },
    ),
  );
  return dio;
}
