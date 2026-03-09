import '../domain/appointment_entity.dart';
import '../../sessions/domain/session_entity.dart';

class AppointmentModel extends AppointmentEntity {
  const AppointmentModel({
    required super.id,
    required super.childId,
    super.childFirstName,
    super.childLastName,
    required super.therapistId,
    super.therapistUser,
    required super.appointmentDate,
    required super.startTime,
    required super.endTime,
    required super.status,
    super.createdBy,
    super.approvedBy,
    required super.createdAt,
    required super.updatedAt,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'],
      childId: json['child_id'],
      childFirstName: json['_child_first_name'],
      childLastName: json['_child_last_name'],
      therapistId: json['therapist_id'],
      therapistUser: json['_therapist_full_name'] != null
          ? SessionUserInfo(
              id: json['therapist_id'],
              fullName: json['_therapist_full_name'],
              email: json['_therapist_email'] ?? '',
            )
          : null,
      appointmentDate: DateTime.parse(json['appointment_date']),
      startTime: json['start_time'],
      endTime: json['end_time'],
      status: AppointmentStatus.values.byName(json['status']),
      createdBy: json['created_by'],
      approvedBy: json['approved_by'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}
