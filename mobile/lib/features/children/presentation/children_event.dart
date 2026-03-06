part of 'children_bloc.dart';

sealed class ChildrenEvent extends Equatable {
  const ChildrenEvent();
  @override
  List<Object?> get props => [];
}

final class ChildrenLoadRequested extends ChildrenEvent {
  const ChildrenLoadRequested({this.loadMore = false});
  final bool loadMore;
  @override
  List<Object?> get props => [loadMore];
}

final class ChildrenCreateRequested extends ChildrenEvent {
  final String firstName;
  final String lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
  const ChildrenCreateRequested({
    required this.firstName,
    required this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
  });
  @override
  List<Object?> get props => [firstName, lastName, dateOfBirth, notes, diagnosis, referredBy];
}

final class ChildrenUpdateRequested extends ChildrenEvent {
  final String id;
  final String? firstName;
  final String? lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
  const ChildrenUpdateRequested({
    required this.id,
    this.firstName,
    this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
  });
  @override
  List<Object?> get props => [id, firstName, lastName, dateOfBirth, notes, diagnosis, referredBy];
}

final class ChildrenDeleteRequested extends ChildrenEvent {
  final String id;
  const ChildrenDeleteRequested(this.id);
  @override
  List<Object?> get props => [id];
}
