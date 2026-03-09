import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../domain/appointment_entity.dart';
import '../data/appointments_repository.dart';

part 'appointments_event.dart';
part 'appointments_state.dart';

class AppointmentsBloc extends Bloc<AppointmentsEvent, AppointmentsState> {
  final AppointmentsRepository _repo;

  AppointmentsBloc(this._repo) : super(AppointmentsState.initial()) {
    on<AppointmentsListRequested>(_onList);
    on<AppointmentCreateRequested>(_onCreate);
    on<AppointmentStatusUpdateRequested>(_onUpdateStatus);
    on<AppointmentApproveRequested>(_onApprove);
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
        appointmentDate: e.date.toIso8601String().split('T').first,
        startTime: e.startTime,
        endTime: e.endTime,
      );
      emit(AppointmentsState.loaded([...prev, appointment]));
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
}
