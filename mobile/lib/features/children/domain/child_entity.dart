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
  // Production schema (optional)
  final String? childCode;
  final String? gender;
  final String? profilePhoto;
  final String? diagnosisType;
  final String? autismLevel;
  final String? diagnosisDate;
  final String? primaryLanguage;
  final String? communicationType;
  final String? iqLevel;
  final String? developmentalAge;
  final String? sensorySensitivity;
  final String? behavioralNotes;
  final String? medicalConditions;
  final String? medications;
  final String? allergies;
  final String? therapyStartDate;
  final String? therapyStatus;
  final String? assignedTherapistId;
  final List<String>? assignedTherapistIds;
  final String? therapyCenterId;
  final String? therapyPlanId;
  final int? sessionsPerWeek;
  final int? communicationScore;
  final int? socialScore;
  final int? behavioralScore;
  final int? cognitiveScore;
  final int? motorSkillScore;
  final String? status;

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
    this.childCode,
    this.gender,
    this.profilePhoto,
    this.diagnosisType,
    this.autismLevel,
    this.diagnosisDate,
    this.primaryLanguage,
    this.communicationType,
    this.iqLevel,
    this.developmentalAge,
    this.sensorySensitivity,
    this.behavioralNotes,
    this.medicalConditions,
    this.medications,
    this.allergies,
    this.therapyStartDate,
    this.therapyStatus,
    this.assignedTherapistId,
    this.assignedTherapistIds,
    this.therapyCenterId,
    this.therapyPlanId,
    this.sessionsPerWeek,
    this.communicationScore,
    this.socialScore,
    this.behavioralScore,
    this.cognitiveScore,
    this.motorSkillScore,
    this.status,
  });

  String get fullName => '$firstName $lastName'.trim();

  @override
  List<Object?> get props => [
        id, userId, firstName, lastName, dateOfBirth, notes, diagnosis, referredBy,
        createdAt, updatedAt, childCode, gender, profilePhoto, diagnosisType, autismLevel,
        diagnosisDate, primaryLanguage, communicationType, iqLevel, developmentalAge,
        sensorySensitivity, behavioralNotes, medicalConditions, medications, allergies,
        therapyStartDate, therapyStatus, assignedTherapistId, assignedTherapistIds, therapyCenterId, therapyPlanId,
        sessionsPerWeek, communicationScore, socialScore, behavioralScore, cognitiveScore,
        motorSkillScore, status,
      ];
}
