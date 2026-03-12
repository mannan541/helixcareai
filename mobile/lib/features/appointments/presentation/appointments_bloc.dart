import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../domain/appointment_entity.dart';
import '../data/appointments_repository.dart';
import '../../../core/utils/date_format.dart';

part 'appointments_event.dart';
part 'appointments_state.dart';

class AppointmentsBloc extends Bloc<AppointmentsEvent, AppointmentsState> {
  final AppointmentsRepository _repo;

  AppointmentsBloc(this._repo) : super(AppointmentsState.initial()) {
    on<AppointmentsListRequested>(_onList);
    on<AppointmentCreateRequested>(_onCreate);
    on<AppointmentUpdateRequested>(_onUpdate);
    on<AppointmentStatusUpdateRequested>(_onUpdateStatus);
    on<AppointmentApproveRequested>(_onApprove);
    on<AppointmentDeleteRequested>(_onDelete);
  }

  Future<void> _onList(AppointmentsListRequested e, Emitter<AppointmentsState> emit) async {
    emit(AppointmentsState.loading());
    try {
      final list = await _repo.listAppointments(
        date: e.date,
        therapistId: e.therapistId,
        childId: e.childId,
        status: e.status,
      );
      emit(AppointmentsState.loaded(list));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }

  Future<void> _onCreate(AppointmentCreateRequested e, Emitter<AppointmentsState> emit) async {
    final prev = state.appointments;
    emit(AppointmentsState.loading());
    try {
      final appointment = await _repo.createAppointment(
        childId: e.childId,
        therapistId: e.therapistId,
        appointmentDate: formatAppDateOnlyForApi(e.date),
        startTime: e.startTime,
        endTime: e.endTime,
      );
      emit(AppointmentsState.loaded([...prev, appointment]));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }

  Future<void> _onUpdate(AppointmentUpdateRequested e, Emitter<AppointmentsState> emit) async {
    final prev = state.appointments;
    emit(AppointmentsState.loading());
    try {
      final appointment = await _repo.updateAppointmentDetails(
        id: e.id,
        therapistId: e.therapistId,
        appointmentDate: formatAppDateOnlyForApi(e.date),
        startTime: e.startTime,
        endTime: e.endTime,
      );
      // Replace the old appointment in the list if it exists
      final updatedList = prev.map((a) => a.id == appointment.id ? appointment : a).toList();
      emit(AppointmentsState.loaded(updatedList));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }

  Future<void> _onUpdateStatus(AppointmentStatusUpdateRequested e, Emitter<AppointmentsState> emit) async {
    final prev = state.appointments;
    emit(AppointmentsState.loading());
    try {
      final updated = await _repo.updateStatus(e.id, e.status);
      emit(AppointmentsState.loaded(prev.map((a) => a.id == updated.id ? updated : a).toList()));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }

  Future<void> _onApprove(AppointmentApproveRequested e, Emitter<AppointmentsState> emit) async {
    final prev = state.appointments;
    emit(AppointmentsState.loading());
    try {
      final updated = await _repo.approveAppointment(e.id);
      emit(AppointmentsState.loaded(prev.map((a) => a.id == updated.id ? updated : a).toList()));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }

  Future<void> _onDelete(AppointmentDeleteRequested e, Emitter<AppointmentsState> emit) async {
    final prev = state.appointments;
    emit(AppointmentsState.loading());
    try {
      await _repo.deleteAppointment(e.id);
      emit(AppointmentsState.loaded(prev.where((a) => a.id != e.id).toList()));
    } catch (err) {
      emit(AppointmentsState.failure(err.toString()));
    }
  }
}
