import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/session_entity.dart';

class SessionsRepository {
  final ApiClient _api;

  SessionsRepository(this._api);

  Future<SessionsListResponse> listByChild(String childId, {int limit = 20, int offset = 0}) async {
    try {
      final data = await _api.get<Map<String, dynamic>>(
        '/api/sessions/child/$childId',
        queryParameters: {'limit': limit, 'offset': offset},
      );
      final list = data!['sessions'] as List<dynamic>? ?? [];
      final total = data['total'] as int? ?? list.length;
      final sessions = list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
      return SessionsListResponse(sessions: sessions, total: total);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<SessionEntity> getOne(String id) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/sessions/$id');
      return _fromJson(data!['session'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<SessionEntity> create({
    required String childId,
    required String sessionDate,
    String? therapistId,
    int? durationMinutes,
    String? notesText,
    Map<String, dynamic>? structuredMetrics,
  }) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/sessions', {
        'childId': childId,
        'sessionDate': sessionDate,
        if (therapistId != null) 'therapistId': therapistId,
        if (durationMinutes != null) 'durationMinutes': durationMinutes,
        if (notesText != null) 'notesText': notesText,
        if (structuredMetrics != null) 'structuredMetrics': structuredMetrics,
      });
      return _fromJson(data!['session'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<SessionEntity> update(
    String id, {
    String? therapistId,
    String? sessionDate,
    int? durationMinutes,
    String? notesText,
    Map<String, dynamic>? structuredMetrics,
  }) async {
    try {
      final body = <String, dynamic>{};
      body['therapistId'] = therapistId;
      if (sessionDate != null) body['sessionDate'] = sessionDate;
      if (durationMinutes != null) body['durationMinutes'] = durationMinutes;
      if (notesText != null) body['notesText'] = notesText;
      if (structuredMetrics != null) body['structuredMetrics'] = structuredMetrics;
      final data = await _api.patch<Map<String, dynamic>>('/api/sessions/$id', body);
      return _fromJson(data!['session'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.delete('/api/sessions/$id');
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  static SessionUserInfo? _userFromJson(Map<String, dynamic>? u) {
    if (u == null || u['id'] == null) return null;
    return SessionUserInfo(
      id: u['id'] as String,
      fullName: u['fullName'] as String? ?? '',
      email: u['email'] as String? ?? '',
      title: u['title'] as String?,
    );
  }

  SessionEntity _fromJson(Map<String, dynamic> j) {
    return SessionEntity(
      id: j['id'] as String,
      childId: j['childId'] as String,
      createdBy: j['createdBy'] as String?,
      createdByUser: _userFromJson(j['createdByUser'] as Map<String, dynamic>?),
      therapistId: j['therapistId'] as String?,
      therapistUser: _userFromJson(j['therapistUser'] as Map<String, dynamic>?),
      updatedBy: j['updatedBy'] as String?,
      updatedByUser: _userFromJson(j['updatedByUser'] as Map<String, dynamic>?),
      sessionDate: DateTime.parse(j['sessionDate'] as String),
      durationMinutes: j['durationMinutes'] as int?,
      notesText: j['notesText'] as String?,
      structuredMetrics: (j['structuredMetrics'] as Map<String, dynamic>?) ?? {},
      createdAt: DateTime.parse(j['createdAt'] as String),
      updatedAt: DateTime.parse(j['updatedAt'] as String),
    );
  }

  Future<List<SessionCommentEntity>> listComments(String sessionId) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/sessions/$sessionId/comments');
      final list = data!['comments'] as List<dynamic>? ?? [];
      return list.map((c) {
        final m = c as Map<String, dynamic>;
        final u = m['user'] as Map<String, dynamic>?;
        return SessionCommentEntity(
          id: m['id'] as String,
          sessionId: m['sessionId'] as String,
          userId: m['userId'] as String,
          comment: m['comment'] as String,
          createdAt: DateTime.parse(m['createdAt'] as String),
          userFullName: u?['fullName'] as String?,
          userEmail: u?['email'] as String?,
        );
      }).toList();
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<SessionCommentEntity> addComment(String sessionId, String comment) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/sessions/$sessionId/comments', {'comment': comment});
      final m = data!['comment'] as Map<String, dynamic>;
      final u = m['user'] as Map<String, dynamic>?;
      return SessionCommentEntity(
        id: m['id'] as String,
        sessionId: m['sessionId'] as String,
        userId: m['userId'] as String,
        comment: m['comment'] as String,
        createdAt: DateTime.parse(m['createdAt'] as String),
        userFullName: u?['fullName'] as String?,
        userEmail: u?['email'] as String?,
      );
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  AppException _handle(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    if (code == 403) return AppException(msg, 403);
    return AppException(msg, code);
  }
}

class SessionsListResponse {
  SessionsListResponse({required this.sessions, required this.total});
  final List<SessionEntity> sessions;
  final int total;
}

class SessionCommentEntity {
  SessionCommentEntity({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.comment,
    required this.createdAt,
    this.userFullName,
    this.userEmail,
  });
  final String id;
  final String sessionId;
  final String userId;
  final String comment;
  final DateTime createdAt;
  final String? userFullName;
  final String? userEmail;
}
