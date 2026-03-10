import '../../../core/network/api_client.dart';
import '../domain/appointment_entity.dart';
import '../domain/clinic_slot_entity.dart';
import './appointment_model.dart';

ClinicSlotEntity _slotFromJson(Map<String, dynamic> j) {
  return ClinicSlotEntity(
    id: j['id'],
    label: j['label'],
    startTime: j['start_time'],
    endTime: j['end_time'],
    slotType: j['slot_type'] == 'blocked' ? ClinicSlotType.blocked : ClinicSlotType.available,
    dayOfWeek: (j['day_of_week'] as List?)?.cast<int>(),
    isActive: j['is_active'] ?? true,
    createdAt: DateTime.parse(j['created_at']),
    updatedAt: DateTime.parse(j['updated_at']),
  );
}

class AppointmentsRepository {
  final ApiClient apiClient;

  AppointmentsRepository(this.apiClient);

  Future<AppointmentEntity> createAppointment({
    required String childId,
    required String therapistId,
    required String appointmentDate,
    required String startTime,
    required String endTime,
  }) async {
    final res = await apiClient.post('/api/appointments', {
      'childId': childId,
      'therapistId': therapistId,
      'appointmentDate': appointmentDate,
      'startTime': startTime,
      'endTime': endTime,
    });
    return AppointmentModel.fromJson(res['appointment']);
  }

  Future<List<AppointmentEntity>> listAppointments({
    String? date,
    String? therapistId,
    String? childId,
    String? status,
  }) async {
    final query = <String, String>{};
    if (date != null) query['date'] = date;
    if (therapistId != null) query['therapistId'] = therapistId;
    if (childId != null) query['childId'] = childId;
    if (status != null) query['status'] = status;

    final res = await apiClient.get('/api/appointments', queryParameters: query);
    final list = res['appointments'] as List;
    return list.map((e) => AppointmentModel.fromJson(e)).toList();
  }

  Future<List<Map<String, dynamic>>> getBookedSlots({
    required String therapistId,
    required String date,
  }) async {
    final res = await apiClient.get('/api/appointments/slots', queryParameters: {
      'therapistId': therapistId,
      'date': date,
    });
    return (res['slots'] as List).cast<Map<String, dynamic>>();
  }

  Future<AppointmentEntity> updateStatus(String id, String status) async {
    final res = await apiClient.patch('/api/appointments/$id/status', {'status': status});
    return AppointmentModel.fromJson(res['appointment']);
  }

  Future<AppointmentEntity> updateAppointmentDetails({
    required String id,
    required String appointmentDate,
    required String startTime,
    required String endTime,
    required String therapistId,
  }) async {
    final res = await apiClient.put('/api/appointments/$id', {
      'appointmentDate': appointmentDate,
      'startTime': startTime,
      'endTime': endTime,
      'therapistId': therapistId,
    });
    return AppointmentModel.fromJson(res['appointment']);
  }

  Future<AppointmentEntity> approveAppointment(String id) async {
    final res = await apiClient.put('/api/appointments/$id/approve');
    return AppointmentModel.fromJson(res['appointment']);
  }

  // ── Clinic Slot Management ──────────────────────────────────────────
  Future<List<ClinicSlotEntity>> listClinicSlots({int? dayOfWeek}) async {
    final params = dayOfWeek != null ? {'day': '$dayOfWeek'} : <String, String>{};
    final res = await apiClient.get('/api/appointments/clinic-slots', queryParameters: params.isEmpty ? null : params);
    return (res['slots'] as List).map((e) => _slotFromJson(e)).toList();
  }

  Future<ClinicSlotEntity> createClinicSlot({
    required String label,
    required String startTime,
    required String endTime,
    String slotType = 'available',
    List<int>? dayOfWeek,
  }) async {
    final res = await apiClient.post('/api/appointments/clinic-slots', {
      'label': label,
      'startTime': startTime,
      'endTime': endTime,
      'slotType': slotType,
      if (dayOfWeek != null) 'dayOfWeek': dayOfWeek,
    });
    return _slotFromJson(res['slot']);
  }

  Future<ClinicSlotEntity> updateClinicSlot(String id, {
    String? label,
    String? startTime,
    String? endTime,
    String? slotType,
    List<int>? dayOfWeek,
    bool? isActive,
  }) async {
    final body = <String, dynamic>{};
    if (label != null) body['label'] = label;
    if (startTime != null) body['startTime'] = startTime;
    if (endTime != null) body['endTime'] = endTime;
    if (slotType != null) body['slotType'] = slotType;
    if (dayOfWeek != null) body['dayOfWeek'] = dayOfWeek;
    if (isActive != null) body['isActive'] = isActive;
    final res = await apiClient.put('/api/appointments/clinic-slots/$id', body);
    return _slotFromJson(res['slot']);
  }

  Future<void> deleteClinicSlot(String id) async {
    await apiClient.delete('/api/appointments/clinic-slots/$id');
  }
}
