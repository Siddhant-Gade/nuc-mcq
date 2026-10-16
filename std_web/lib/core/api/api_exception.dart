/// A structured failure returned by the backend or produced while calling it.
class ApiException implements Exception {
  const ApiException(this.code, this.message);

  /// Backend error code, e.g. AUTHENTICATION_ERROR, VALIDATION_ERROR.
  final String code;

  /// Human-readable message safe to show in the UI.
  final String message;

  @override
  String toString() => 'ApiException($code): $message';
}
