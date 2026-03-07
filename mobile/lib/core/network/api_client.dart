import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiClient {
  late final Dio _dio;
  String? _token;
  void Function()? _onUnauthorized;

  ApiClient() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 120),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        return handler.next(options);
      },
      onError: (err, handler) {
        if (err.response?.statusCode == 401) {
          _onUnauthorized?.call();
        }
        return handler.next(err);
      },
    ));
  }

  void setOnUnauthorized(void Function() callback) {
    _onUnauthorized = callback;
  }

  void setToken(String? token) {
    _token = token;
  }

  static bool _isHtmlResponse(dynamic data) =>
      data is String && (data.startsWith('<!') || data.startsWith('<'));

  static T _ensureJson<T>(dynamic data, int? statusCode) {
    if (data is! T) {
      if (_isHtmlResponse(data)) {
        throw DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response(requestOptions: RequestOptions(path: ''), statusCode: statusCode, data: data),
          type: DioExceptionType.badResponse,
          error: 'Server returned an error page instead of JSON. Restart the backend or redeploy.',
        );
      }
      throw DioException(
        requestOptions: RequestOptions(path: ''),
        response: Response(requestOptions: RequestOptions(path: ''), statusCode: statusCode, data: data),
        type: DioExceptionType.badResponse,
        error: 'Unexpected response type',
      );
    }
    return data;
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    final r = await _dio.get<dynamic>(path, queryParameters: queryParameters);
    return _ensureJson<T>(r.data, r.statusCode);
  }

  Future<T> post<T>(String path, [dynamic data, Duration? receiveTimeout]) async {
    final options = receiveTimeout != null ? Options(receiveTimeout: receiveTimeout) : null;
    final r = await _dio.post<dynamic>(path, data: data, options: options);
    return _ensureJson<T>(r.data, r.statusCode);
  }

  Future<T> patch<T>(String path, [dynamic data]) async {
    final r = await _dio.patch<dynamic>(path, data: data);
    return _ensureJson<T>(r.data, r.statusCode);
  }

  Future<T> put<T>(String path, [dynamic data]) async {
    final r = await _dio.put<dynamic>(path, data: data);
    return _ensureJson<T>(r.data, r.statusCode);
  }

  Future<void> delete(String path) async {
    await _dio.delete(path);
  }
}
