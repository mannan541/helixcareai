part of 'sessions_bloc.dart';

class SessionsState extends Equatable {
  final bool isLoading;
  final List<SessionEntity> sessions;
  final String? error;

  const SessionsState({
    required this.isLoading,
    required this.sessions,
    this.error,
  });

  const SessionsState.initial()
      : isLoading = false,
        sessions = const [],
        error = null;

  const SessionsState.loading()
      : isLoading = true,
        sessions = const [],
        error = null;

  SessionsState.loaded(List<SessionEntity> list)
      : isLoading = false,
        sessions = list,
        error = null;

  SessionsState.failure(String msg)
      : isLoading = false,
        sessions = const [],
        error = msg;

  @override
  List<Object?> get props => [isLoading, sessions, error];
}
