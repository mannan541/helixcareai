import 'package:equatable/equatable.dart';

class ChildEntity extends Equatable {
  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ChildEntity({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$firstName $lastName'.trim();

  @override
  List<Object?> get props => [id, userId, firstName, lastName, dateOfBirth, notes, diagnosis, referredBy, createdAt, updatedAt];
}
