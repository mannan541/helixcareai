part of 'children_bloc.dart';

class ChildrenState extends Equatable {
  final bool isLoading;
  final bool isLoadingMore;
  final List<ChildEntity> children;
  final int total;
  final String? error;
  final String? search;

  const ChildrenState({
    required this.isLoading,
    this.isLoadingMore = false,
    required this.children,
    this.total = 0,
    this.error,
    this.search,
  });

  const ChildrenState.initial()
      : isLoading = false,
        isLoadingMore = false,
        children = const [],
        total = 0,
        error = null,
        search = null;

  const ChildrenState.loading()
      : isLoading = true,
        isLoadingMore = false,
        children = const [],
        total = 0,
        error = null,
        search = null;

  ChildrenState.loaded(List<ChildEntity> list, {this.total = 0, this.search})
      : isLoading = false,
        isLoadingMore = false,
        children = list,
        error = null;

  ChildrenState.loadingMore(List<ChildEntity> list, {this.total = 0, this.search})
      : isLoading = false,
        isLoadingMore = true,
        children = list,
        error = null;

  ChildrenState.failure(String msg)
      : isLoading = false,
        isLoadingMore = false,
        children = const [],
        total = 0,
        error = msg,
        search = null;

  bool get hasMore => children.length < total;

  @override
  List<Object?> get props => [isLoading, isLoadingMore, children, total, error, search];
}
