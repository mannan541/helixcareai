import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/user_entity.dart';
import '../../notifications/domain/notification_entity.dart';

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

  /// Returns user and optional token. Token is null when account is pending admin approval.
  Future<({UserEntity user, String? token})> register(
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
      final token = data['token'] as String?;
      if (token != null) _api.setToken(token);
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
        pendingUsers: _parseInt(data['pendingUsers'] ?? data['pending_users']),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 401) return null;
      throw _handleDio(e);
    }
  }

  /// Therapist/parent: returns children count and sessions count (role-specific).
  Future<UserDashboardCounts?> getDashboardCountsForUser() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/auth/dashboard/counts');
      if (data == null) return null;
      return UserDashboardCounts(
        children: _parseInt(data['children']),
        sessions: _parseInt(data['sessions']),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) return null;
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

  /// Admin only. List users with optional role filter, search, and pending-only filter.
  Future<UsersListResponse> listUsers({
    String? role,
    int limit = 50,
    int offset = 0,
    String? search,
    bool pendingOnly = false,
  }) async {
    try {
      final queryParams = <String, dynamic>{'limit': limit, 'offset': offset};
      if (role != null && role.isNotEmpty) queryParams['role'] = role;
      if (search != null && search.trim().isNotEmpty) queryParams['q'] = search.trim();
      if (pendingOnly) queryParams['pending'] = 'true';
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

  /// Admin only. Update a user (fullName, title, password, childIds for parent). Pass empty string for title to clear it.
  /// Admin only. Approve a pending user so they can sign in.
  Future<UserEntity?> approveUserAsAdmin(String id) async {
    try {
      final data = await _api.put<Map<String, dynamic>>('/api/admin/users/$id/approve', {});
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleDio(e);
    }
  }

  /// Admin only. Disable user (they cannot sign in; logged out on next request).
  Future<UserEntity?> disableUserAsAdmin(String id) async {
    try {
      final data = await _api.put<Map<String, dynamic>>('/api/admin/users/$id/disable', {});
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleDio(e);
    }
  }

  /// Admin only. Re-enable a disabled user.
  Future<UserEntity?> enableUserAsAdmin(String id) async {
    try {
      final data = await _api.put<Map<String, dynamic>>('/api/admin/users/$id/enable', {});
      final userData = data?['user'] as Map<String, dynamic>?;
      if (userData == null) return null;
      return _userFromJson(userData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleDio(e);
    }
  }

  /// Admin only. Soft-delete user (they cannot sign in; logged out on next request).
  Future<void> deleteUserAsAdmin(String id) async {
    await _api.delete('/api/admin/users/$id');
  }

  Future<UserEntity?> updateUserAsAdmin(String id, {String? fullName, String? title, String? password, List<String>? childIds, String? mobileNumber, bool? showMobileToParents}) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['fullName'] = fullName;
      if (title != null) body['title'] = title.isEmpty ? null : title;
      if (password != null && password.isNotEmpty) body['password'] = password;
      if (childIds != null) body['childIds'] = childIds;
      if (mobileNumber != null) body['mobileNumber'] = mobileNumber.isEmpty ? null : mobileNumber;
      if (showMobileToParents != null) body['showMobileToParents'] = showMobileToParents;
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

  Future<UserEntity?> updateProfile({
    String? fullName,
    String? password,
    String? currentPassword,
    String? mobileNumber,
    bool? showMobileToParents,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['fullName'] = fullName;
      if (password != null && password.isNotEmpty) body['password'] = password;
      if (currentPassword != null && currentPassword.isNotEmpty) body['currentPassword'] = currentPassword;
      if (mobileNumber != null) body['mobileNumber'] = mobileNumber.isEmpty ? null : mobileNumber;
      if (showMobileToParents != null) body['showMobileToParents'] = showMobileToParents;
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

  // ============== Notifications ==============

  Future<int> getNotificationUnreadCount() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/notifications/unread-count');
      final count = data?['count'];
      if (count is int) return count;
      if (count is num) return count.toInt();
      return 0;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return 0;
      rethrow;
    }
  }

  Future<NotificationsListResponse> getNotifications({
    int limit = 50,
    int offset = 0,
    bool unreadOnly = false,
  }) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/api/notifications',
      queryParameters: {'limit': limit, 'offset': offset, if (unreadOnly) 'unreadOnly': 'true'},
    );
    final list = data!['notifications'] as List<dynamic>? ?? [];
    final total = data['total'] as int? ?? 0;
    final notifications = list.map((e) => _notificationFromJson(e as Map<String, dynamic>)).toList();
    return NotificationsListResponse(notifications: notifications, total: total, limit: limit, offset: offset);
  }

  Future<bool> markNotificationRead(String id) async {
    try {
      await _api.put<Map<String, dynamic>>('/api/notifications/$id/read', {});
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return false;
      throw _handleDio(e);
    }
  }

  Future<int> markAllNotificationsRead() async {
    final data = await _api.post<Map<String, dynamic>>('/api/notifications/read-all', {});
    final marked = data?['marked'];
    if (marked is int) return marked;
    if (marked is num) return marked.toInt();
    return 0;
  }

  /// Parse approved_at/disabled_at from API. Only returns non-null when value is a valid date string.
  static DateTime? _parseOptionalDateTime(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    if (s.isEmpty || s == 'null') return null;
    return DateTime.tryParse(s);
  }

  NotificationEntity _notificationFromJson(Map<String, dynamic> j) {
    final readAtRaw = j['readAt'] ?? j['read_at'];
    final createdAtRaw = j['createdAt'] ?? j['created_at'];
    final meta = j['meta'] is Map ? Map<String, dynamic>.from(j['meta'] as Map) : <String, dynamic>{};
    return NotificationEntity(
      id: j['id'] as String,
      type: j['type'] as String? ?? 'unknown',
      title: j['title'] as String? ?? '',
      body: j['body'] as String?,
      readAt: readAtRaw != null ? DateTime.tryParse(readAtRaw.toString()) : null,
      createdAt: createdAtRaw != null ? DateTime.tryParse(createdAtRaw.toString()) ?? DateTime.now() : DateTime.now(),
      meta: meta,
    );
  }

  UserEntity _userFromJson(Map<String, dynamic> j) {
    final name = j['fullName'] ?? j['full_name'];
    final childIdsRaw = j['childIds'];
    final List<String>? childIds = childIdsRaw is List
        ? (childIdsRaw).map((e) => e.toString()).where((s) => s.length == 36).toList()
        : null;
    final approvedAtRaw = j['approvedAt'] ?? j['approved_at'];
    final disabledAtRaw = j['disabledAt'] ?? j['disabled_at'];
    final DateTime? approvedAt = _parseOptionalDateTime(approvedAtRaw);
    final DateTime? disabledAt = _parseOptionalDateTime(disabledAtRaw);
    final mobileRaw = j['mobileNumber'] ?? j['mobile_number'];
    final showRaw = j['showMobileToParents'] ?? j['show_mobile_to_parents'];
    return UserEntity(
      id: j['id'] as String,
      email: j['email'] as String,
      fullName: name != null ? name as String : '',
      role: j['role'] as String,
      title: j['title'] as String?,
      childIds: childIds,
      approvedAt: approvedAt,
      disabledAt: disabledAt,
      mobileNumber: mobileRaw != null ? mobileRaw as String? : null,
      showMobileToParents: showRaw is bool ? showRaw : null,
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
    if (code == 403) return AppException(message, 403);
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
    this.pendingUsers = 0,
  });
  final int children;
  final int therapists;
  final int parents;
  final int totalUsers;
  final int pendingUsers;
}

/// Dashboard counts for therapist/parent (children + sessions).
class UserDashboardCounts {
  UserDashboardCounts({required this.children, required this.sessions});
  final int children;
  final int sessions;
}

class UsersListResponse {
  UsersListResponse({required this.users, required this.total, required this.limit, required this.offset});
  final List<UserEntity> users;
  final int total;
  final int limit;
  final int offset;
}

class NotificationsListResponse {
  NotificationsListResponse({
    required this.notifications,
    required this.total,
    required this.limit,
    required this.offset,
  });
  final List<NotificationEntity> notifications;
  final int total;
  final int limit;
  final int offset;
}
