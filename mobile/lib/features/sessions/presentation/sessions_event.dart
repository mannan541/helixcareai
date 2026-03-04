part of 'sessions_bloc.dart';

sealed class SessionsEvent extends Equatable {
  const SessionsEvent();
  @override
  List<Object?> get props => [];
}

final class SessionsLoadRequested extends SessionsEvent {
  final String childId;
  const SessionsLoadRequested(this.childId);
  @override
  List<Object?> get props => [childId];
}

final class SessionCreateRequested extends SessionsEvent {
  final String childId;
  final DateTime sessionDate;
  final int? durationMinutes;
  final String? notesText;
  final Map<String, dynamic>? structuredMetrics;
  const SessionCreateRequested({
    required this.childId,
    required this.sessionDate,
    this.durationMinutes,
    this.notesText,
    this.structuredMetrics,
  });
  @override
  List<Object?> get props => [childId, sessionDate, durationMinutes, notesText, structuredMetrics];
}

final class SessionUpdateRequested extends SessionsEvent {
  final String id;
  final DateTime? sessionDate;
  final int? durationMinutes;
  final String? notesText;
  final Map<String, dynamic>? structuredMetrics;
  const SessionUpdateRequested({
    required this.id,
    this.sessionDate,
    this.durationMinutes,
    this.notesText,
    this.structuredMetrics,
  });
  @override
  List<Object?> get props => [id, sessionDate, durationMinutes, notesText, structuredMetrics];
}

final class SessionDeleteRequested extends SessionsEvent {
  final String id;
  const SessionDeleteRequested(this.id);
  @override
  List<Object?> get props => [id];
}
