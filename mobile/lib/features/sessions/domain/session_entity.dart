import 'package:equatable/equatable.dart';

class SessionEntity extends Equatable {
  final String id;
  final String childId;
  final String createdBy;
  final DateTime sessionDate;
  final int? durationMinutes;
  final String? notesText;
  final Map<String, dynamic> structuredMetrics;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SessionEntity({
    required this.id,
    required this.childId,
    required this.createdBy,
    required this.sessionDate,
    this.durationMinutes,
    this.notesText,
    required this.structuredMetrics,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [id, childId, createdBy, sessionDate, durationMinutes, notesText, structuredMetrics, createdAt, updatedAt];
}
