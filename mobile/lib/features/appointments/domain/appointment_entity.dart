import 'package:equatable/equatable.dart';
import '../../sessions/domain/session_entity.dart';

enum AppointmentStatus { pending, approved, completed, cancelled }

class AppointmentEntity extends Equatable {
  final String id;
  final String childId;
  final String? childFirstName;
  final String? childLastName;
  final String therapistId;
  final SessionUserInfo? therapistUser;
  final DateTime appointmentDate;
  final String startTime;
  final String endTime;
  final AppointmentStatus status;
  final String? createdBy;
  final String? approvedBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? sessionId;
  final String? sessionLoggedByName;

  const AppointmentEntity({
    required this.id,
    required this.childId,
    this.childFirstName,
    this.childLastName,
    required this.therapistId,
    this.therapistUser,
    required this.appointmentDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.createdBy,
    this.approvedBy,
    required this.createdAt,
    required this.updatedAt,
    this.sessionId,
    this.sessionLoggedByName,
  });

  String get childFullName => '$childFirstName $childLastName'.trim();

  @override
  List<Object?> get props => [
        id,
        childId,
        childFirstName,
        childLastName,
        therapistId,
        therapistUser,
        appointmentDate,
        startTime,
        endTime,
        status,
        createdBy,
        approvedBy,
        createdAt,
        updatedAt,
        sessionId,
        sessionLoggedByName,
      ];
}
