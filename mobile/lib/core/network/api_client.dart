import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiClient {
  late final Dio _dio;
  String? _token;

  ApiClient() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
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
          // Could emit logout event here
        }
        return handler.next(err);
      },
    ));
  }

  void setToken(String? token) {
    _token = token;
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    final r = await _dio.get<dynamic>(path, queryParameters: queryParameters);
    return r.data as T;
  }

  Future<T> post<T>(String path, [dynamic data]) async {
    final r = await _dio.post<dynamic>(path, data: data);
    return r.data as T;
  }

  Future<T> patch<T>(String path, [dynamic data]) async {
    final r = await _dio.patch<dynamic>(path, data: data);
    return r.data as T;
  }

  Future<void> delete(String path) async {
    await _dio.delete(path);
  }
}
