import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';

class SessionMetricItem {
  final String id;
  final String sessionDate;
  final int? durationMinutes;
  final Map<String, dynamic> structuredMetrics;

  SessionMetricItem({
    required this.id,
    required this.sessionDate,
    this.durationMinutes,
    required this.structuredMetrics,
  });
}

class AnalyticsRepository {
  final ApiClient _api;

  AnalyticsRepository(this._api);

  Future<List<SessionMetricItem>> getChildMetrics(String childId) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/analytics/child/$childId');
      final list = data!['sessions'] as List<dynamic>? ?? [];
      return list.map((e) {
        final m = e as Map<String, dynamic>;
        return SessionMetricItem(
          id: m['id'] as String,
          sessionDate: m['sessionDate'] as String,
          durationMinutes: m['durationMinutes'] as int?,
          structuredMetrics: (m['structuredMetrics'] as Map<String, dynamic>?) ?? {},
        );
      }).toList();
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  AppException _handle(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    return AppException(msg, code);
  }
}
