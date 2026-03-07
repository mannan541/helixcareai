import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';
import '../domain/child_entity.dart';

class ChildrenRepository {
  final ApiClient _api;

  ChildrenRepository(this._api);

  Future<ChildrenListResponse> list({int limit = 20, int offset = 0, String? search}) async {
    try {
      final queryParams = <String, dynamic>{'limit': limit, 'offset': offset};
      if (search != null && search.trim().isNotEmpty) queryParams['q'] = search.trim();
      final data = await _api.get<Map<String, dynamic>>(
        '/api/children',
        queryParameters: queryParams,
      );
      final list = data!['children'] as List<dynamic>? ?? [];
      final total = data['total'] as int? ?? list.length;
      final children = list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
      return ChildrenListResponse(children: children, total: total);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> getOne(String id) async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/children/$id');
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> create({
    required String firstName,
    required String lastName,
    String? dateOfBirth,
    String? notes,
    String? diagnosis,
    String? referredBy,
    String? childCode,
    String? gender,
    String? profilePhoto,
    String? diagnosisType,
    String? autismLevel,
    String? diagnosisDate,
    String? primaryLanguage,
    String? communicationType,
    String? iqLevel,
    String? developmentalAge,
    String? sensorySensitivity,
    String? behavioralNotes,
    String? medicalConditions,
    String? medications,
    String? allergies,
    String? therapyStartDate,
    String? therapyStatus,
    String? assignedTherapistId,
    String? therapyCenterId,
    String? therapyPlanId,
    int? sessionsPerWeek,
    int? communicationScore,
    int? socialScore,
    int? behavioralScore,
    int? cognitiveScore,
    int? motorSkillScore,
    String? status,
  }) async {
    try {
      final body = <String, dynamic>{
        'firstName': firstName,
        'lastName': lastName,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
        if (notes != null) 'notes': notes,
        if (diagnosis != null) 'diagnosis': diagnosis,
        if (referredBy != null) 'referredBy': referredBy,
        if (childCode != null) 'childCode': childCode,
        if (gender != null) 'gender': gender,
        if (profilePhoto != null) 'profilePhoto': profilePhoto,
        if (diagnosisType != null) 'diagnosisType': diagnosisType,
        if (autismLevel != null) 'autismLevel': autismLevel,
        if (diagnosisDate != null) 'diagnosisDate': diagnosisDate,
        if (primaryLanguage != null) 'primaryLanguage': primaryLanguage,
        if (communicationType != null) 'communicationType': communicationType,
        if (iqLevel != null) 'iqLevel': iqLevel,
        if (developmentalAge != null) 'developmentalAge': developmentalAge,
        if (sensorySensitivity != null) 'sensorySensitivity': sensorySensitivity,
        if (behavioralNotes != null) 'behavioralNotes': behavioralNotes,
        if (medicalConditions != null) 'medicalConditions': medicalConditions,
        if (medications != null) 'medications': medications,
        if (allergies != null) 'allergies': allergies,
        if (therapyStartDate != null) 'therapyStartDate': therapyStartDate,
        if (therapyStatus != null) 'therapyStatus': therapyStatus,
        if (assignedTherapistId != null) 'assignedTherapistId': assignedTherapistId,
        if (therapyCenterId != null) 'therapyCenterId': therapyCenterId,
        if (therapyPlanId != null) 'therapyPlanId': therapyPlanId,
        if (sessionsPerWeek != null) 'sessionsPerWeek': sessionsPerWeek,
        if (communicationScore != null) 'communicationScore': communicationScore,
        if (socialScore != null) 'socialScore': socialScore,
        if (behavioralScore != null) 'behavioralScore': behavioralScore,
        if (cognitiveScore != null) 'cognitiveScore': cognitiveScore,
        if (motorSkillScore != null) 'motorSkillScore': motorSkillScore,
        if (status != null) 'status': status,
      };
      final data = await _api.post<Map<String, dynamic>>('/api/children', body);
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<ChildEntity> update(
    String id, {
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? notes,
    String? diagnosis,
    String? referredBy,
    String? childCode,
    String? gender,
    String? profilePhoto,
    String? diagnosisType,
    String? autismLevel,
    String? diagnosisDate,
    String? primaryLanguage,
    String? communicationType,
    String? iqLevel,
    String? developmentalAge,
    String? sensorySensitivity,
    String? behavioralNotes,
    String? medicalConditions,
    String? medications,
    String? allergies,
    String? therapyStartDate,
    String? therapyStatus,
    String? assignedTherapistId,
    List<String>? assignedTherapistIds,
    String? therapyCenterId,
    String? therapyPlanId,
    int? sessionsPerWeek,
    int? communicationScore,
    int? socialScore,
    int? behavioralScore,
    int? cognitiveScore,
    int? motorSkillScore,
    String? status,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (firstName != null) body['firstName'] = firstName;
      if (lastName != null) body['lastName'] = lastName;
      if (dateOfBirth != null) body['dateOfBirth'] = dateOfBirth;
      if (notes != null) body['notes'] = notes;
      if (diagnosis != null) body['diagnosis'] = diagnosis;
      if (referredBy != null) body['referredBy'] = referredBy;
      if (childCode != null) body['childCode'] = childCode;
      if (gender != null) body['gender'] = gender;
      if (profilePhoto != null) body['profilePhoto'] = profilePhoto;
      if (diagnosisType != null) body['diagnosisType'] = diagnosisType;
      if (autismLevel != null) body['autismLevel'] = autismLevel;
      if (diagnosisDate != null) body['diagnosisDate'] = diagnosisDate;
      if (primaryLanguage != null) body['primaryLanguage'] = primaryLanguage;
      if (communicationType != null) body['communicationType'] = communicationType;
      if (iqLevel != null) body['iqLevel'] = iqLevel;
      if (developmentalAge != null) body['developmentalAge'] = developmentalAge;
      if (sensorySensitivity != null) body['sensorySensitivity'] = sensorySensitivity;
      if (behavioralNotes != null) body['behavioralNotes'] = behavioralNotes;
      if (medicalConditions != null) body['medicalConditions'] = medicalConditions;
      if (medications != null) body['medications'] = medications;
      if (allergies != null) body['allergies'] = allergies;
      if (therapyStartDate != null) body['therapyStartDate'] = therapyStartDate;
      if (therapyStatus != null) body['therapyStatus'] = therapyStatus;
      if (assignedTherapistId != null) body['assignedTherapistId'] = assignedTherapistId;
      if (assignedTherapistIds != null) body['assignedTherapistIds'] = assignedTherapistIds;
      if (therapyCenterId != null) body['therapyCenterId'] = therapyCenterId;
      if (therapyPlanId != null) body['therapyPlanId'] = therapyPlanId;
      if (sessionsPerWeek != null) body['sessionsPerWeek'] = sessionsPerWeek;
      if (communicationScore != null) body['communicationScore'] = communicationScore;
      if (socialScore != null) body['socialScore'] = socialScore;
      if (behavioralScore != null) body['behavioralScore'] = behavioralScore;
      if (cognitiveScore != null) body['cognitiveScore'] = cognitiveScore;
      if (motorSkillScore != null) body['motorSkillScore'] = motorSkillScore;
      if (status != null) body['status'] = status;
      final data = await _api.patch<Map<String, dynamic>>('/api/children/$id', body);
      return _fromJson(data!['child'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.delete('/api/children/$id');
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<List<TherapyCenterOption>> listTherapyCenters() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/children/therapy-centers');
      final list = data!['therapyCenters'] as List<dynamic>? ?? [];
      return list.map((e) {
        final m = e as Map<String, dynamic>;
        return TherapyCenterOption(id: m['id'] as String, name: m['name'] as String);
      }).toList();
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<List<TherapyPlanOption>> listTherapyPlans() async {
    try {
      final data = await _api.get<Map<String, dynamic>>('/api/children/therapy-plans');
      final list = data!['therapyPlans'] as List<dynamic>? ?? [];
      return list.map((e) {
        final m = e as Map<String, dynamic>;
        return TherapyPlanOption(id: m['id'] as String, name: m['name'] as String);
      }).toList();
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  ChildEntity _fromJson(Map<String, dynamic> j) {
    return ChildEntity(
      id: j['id'] as String,
      userId: j['userId'] as String,
      firstName: j['firstName'] as String,
      lastName: j['lastName'] as String,
      dateOfBirth: j['dateOfBirth'] as String?,
      notes: j['notes'] as String?,
      diagnosis: j['diagnosis'] as String?,
      referredBy: j['referredBy'] as String?,
      createdAt: DateTime.parse(j['createdAt'] as String),
      updatedAt: DateTime.parse(j['updatedAt'] as String),
      childCode: (j['childCode'] ?? j['child_code']) as String?,
      gender: j['gender'] as String?,
      profilePhoto: j['profilePhoto'] as String?,
      diagnosisType: j['diagnosisType'] as String?,
      autismLevel: j['autismLevel'] as String?,
      diagnosisDate: j['diagnosisDate'] as String?,
      primaryLanguage: j['primaryLanguage'] as String?,
      communicationType: j['communicationType'] as String?,
      iqLevel: j['iqLevel'] as String?,
      developmentalAge: j['developmentalAge'] as String?,
      sensorySensitivity: j['sensorySensitivity'] as String?,
      behavioralNotes: j['behavioralNotes'] as String?,
      medicalConditions: j['medicalConditions'] as String?,
      medications: j['medications'] as String?,
      allergies: j['allergies'] as String?,
      therapyStartDate: j['therapyStartDate'] as String?,
      therapyStatus: j['therapyStatus'] as String?,
      assignedTherapistId: j['assignedTherapistId'] as String?,
      assignedTherapistIds: (j['assignedTherapistIds'] as List<dynamic>?)?.map((e) => e as String).toList(),
      therapyCenterId: j['therapyCenterId'] as String?,
      therapyPlanId: j['therapyPlanId'] as String?,
      sessionsPerWeek: (j['sessionsPerWeek'] as num?)?.toInt(),
      communicationScore: (j['communicationScore'] as num?)?.toInt(),
      socialScore: (j['socialScore'] as num?)?.toInt(),
      behavioralScore: (j['behavioralScore'] as num?)?.toInt(),
      cognitiveScore: (j['cognitiveScore'] as num?)?.toInt(),
      motorSkillScore: (j['motorSkillScore'] as num?)?.toInt(),
      status: j['status'] as String?,
    );
  }

  AppException _handle(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    if (code == 403) return AppException(msg, 403);
    return AppException(msg, code);
  }
}

class ChildrenListResponse {
  ChildrenListResponse({required this.children, required this.total});
  final List<ChildEntity> children;
  final int total;
}

class TherapyCenterOption {
  const TherapyCenterOption({required this.id, required this.name});
  final String id;
  final String name;
}

class TherapyPlanOption {
  const TherapyPlanOption({required this.id, required this.name});
  final String id;
  final String name;
}
