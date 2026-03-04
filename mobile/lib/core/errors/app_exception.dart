class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException([String message = 'Network error']) : super(message);
}

class UnauthorizedException extends AppException {
  UnauthorizedException([String message = 'Unauthorized']) : super(message, 401);
}

class ValidationException extends AppException {
  ValidationException([String message = 'Validation failed']) : super(message, 400);
}
