import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? title;
  /// Assigned child IDs (for parent role); only set when loaded via admin getUser.
  final List<String>? childIds;
  /// When null, user is pending approval (admin list/detail only).
  final DateTime? approvedAt;
  /// When non-null, user is disabled and cannot sign in (admin list/detail only).
  final DateTime? disabledAt;
  /// When non-null, user is soft-deleted (admin archived list only).
  final DateTime? deletedAt;
  /// Optional mobile number on profile.
  final String? mobileNumber;
  /// Therapist only: when true, parents can see this therapist's mobile number on sessions.
  final bool? showMobileToParents;

  const UserEntity({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.title,
    this.childIds,
    this.approvedAt,
    this.disabledAt,
    this.deletedAt,
    this.mobileNumber,
    this.showMobileToParents,
  });

  bool get isAdmin => role == 'admin';
  bool get isTherapist => role == 'therapist';
  bool get isParent => role == 'parent';
  /// True when approvedAt is set (admin-created or approved signup). Admin list/detail only.
  bool get isApproved => approvedAt != null;
  /// True when disabled (admin list/detail only).
  bool get isDisabled => disabledAt != null;
  /// True when soft-deleted (admin archived list only).
  bool get isDeleted => deletedAt != null;

  @override
  List<Object?> get props => [id, email, fullName, role, title, childIds, approvedAt, disabledAt, deletedAt, mobileNumber, showMobileToParents];
}
