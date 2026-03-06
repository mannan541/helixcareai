import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../domain/child_entity.dart';
import '../data/children_repository.dart';

part 'children_event.dart';
part 'children_state.dart';

class ChildrenBloc extends Bloc<ChildrenEvent, ChildrenState> {
  final ChildrenRepository _repo;

  ChildrenBloc(this._repo) : super(const ChildrenState.initial()) {
    on<ChildrenLoadRequested>(_onLoad);
    on<ChildrenCreateRequested>(_onCreate);
    on<ChildrenUpdateRequested>(_onUpdate);
    on<ChildrenDeleteRequested>(_onDelete);
  }

  static const int _pageSize = 20;

  Future<void> _onLoad(ChildrenLoadRequested e, Emitter<ChildrenState> emit) async {
    if (e.loadMore) {
      final current = state;
      if (current.isLoadingMore || !current.hasMore || current.children.isEmpty) return;
      emit(ChildrenState.loadingMore(current.children, total: current.total));
      try {
        final res = await _repo.list(limit: _pageSize, offset: current.children.length);
        emit(ChildrenState.loaded([...current.children, ...res.children], total: res.total));
      } catch (err) {
        emit(ChildrenState.failure(err is Exception ? err.toString() : 'Failed to load more'));
      }
      return;
    }
    emit(const ChildrenState.loading());
    try {
      final res = await _repo.list(limit: _pageSize, offset: 0);
      emit(ChildrenState.loaded(res.children, total: res.total));
    } catch (err) {
      emit(ChildrenState.failure(err is Exception ? err.toString() : 'Failed to load'));
    }
  }

  Future<void> _onCreate(ChildrenCreateRequested e, Emitter<ChildrenState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.children;
    emit(ChildrenState.loading());
    try {
      final child = await _repo.create(
        firstName: e.firstName,
        lastName: e.lastName,
        dateOfBirth: e.dateOfBirth,
        notes: e.notes,
        diagnosis: e.diagnosis,
        referredBy: e.referredBy,
      );
      emit(ChildrenState.loaded([...previousList, child], total: current.total + 1));
    } catch (err) {
      emit(ChildrenState.failure(err is Exception ? err.toString() : 'Create failed'));
    }
  }

  Future<void> _onUpdate(ChildrenUpdateRequested e, Emitter<ChildrenState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.children;
    emit(ChildrenState.loading());
    try {
      final updated = await _repo.update(e.id,
          firstName: e.firstName, lastName: e.lastName, dateOfBirth: e.dateOfBirth, notes: e.notes,
          diagnosis: e.diagnosis, referredBy: e.referredBy);
      final list = previousList.map((c) => c.id == updated.id ? updated : c).toList();
      emit(ChildrenState.loaded(list, total: current.total));
    } catch (err) {
      emit(ChildrenState.failure(err is Exception ? err.toString() : 'Update failed'));
    }
  }

  Future<void> _onDelete(ChildrenDeleteRequested e, Emitter<ChildrenState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    final previousList = current.children;
    emit(ChildrenState.loading());
    try {
      await _repo.delete(e.id);
      emit(ChildrenState.loaded(previousList.where((c) => c.id != e.id).toList(), total: current.total - 1));
    } catch (err) {
      emit(ChildrenState.failure(err is Exception ? err.toString() : 'Delete failed'));
    }
  }
}
