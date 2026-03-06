import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/child_entity.dart';

class ChildrenRepository {
  final ApiClient _api;

  ChildrenRepository(this._api);

  Future<ChildrenListResponse> list({int limit = 20, int offset = 0}) async {
    try {
      final data = await _api.get<Map<String, dynamic>>(
        '/api/children',
        queryParameters: {'limit': limit, 'offset': offset},
      );
      final list = data!['children'] as List<dynamic>? ?? [];
      final total = data['total'] as int? ?? list.length;
      final children = list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
      return ChildrenListResponse(children: children, total: total);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> getOne(String id) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/children/$id');
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> create({
    required String firstName,
    required String lastName,
    String? dateOfBirth,
    String? notes,
    String? diagnosis,
    String? referredBy,
  }) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/children', {
        'firstName': firstName,
        'lastName': lastName,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
        if (notes != null) 'notes': notes,
        if (diagnosis != null) 'diagnosis': diagnosis,
        if (referredBy != null) 'referredBy': referredBy,
      });
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> update(
    String id, {
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? notes,
    String? diagnosis,
    String? referredBy,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (firstName != null) body['firstName'] = firstName;
      if (lastName != null) body['lastName'] = lastName;
      if (dateOfBirth != null) body['dateOfBirth'] = dateOfBirth;
      if (notes != null) body['notes'] = notes;
      if (diagnosis != null) body['diagnosis'] = diagnosis;
      if (referredBy != null) body['referredBy'] = referredBy;
      final data = await _api.patch<Map<String, dynamic>>('/api/children/$id', body);
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.delete('/api/children/$id');
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  ChildEntity _fromJson(Map<String, dynamic> j) {
    return ChildEntity(
      id: j['id'] as String,
      userId: j['userId'] as String,
      firstName: j['firstName'] as String,
      lastName: j['lastName'] as String,
      dateOfBirth: j['dateOfBirth'] as String?,
      notes: j['notes'] as String?,
      diagnosis: j['diagnosis'] as String?,
      referredBy: j['referredBy'] as String?,
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

class ChildrenListResponse {
  ChildrenListResponse({required this.children, required this.total});
  final List<ChildEntity> children;
  final int total;
}
