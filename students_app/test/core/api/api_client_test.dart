import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/core/api/api_client.dart';
import 'package:student_app/core/api/api_exception.dart';

void main() {
  group('requireSuccessData', () {
    test('unwraps the data field of a success envelope', () {
      final data = requireSuccessData(<String, dynamic>{
        'success': true,
        'data': <String>['a', 'b'],
      });

      expect(data, isA<List<dynamic>>());
      expect(data as List<dynamic>, ['a', 'b']);
    });

    test('throws with backend code/message for an error envelope', () {
      expect(
        () => requireSuccessData(<String, dynamic>{
          'success': false,
          'error': <String, dynamic>{
            'code': 'AUTHENTICATION_ERROR',
            'message': 'Authentication token is required.',
          },
        }),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'AUTHENTICATION_ERROR')
              .having((e) => e.message, 'message', 'Authentication token is required.'),
        ),
      );
    });

    test('throws for a malformed body', () {
      expect(
        () => requireSuccessData('not-json'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'MALFORMED_RESPONSE')),
      );
    });
  });

  group('exceptionFromEnvelope', () {
    test('maps the error envelope fields', () {
      final exception = exceptionFromEnvelope(<String, dynamic>{
        'success': false,
        'error': <String, dynamic>{'code': 'VALIDATION_ERROR', 'message': 'Request validation failed.'},
      });

      expect(exception.code, 'VALIDATION_ERROR');
      expect(exception.message, 'Request validation failed.');
    });
  });

  group('exceptionFromDio', () {
    test('prefers a structured backend error body over generic HTTP text', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/api/v1/student/broadcasts'),
        type: DioExceptionType.badResponse,
        response: Response<Object?>(
          requestOptions: RequestOptions(path: '/api/v1/student/broadcasts'),
          statusCode: 403,
          data: <String, dynamic>{
            'success': false,
            'error': <String, dynamic>{'code': 'STUDENT_ACCESS_INACTIVE', 'message': 'Student access is REVOKED.'},
          },
        ),
      );

      final mapped = exceptionFromDio(error);

      expect(mapped.code, 'STUDENT_ACCESS_INACTIVE');
      expect(mapped.message, 'Student access is REVOKED.');
    });

    test('maps connection failures to a network message', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/api/v1/student/broadcasts'),
        type: DioExceptionType.connectionError,
      );

      expect(exceptionFromDio(error).code, 'NETWORK_UNAVAILABLE');
    });
  });
}
