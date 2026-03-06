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

  Future<TherapistsResponse> getTherapists({int limit = 50, int offset = 0, String? search}) async {
    try {
      final queryParams = <String, dynamic>{'limit': limit, 'offset': offset};
      if (search != null && search.trim().isNotEmpty) queryParams['q'] = search.trim();
      final data = await _api.get<Map<String, dynamic>>(
        '/api/auth/therapists',
        queryParameters: queryParams,
      );
      final list = data!['users'] as List<dynamic>? ?? [];
      final total = data['total'] as int? ?? 0;
      final users = list.map((e) => _userFromJson(e as Map<String, dynamic>)).toList();
      return TherapistsResponse(users: users, total: total);
    } on DioException catch (e) {
      throw _handleDio(e);
    }
  }

  Future<UserEntity?> createUserAsAdmin({
    required String email,
    required String fullName,
    required String role,
    String? title,
    List<String>? childIds,
  }) async {
    try {
      final body = <String, dynamic>{
        'email': email,
        'fullName': fullName,
        'role': role,
      };
      if (title != null) body['title'] = title;
      if (childIds != null && childIds.isNotEmpty) body['childIds'] = childIds;
      final data = await _api.post<Map<String, dynamic>>('/api/admin/users', body);
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      throw _handleDio(e);
    }
  }

  Future<UserEntity?> updateProfile({String? fullName, String? password}) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['fullName'] = fullName;
      if (password != null && password.isNotEmpty) body['password'] = password;
      if (body.isEmpty) return null;
      final data = await _api.patch<Map<String, dynamic>>('/api/auth/profile', body);
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
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
      title: j['title'] as String?,
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

class TherapistsResponse {
  TherapistsResponse({required this.users, required this.total});
  final List<UserEntity> users;
  final int total;
}
