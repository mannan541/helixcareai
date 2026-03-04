import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../domain/user_entity.dart';
import '../data/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _repo;

  AuthBloc(this._repo) : super(const AuthState.initial()) {
    on<AuthLoginRequested>(_onLogin);
    on<AuthRegisterRequested>(_onRegister);
    on<AuthCheckRequested>(_onCheck);
    on<AuthLogoutRequested>(_onLogout);
  }

  Future<void> _onLogin(AuthLoginRequested e, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());
    try {
      final result = await _repo.login(e.email, e.password);
      emit(AuthState.authenticated(result.user, result.token));
    } catch (err) {
      emit(AuthState.failure(err is Exception ? err.toString() : 'Login failed'));
    }
  }

  Future<void> _onRegister(AuthRegisterRequested e, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());
    try {
      final result = await _repo.register(e.email, e.password, e.fullName, e.role);
      emit(AuthState.authenticated(result.user, result.token));
    } catch (err) {
      emit(AuthState.failure(err is Exception ? err.toString() : 'Registration failed'));
    }
  }

  Future<void> _onCheck(AuthCheckRequested e, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());
    try {
      _repo.setToken(e.token);
      final user = await _repo.me();
      if (user != null) {
        emit(AuthState.authenticated(user, e.token));
      } else {
        emit(const AuthState.unauthenticated());
      }
    } catch (_) {
      emit(const AuthState.unauthenticated());
    }
  }

  void _onLogout(AuthLogoutRequested e, Emitter<AuthState> emit) {
    _repo.setToken(null);
    emit(const AuthState.unauthenticated());
  }
}
