part of 'sessions_bloc.dart';

class SessionsState extends Equatable {
  final bool isLoading;
  final bool isLoadingMore;
  final List<SessionEntity> sessions;
  final int total;
  final String? error;

  const SessionsState({
    required this.isLoading,
    this.isLoadingMore = false,
    required this.sessions,
    this.total = 0,
    this.error,
  });

  const SessionsState.initial()
      : isLoading = false,
        isLoadingMore = false,
        sessions = const [],
        total = 0,
        error = null;

  const SessionsState.loading()
      : isLoading = true,
        isLoadingMore = false,
        sessions = const [],
        total = 0,
        error = null;

  SessionsState.loaded(List<SessionEntity> list, {this.total = 0})
      : isLoading = false,
        isLoadingMore = false,
        sessions = list,
        error = null;

  SessionsState.loadingMore(List<SessionEntity> list, {this.total = 0})
      : isLoading = false,
        isLoadingMore = true,
        sessions = list,
        error = null;

  SessionsState.failure(String msg)
      : isLoading = false,
        isLoadingMore = false,
        sessions = const [],
        total = 0,
        error = msg;

  bool get hasMore => sessions.length < total;

  @override
  List<Object?> get props => [isLoading, isLoadingMore, sessions, total, error];
}
