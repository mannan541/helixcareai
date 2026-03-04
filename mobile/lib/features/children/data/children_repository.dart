import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/child_entity.dart';

class ChildrenRepository {
  final ApiClient _api;

  ChildrenRepository(this._api);

  Future<List<ChildEntity>> list() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/children');
      final list = data!['children'] as List<dynamic>? ?? [];
      return list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
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
  }) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/children', {
        'firstName': firstName,
        'lastName': lastName,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
        if (notes != null) 'notes': notes,
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
  }) async {
    try {
      final body = <String, dynamic>{};
      if (firstName != null) body['firstName'] = firstName;
      if (lastName != null) body['lastName'] = lastName;
      if (dateOfBirth != null) body['dateOfBirth'] = dateOfBirth;
      if (notes != null) body['notes'] = notes;
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
