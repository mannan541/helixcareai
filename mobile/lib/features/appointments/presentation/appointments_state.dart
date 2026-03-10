part of 'appointments_bloc.dart';

class AppointmentsState extends Equatable {
  final List<AppointmentEntity> appointments;
  final bool isLoading;
  final String? error;

  const AppointmentsState({
    this.appointments = const [],
    this.isLoading = false,
    this.error,
  });

  factory AppointmentsState.initial() => const AppointmentsState();
  factory AppointmentsState.loading() => const AppointmentsState(isLoading: true);
  factory AppointmentsState.loaded(List<AppointmentEntity> appointments) =>
      AppointmentsState(appointments: appointments);
  factory AppointmentsState.failure(String error) => AppointmentsState(error: error);

  @override
  List<Object?> get props => [appointments, isLoading, error];
}
