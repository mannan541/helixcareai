import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/session_entity.dart';

class SessionsRepository {
  final ApiClient _api;

  SessionsRepository(this._api);

  Future<List<SessionEntity>> listByChild(String childId) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/sessions/child/$childId');
      final list = data!['sessions'] as List<dynamic>? ?? [];
      return list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
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
    int? durationMinutes,
    String? notesText,
    Map<String, dynamic>? structuredMetrics,
  }) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/sessions', {
        'childId': childId,
        'sessionDate': sessionDate,
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
    String? sessionDate,
    int? durationMinutes,
    String? notesText,
    Map<String, dynamic>? structuredMetrics,
  }) async {
    try {
      final body = <String, dynamic>{};
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

  SessionEntity _fromJson(Map<String, dynamic> j) {
    return SessionEntity(
      id: j['id'] as String,
      childId: j['childId'] as String,
      createdBy: j['createdBy'] as String,
      sessionDate: DateTime.parse(j['sessionDate'] as String),
      durationMinutes: j['durationMinutes'] as int?,
      notesText: j['notesText'] as String?,
      structuredMetrics: (j['structuredMetrics'] as Map<String, dynamic>?) ?? {},
      createdAt: DateTime.parse(j['createdAt'] as String),
      updatedAt: DateTime.parse(j['updatedAt'] as String),
    );
  }

  AppException _handle(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    if (code == 403) return AppException(msg, 403);
    return AppException(msg, code);
  }
}
