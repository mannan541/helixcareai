import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';

class ChildReportData {
  ChildReportData({
    required this.child,
    required this.period,
    required this.attendance,
    required this.performance,
    required this.progress,
    required this.sessions,
    required this.appointments,
  });

  final ReportChild child;
  final ReportPeriod period;
  final ReportAttendance attendance;
  final ReportPerformance performance;
  final ReportProgress progress;
  final List<ReportSession> sessions;
  final List<ReportAppointment> appointments;

  factory ChildReportData.fromJson(Map<String, dynamic> json) {
    final r = json['report'] as Map<String, dynamic>;
    return ChildReportData(
      child: ReportChild.fromJson(r['child'] as Map<String, dynamic>),
      period: ReportPeriod.fromJson(r['period'] as Map<String, dynamic>),
      attendance: ReportAttendance.fromJson(r['attendance'] as Map<String, dynamic>),
      performance: ReportPerformance.fromJson(r['performance'] as Map<String, dynamic>),
      progress: ReportProgress.fromJson(r['progress'] as Map<String, dynamic>),
      sessions: (r['sessions'] as List<dynamic>? ?? [])
          .map((e) => ReportSession.fromJson(e as Map<String, dynamic>))
          .toList(),
      appointments: (r['appointments'] as List<dynamic>? ?? [])
          .map((e) => ReportAppointment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ReportChild {
  ReportChild({
    required this.fullName,
    this.childCode,
    this.diagnosis,
    this.therapyStatus,
    required this.scores,
  });

  final String fullName;
  final String? childCode;
  final String? diagnosis;
  final String? therapyStatus;
  final Map<String, num?> scores;

  factory ReportChild.fromJson(Map<String, dynamic> j) => ReportChild(
        fullName: j['fullName'] as String? ?? '',
        childCode: j['childCode'] as String?,
        diagnosis: j['diagnosis'] as String?,
        therapyStatus: j['therapyStatus'] as String?,
        scores: (j['scores'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, v == null ? null : (v as num))),
      );
}

class ReportPeriod {
  ReportPeriod({required this.from, required this.to});
  final String from;
  final String to;

  factory ReportPeriod.fromJson(Map<String, dynamic> j) => ReportPeriod(
        from: j['from'] as String,
        to: j['to'] as String,
      );
}

class ReportAttendance {
  ReportAttendance({
    required this.scheduled,
    required this.completed,
    required this.cancelled,
    required this.missed,
    this.attendanceRate,
  });

  final int scheduled;
  final int completed;
  final int cancelled;
  final int missed;
  final num? attendanceRate;

  factory ReportAttendance.fromJson(Map<String, dynamic> j) => ReportAttendance(
        scheduled: j['scheduled'] as int? ?? 0,
        completed: j['completed'] as int? ?? 0,
        cancelled: j['cancelled'] as int? ?? 0,
        missed: j['missed'] as int? ?? 0,
        attendanceRate: j['attendanceRate'] as num?,
      );
}

class ReportPerformance {
  ReportPerformance({
    required this.totalSessions,
    required this.totalMinutes,
    this.avgEngagement,
    this.avgFocus,
    this.avgCommunication,
    required this.trend,
  });

  final int totalSessions;
  final int totalMinutes;
  final num? avgEngagement;
  final num? avgFocus;
  final num? avgCommunication;
  final Map<String, num?> trend;

  factory ReportPerformance.fromJson(Map<String, dynamic> j) => ReportPerformance(
        totalSessions: j['totalSessions'] as int? ?? 0,
        totalMinutes: j['totalMinutes'] as int? ?? 0,
        avgEngagement: j['avgEngagement'] as num?,
        avgFocus: j['avgFocus'] as num?,
        avgCommunication: j['avgCommunication'] as num?,
        trend: (j['trend'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, v == null ? null : (v as num))),
      );
}

class ReportProgress {
  ReportProgress({required this.snapshots});
  final List<Map<String, dynamic>> snapshots;

  factory ReportProgress.fromJson(Map<String, dynamic> j) => ReportProgress(
        snapshots: (j['snapshots'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
      );
}

class ReportSession {
  ReportSession({
    required this.id,
    required this.date,
    this.durationMinutes,
    this.therapyTitle,
    this.engagement,
    this.focus,
    this.communication,
    this.notesPreview,
  });

  final String id;
  final String date;
  final int? durationMinutes;
  final String? therapyTitle;
  final num? engagement;
  final num? focus;
  final num? communication;
  final String? notesPreview;

  factory ReportSession.fromJson(Map<String, dynamic> j) => ReportSession(
        id: j['id'] as String,
        date: j['date'] as String,
        durationMinutes: j['durationMinutes'] as int?,
        therapyTitle: j['therapyTitle'] as String?,
        engagement: j['engagement'] as num?,
        focus: j['focus'] as num?,
        communication: j['communication'] as num?,
        notesPreview: j['notesPreview'] as String?,
      );
}

class ReportAppointment {
  ReportAppointment({
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.therapistName,
    required this.hasSession,
  });

  final String date;
  final String startTime;
  final String endTime;
  final String status;
  final String? therapistName;
  final bool hasSession;

  factory ReportAppointment.fromJson(Map<String, dynamic> j) => ReportAppointment(
        date: j['date'] as String,
        startTime: j['startTime'] as String,
        endTime: j['endTime'] as String,
        status: j['status'] as String? ?? '',
        therapistName: j['therapistName'] as String?,
        hasSession: j['hasSession'] as bool? ?? false,
      );
}

class ReportsRepository {
  final ApiClient _api;

  ReportsRepository(this._api);

  Future<ChildReportData> getChildReport({
    required String childId,
    required String from,
    required String to,
  }) async {
    try {
      final data = await _api.get<Map<String, dynamic>>(
        '/api/reports/child/$childId',
        queryParameters: {'from': from, 'to': to, 'format': 'json'},
      );
      return ChildReportData.fromJson(data);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<String> getChildReportCsv({
    required String childId,
    required String from,
    required String to,
  }) async {
    try {
      return await _api.getPlain(
        '/api/reports/child/$childId',
        queryParameters: {'from': from, 'to': to, 'format': 'csv'},
      );
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  AppException _handle(DioException e) {
    final isConnectionError = e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.unknown && e.message?.contains('XMLHttpRequest') == true;
    final msg = (e.response?.data is Map
            ? (e.response?.data as Map<String, dynamic>)['error'] as String?
            : null) ??
        (isConnectionError
            ? 'Cannot reach the API. Is the backend running at the configured URL?'
            : null) ??
        e.message ??
        'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    return AppException(msg, code);
  }
}
