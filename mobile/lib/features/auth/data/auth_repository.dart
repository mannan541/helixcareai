import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/user_entity.dart';

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<({UserEntity user, String token})> login(String email, String password) async {
    try {
      final data = await _api.post<Map<String, dynamic>>(
        '/api/auth/login',
        {'email': email, 'password': password},
      );
      final user = _userFromJson(data!['user'] as Map<String, dynamic>);
      final token = data['token'] as String;
      _api.setToken(token);
      return (user: user, token: token);
    } on DioException catch (e) {
      throw _handleDio(e);
    }
  }

  Future<({UserEntity user, String token})> register(
    String email,
    String password,
    String fullName,
    String role,
  ) async {
    try {
      final data = await _api.post<Map<String, dynamic>>(
        '/api/auth/register',
        {'email': email, 'password': password, 'fullName': fullName, 'role': role},
      );
      final user = _userFromJson(data!['user'] as Map<String, dynamic>);
      final token = data['token'] as String;
      _api.setToken(token);
      return (user: user, token: token);
    } on DioException catch (e) {
      throw _handleDio(e);
    }
  }

  Future<UserEntity?> me() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/auth/me');
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return null;
      throw _handleDio(e);
    }
  }

  void setToken(String? token) {
    _api.setToken(token);
  }

  UserEntity _userFromJson(Map<String, dynamic> j) {
    return UserEntity(
      id: j['id'] as String,
      email: j['email'] as String,
      fullName: j['fullName'] as String,
      role: j['role'] as String,
    );
  }

  AppException _handleDio(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    if (code == 400) return ValidationException(msg);
    return AppException(msg, code);
  }
}
