part of 'children_bloc.dart';

class ChildrenState extends Equatable {
  final bool isLoading;
  final List<ChildEntity> children;
  final String? error;

  const ChildrenState({
    required this.isLoading,
    required this.children,
    this.error,
  });

  const ChildrenState.initial()
      : isLoading = false,
        children = const [],
        error = null;

  const ChildrenState.loading()
      : isLoading = true,
        children = const [],
        error = null;

  ChildrenState.loaded(List<ChildEntity> list)
      : isLoading = false,
        children = list,
        error = null;

  ChildrenState.failure(String msg)
      : isLoading = false,
        children = const [],
        error = msg;

  @override
  List<Object?> get props => [isLoading, children, error];
}
