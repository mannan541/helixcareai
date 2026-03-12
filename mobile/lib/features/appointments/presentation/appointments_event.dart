part of 'appointments_bloc.dart';

abstract class AppointmentsEvent extends Equatable {
  const AppointmentsEvent();

  @override
  List<Object?> get props => [];
}

class AppointmentsListRequested extends AppointmentsEvent {
  final String? date;
  final String? therapistId;
  final String? childId;
  final String? status;

  const AppointmentsListRequested({this.date, this.therapistId, this.childId, this.status});

  @override
  List<Object?> get props => [date, therapistId, childId, status];
}

class AppointmentCreateRequested extends AppointmentsEvent {
  final String childId;
  final String therapistId;
  final DateTime date;
  final String startTime;
  final String endTime;

  const AppointmentCreateRequested({
    required this.childId,
    required this.therapistId,
    required this.date,
    required this.startTime,
    required this.endTime,
  });

  @override
  List<Object?> get props => [childId, therapistId, date, startTime, endTime];
}

class AppointmentUpdateRequested extends AppointmentsEvent {
  final String id;
  final String childId;
  final String therapistId;
  final DateTime date;
  final String startTime;
  final String endTime;

  const AppointmentUpdateRequested({
    required this.id,
    required this.childId,
    required this.therapistId,
    required this.date,
    required this.startTime,
    required this.endTime,
  });

  @override
  List<Object?> get props => [id, childId, therapistId, date, startTime, endTime];
}

class AppointmentStatusUpdateRequested extends AppointmentsEvent {
  final String id;
  final String status;

  const AppointmentStatusUpdateRequested({required this.id, required this.status});

  @override
  List<Object?> get props => [id, status];
}

class AppointmentApproveRequested extends AppointmentsEvent {
  final String id;

  const AppointmentApproveRequested({required this.id});

  @override
  List<Object?> get props => [id];
}

class AppointmentDeleteRequested extends AppointmentsEvent {
  final String id;

  const AppointmentDeleteRequested({required this.id});

  @override
  List<Object?> get props => [id];
}
