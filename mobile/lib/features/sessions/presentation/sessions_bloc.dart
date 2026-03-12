import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../domain/session_entity.dart';
import '../data/sessions_repository.dart';

part 'sessions_event.dart';
part 'sessions_state.dart';

class SessionsBloc extends Bloc<SessionsEvent, SessionsState> {
  final SessionsRepository _repo;

  SessionsBloc(this._repo) : super(const SessionsState.initial()) {
    on<SessionsLoadRequested>(_onLoad);
    on<SessionCreateRequested>(_onCreate);
    on<SessionUpdateRequested>(_onUpdate);
    on<SessionDeleteRequested>(_onDelete);
  }

  static const int _pageSize = 20;

  Future<void> _onLoad(SessionsLoadRequested e, Emitter<SessionsState> emit) async {
    if (e.loadMore) {
      final current = state;
      if (current.isLoadingMore || !current.hasMore || current.sessions.isEmpty) return;
      emit(SessionsState.loadingMore(current.sessions, total: current.total));
      try {
        final res = await _repo.listByChild(e.childId, limit: _pageSize, offset: current.sessions.length);
        emit(SessionsState.loaded([...current.sessions, ...res.sessions], total: res.total));
      } catch (err) {
        emit(SessionsState.failure(err is Exception ? err.toString() : 'Failed to load more'));
      }
      return;
    }
    emit(const SessionsState.loading());
    try {
      final res = await _repo.listByChild(e.childId, limit: _pageSize, offset: 0);
      emit(SessionsState.loaded(res.sessions, total: res.total));
    } catch (err) {
      emit(SessionsState.failure(err is Exception ? err.toString() : 'Failed to load sessions'));
    }
  }

  Future<void> _onCreate(SessionCreateRequested e, Emitter<SessionsState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.sessions;
    emit(const SessionsState.loading());
    try {
      final session = await _repo.create(
        childId: e.childId,
        sessionDate: e.sessionDate.toIso8601String().split('T').first,
        therapistId: e.therapistId,
        durationMinutes: e.durationMinutes,
        notesText: e.notesText,
        structuredMetrics: e.structuredMetrics,
        appointmentId: e.appointmentId,
      );
      emit(SessionsState.loaded([session, ...previousList], total: current.total + 1));
    } catch (err) {
      emit(SessionsState.failure(err is Exception ? err.toString() : 'Create failed'));
    }
  }

  Future<void> _onUpdate(SessionUpdateRequested e, Emitter<SessionsState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.sessions;
    emit(const SessionsState.loading());
    try {
      final updated = await _repo.update(e.id,
          therapistId: e.therapistId,
          sessionDate: e.sessionDate?.toIso8601String().split('T').first,
          durationMinutes: e.durationMinutes,
          notesText: e.notesText,
          structuredMetrics: e.structuredMetrics);
      final list = previousList.map((s) => s.id == updated.id ? updated : s).toList();
      emit(SessionsState.loaded(list, total: current.total));
    } catch (err) {
      emit(SessionsState.failure(err is Exception ? err.toString() : 'Update failed'));
    }
  }

  Future<void> _onDelete(SessionDeleteRequested e, Emitter<SessionsState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.sessions;
    emit(const SessionsState.loading());
    try {
      await _repo.delete(e.id);
      emit(SessionsState.loaded(previousList.where((s) => s.id != e.id).toList(), total: current.total - 1));
    } catch (err) {
      emit(SessionsState.failure(err is Exception ? err.toString() : 'Delete failed'));
    }
  }
}
