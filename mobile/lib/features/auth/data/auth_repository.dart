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

  /// Admin only. Returns dashboard counts. Accepts camelCase or snake_case keys.
  Future<DashboardCounts?> getDashboardCounts() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/admin/dashboard/counts');
      if (data == null) return null;
      return DashboardCounts(
        children: _parseInt(data['children']),
        therapists: _parseInt(data['therapists']),
        parents: _parseInt(data['parents']),
        totalUsers: _parseInt(data['totalUsers'] ?? data['total_users']),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 401) return null;
      throw _handleDio(e);
    }
  }

  static int _parseInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  /// Admin only. List users with optional role filter and search.
  Future<UsersListResponse> listUsers({
    String? role,
    int limit = 50,
    int offset = 0,
    String? search,
  }) async {
    try {
      final queryParams = <String, dynamic>{'limit': limit, 'offset': offset};
      if (role != null && role.isNotEmpty) queryParams['role'] = role;
      if (search != null && search.trim().isNotEmpty) queryParams['q'] = search.trim();
      final data = await _api.get<Map<String, dynamic>>(
        '/api/admin/users',
        queryParameters: queryParams,
      );
      final list = data!['users'] as List<dynamic>? ?? [];
      final total = data['total'] as int? ?? 0;
      final users = list.map((e) => _userFromJson(e as Map<String, dynamic>)).toList();
      return UsersListResponse(users: users, total: total, limit: limit, offset: offset);
    } on DioException catch (e) {
      throw _handleDio(e);
    }
  }

  /// Admin only. Get a single user by id.
  Future<UserEntity?> getUserAsAdmin(String id) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/admin/users/$id');
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleDio(e);
    }
  }

  /// Admin only. Update a user (fullName, title, password). Pass empty string for title to clear it.
  Future<UserEntity?> updateUserAsAdmin(String id, {String? fullName, String? title, String? password}) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['fullName'] = fullName;
      if (title != null) body['title'] = title.isEmpty ? null : title;
      if (password != null && password.isNotEmpty) body['password'] = password;
      if (body.isEmpty) return null;
      final data = await _api.put<Map<String, dynamic>>('/api/admin/users/$id', body);
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
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
    final name = j['fullName'] ?? j['full_name'];
    return UserEntity(
      id: j['id'] as String,
      email: j['email'] as String,
      fullName: name != null ? name as String : '',
      role: j['role'] as String,
      title: j['title'] as String?,
    );
  }

  static String _shortMessageForStatusCode(int code) {
    switch (code) {
      case 404:
        return 'Not found (404). The API endpoint may be missing. Restart or redeploy the backend.';
      case 403:
        return 'Forbidden (403). You do not have permission.';
      case 500:
        return 'Server error (500). Check backend logs.';
      default:
        if (code >= 400 && code < 500) return 'Client error ($code). Check request or backend.';
        if (code >= 500) return 'Server error ($code). Check backend.';
        return 'Request failed.';
    }
  }

  AppException _handleDio(DioException e) {
    final data = e.response?.data;
    final serverMsg = (data is Map<String, dynamic>) ? (data['error'] as String?) : null;
    final code = e.response?.statusCode;
    final message = serverMsg ??
        (code != null ? _shortMessageForStatusCode(code) : (e.error?.toString() ?? 'Request failed'));
    if (code == 401) return UnauthorizedException(message);
    if (code == 400) return ValidationException(message);
    return AppException(message, code);
  }
}

class TherapistsResponse {
  TherapistsResponse({required this.users, required this.total});
  final List<UserEntity> users;
  final int total;
}

class DashboardCounts {
  DashboardCounts({
    required this.children,
    required this.therapists,
    required this.parents,
    required this.totalUsers,
  });
  final int children;
  final int therapists;
  final int parents;
  final int totalUsers;
}

class UsersListResponse {
  UsersListResponse({required this.users, required this.total, required this.limit, required this.offset});
  final List<UserEntity> users;
  final int total;
  final int limit;
  final int offset;
}
