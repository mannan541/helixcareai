import 'package:equatable/equatable.dart';

/// User info returned with a session (from created_by / therapist_id / updated_by joins).
class SessionUserInfo extends Equatable {
  final String id;
  final String fullName;
  final String email;
  final String? title;
  /// Therapist only; present when therapist allows visibility to parents.
  final String? mobileNumber;

  const SessionUserInfo({
    required this.id,
    required this.fullName,
    required this.email,
    this.title,
    this.mobileNumber,
  });

  @override
  List<Object?> get props => [id, fullName, email, title, mobileNumber];
}

/// Alias for backward compatibility.
typedef SessionCreatedByUser = SessionUserInfo;

class SessionEntity extends Equatable {
  final String id;
  final String childId;
  final String? createdBy;
  final SessionUserInfo? createdByUser;
  final String? therapistId;
  final SessionUserInfo? therapistUser;
  final String? updatedBy;
  final SessionUserInfo? updatedByUser;
  final DateTime sessionDate;
  final int? durationMinutes;
  final String? notesText;
  final Map<String, dynamic> structuredMetrics;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SessionEntity({
    required this.id,
    required this.childId,
    this.createdBy,
    this.createdByUser,
    this.therapistId,
    this.therapistUser,
    this.updatedBy,
    this.updatedByUser,
    required this.sessionDate,
    this.durationMinutes,
    this.notesText,
    required this.structuredMetrics,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [id, childId, createdBy, createdByUser, therapistId, therapistUser, updatedBy, updatedByUser, sessionDate, durationMinutes, notesText, structuredMetrics, createdAt, updatedAt];
}
