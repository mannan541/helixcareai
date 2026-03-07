part of 'auth_bloc.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, failure, registrationPendingApproval }

class AuthState extends Equatable {
  final AuthStatus status;
  final UserEntity? user;
  final String? token;
  final String? errorMessage;

  const AuthState({
    required this.status,
    this.user,
    this.token,
    this.errorMessage,
  });

  const AuthState.initial()
      : status = AuthStatus.initial,
        user = null,
        token = null,
        errorMessage = null;

  const AuthState.loading()
      : status = AuthStatus.loading,
        user = null,
        token = null,
        errorMessage = null;

  AuthState.authenticated(UserEntity u, String t)
      : status = AuthStatus.authenticated,
        user = u,
        token = t,
        errorMessage = null;

  const AuthState.unauthenticated()
      : status = AuthStatus.unauthenticated,
        user = null,
        token = null,
        errorMessage = null;

  const AuthState.failure(String msg)
      : status = AuthStatus.failure,
        user = null,
        token = null,
        errorMessage = msg;

  AuthState.registrationPendingApproval(UserEntity u)
      : status = AuthStatus.registrationPendingApproval,
        user = u,
        token = null,
        errorMessage = null;

  @override
  List<Object?> get props => [status, user, token, errorMessage];
}
