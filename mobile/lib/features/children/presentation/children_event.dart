part of 'children_bloc.dart';

sealed class ChildrenEvent extends Equatable {
  const ChildrenEvent();
  @override
  List<Object?> get props => [];
}

final class ChildrenLoadRequested extends ChildrenEvent {
  const ChildrenLoadRequested({this.loadMore = false, this.search});
  final bool loadMore;
  /// Filter by child ID (code) or name; null or empty = no filter.
  final String? search;
  @override
  List<Object?> get props => [loadMore, search];
}

final class ChildrenCreateRequested extends ChildrenEvent {
  final String firstName;
  final String lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
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
  final String? therapyCenterId;
  final String? therapyPlanId;
  final int? sessionsPerWeek;
  final int? communicationScore;
  final int? socialScore;
  final int? behavioralScore;
  final int? cognitiveScore;
  final int? motorSkillScore;
  final String? status;
  const ChildrenCreateRequested({
    required this.firstName,
    required this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
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
  @override
  List<Object?> get props => [
        firstName, lastName, dateOfBirth, notes, diagnosis, referredBy,
        childCode, gender, profilePhoto, diagnosisType, autismLevel, diagnosisDate,
        primaryLanguage, communicationType, iqLevel, developmentalAge, sensorySensitivity,
        behavioralNotes, medicalConditions, medications, allergies, therapyStartDate,
        therapyStatus, assignedTherapistId, therapyCenterId, therapyPlanId,
        sessionsPerWeek, communicationScore, socialScore, behavioralScore, cognitiveScore,
        motorSkillScore, status,
      ];
}

final class ChildrenUpdateRequested extends ChildrenEvent {
  final String id;
  final String? firstName;
  final String? lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
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
  const ChildrenUpdateRequested({
    required this.id,
    this.firstName,
    this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
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
  @override
  List<Object?> get props => [
        id, firstName, lastName, dateOfBirth, notes, diagnosis, referredBy,
        childCode, gender, profilePhoto, diagnosisType, autismLevel, diagnosisDate,
        primaryLanguage, communicationType, iqLevel, developmentalAge, sensorySensitivity,
        behavioralNotes, medicalConditions, medications, allergies, therapyStartDate,
        therapyStatus, assignedTherapistId, assignedTherapistIds, therapyCenterId, therapyPlanId,
        sessionsPerWeek, communicationScore, socialScore, behavioralScore, cognitiveScore,
        motorSkillScore, status,
      ];
}

final class ChildrenDeleteRequested extends ChildrenEvent {
  final String id;
  const ChildrenDeleteRequested(this.id);
  @override
  List<Object?> get props => [id];
}
