part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

final class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;
  const AuthLoginRequested(this.email, this.password);
  @override
  List<Object?> get props => [email, password];
}

final class AuthRegisterRequested extends AuthEvent {
  final String email;
  final String password;
  final String fullName;
  final String role;
  const AuthRegisterRequested(this.email, this.password, this.fullName, this.role);
  @override
  List<Object?> get props => [email, password, fullName, role];
}

final class AuthCheckRequested extends AuthEvent {
  final String token;
  const AuthCheckRequested(this.token);
  @override
  List<Object?> get props => [token];
}

final class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}
