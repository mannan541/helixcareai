import 'package:equatable/equatable.dart';

enum ClinicSlotType { available, blocked }

class ClinicSlotEntity extends Equatable {
  final String id;
  final String label;
  final String startTime; // "09:00:00"
  final String endTime;   // "09:45:00"
  final ClinicSlotType slotType;
  final List<int>? dayOfWeek; // null = every day
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClinicSlotEntity({
    required this.id,
    required this.label,
    required this.startTime,
    required this.endTime,
    required this.slotType,
    this.dayOfWeek,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isBlocked => slotType == ClinicSlotType.blocked;

  @override
  List<Object?> get props => [id, label, startTime, endTime, slotType, dayOfWeek, isActive, createdAt, updatedAt];
}
