import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String role;

  const UserEntity({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
  });

  bool get isAdmin => role == 'admin';
  bool get isTherapist => role == 'therapist';
  bool get isParent => role == 'parent';

  @override
  List<Object?> get props => [id, email, fullName, role];
}
