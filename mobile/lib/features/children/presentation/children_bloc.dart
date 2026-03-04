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

  Future<void> _onLoad(ChildrenLoadRequested e, Emitter<ChildrenState> emit) async {
    emit(const ChildrenState.loading());
    try {
      final list = await _repo.list();
      emit(ChildrenState.loaded(list));
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
      );
      emit(ChildrenState.loaded([...previousList, child]));
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
          firstName: e.firstName, lastName: e.lastName, dateOfBirth: e.dateOfBirth, notes: e.notes);
      final list = previousList.map((c) => c.id == updated.id ? updated : c).toList();
      emit(ChildrenState.loaded(list));
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
      emit(ChildrenState.loaded(previousList.where((c) => c.id != e.id).toList()));
    } catch (err) {
      emit(ChildrenState.failure(err is Exception ? err.toString() : 'Delete failed'));
    }
  }
}
