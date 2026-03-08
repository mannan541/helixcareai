import { Request, Response } from 'express';
import * as childrenService from './children.service';

function toChildDto(c: childrenService.ChildRow): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: c.id,
    userId: c.user_id,
    firstName: c.first_name,
    lastName: c.last_name,
    dateOfBirth: c.date_of_birth,
    notes: c.notes,
    diagnosis: c.diagnosis,
    referredBy: c.referred_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
  if (c.child_code != null) base.childCode = c.child_code;
  if (c.gender != null) base.gender = c.gender;
  if (c.profile_photo != null) base.profilePhoto = c.profile_photo;
  if (c.diagnosis_type != null) base.diagnosisType = c.diagnosis_type;
  if (c.autism_level != null) base.autismLevel = c.autism_level;
  if (c.diagnosis_date != null) base.diagnosisDate = c.diagnosis_date;
  if (c.primary_language != null) base.primaryLanguage = c.primary_language;
  if (c.communication_type != null) base.communicationType = c.communication_type;
  if (c.iq_level != null) base.iqLevel = c.iq_level;
  if (c.developmental_age != null) base.developmentalAge = c.developmental_age;
  if (c.sensory_sensitivity != null) base.sensorySensitivity = c.sensory_sensitivity;
  if (c.behavioral_notes != null) base.behavioralNotes = c.behavioral_notes;
  if (c.medical_conditions != null) base.medicalConditions = c.medical_conditions;
  if (c.medications != null) base.medications = c.medications;
  if (c.allergies != null) base.allergies = c.allergies;
  if (c.therapy_start_date != null) base.therapyStartDate = c.therapy_start_date;
  if (c.therapy_status != null) base.therapyStatus = c.therapy_status;
  if (c.assigned_therapist_id != null) base.assignedTherapistId = c.assigned_therapist_id;
  if (c.therapy_center_id != null) base.therapyCenterId = c.therapy_center_id;
  if (c.therapy_plan_id != null) base.therapyPlanId = c.therapy_plan_id;
  if (c.sessions_per_week != null) base.sessionsPerWeek = c.sessions_per_week;
  if (c.communication_score != null) base.communicationScore = c.communication_score;
  if (c.social_score != null) base.socialScore = c.social_score;
  if (c.behavioral_score != null) base.behavioralScore = c.behavioral_score;
  if (c.cognitive_score != null) base.cognitiveScore = c.cognitive_score;
  if (c.motor_skill_score != null) base.motorSkillScore = c.motor_skill_score;
  if (c.rag_profile_summary != null) base.ragProfileSummary = c.rag_profile_summary;
  if (c.last_ai_analysis_date != null) base.lastAiAnalysisDate = c.last_ai_analysis_date;
  if (c.embedding_vector_id != null) base.embeddingVectorId = c.embedding_vector_id;
  if (c.status != null) base.status = c.status;
  return base;
}

export async function listTherapyCenters(_req: Request, res: Response): Promise<void> {
  const rows = await childrenService.listTherapyCenters();
  res.json({ therapyCenters: rows });
}

export async function listTherapyPlans(_req: Request, res: Response): Promise<void> {
  const rows = await childrenService.listTherapyPlans();
  res.json({ therapyPlans: rows });
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const search = (req.query.q as string)?.trim() || (req.query.search as string)?.trim() || undefined;
  const { rows: children, total } = await childrenService.findByUserId(req.user.userId, req.user.role, {
    limit,
    offset,
    search: search && search.length > 0 ? search : undefined,
  });
  res.json({
    children: children.map(toChildDto),
    total,
    limit,
    offset,
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const therapistIds = await childrenService.getChildTherapistIds(id);
  res.json({ child: { ...toChildDto(child), assignedTherapistIds: therapistIds } });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const child = await childrenService.create(req.user.userId, {
    firstName: String(body.firstName ?? ''),
    lastName: String(body.lastName ?? ''),
    dateOfBirth: body.dateOfBirth != null ? String(body.dateOfBirth) : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
    diagnosis: body.diagnosis != null ? String(body.diagnosis) : undefined,
    referredBy: body.referredBy != null ? String(body.referredBy) : undefined,
    childCode: body.childCode != null ? String(body.childCode) : undefined,
    gender: body.gender != null ? String(body.gender) : undefined,
    profilePhoto: body.profilePhoto != null ? String(body.profilePhoto) : undefined,
    diagnosisType: body.diagnosisType != null ? String(body.diagnosisType) : undefined,
    autismLevel: body.autismLevel != null ? String(body.autismLevel) : undefined,
    diagnosisDate: body.diagnosisDate != null ? String(body.diagnosisDate) : undefined,
    primaryLanguage: body.primaryLanguage != null ? String(body.primaryLanguage) : undefined,
    communicationType: body.communicationType != null ? String(body.communicationType) : undefined,
    iqLevel: body.iqLevel != null ? String(body.iqLevel) : undefined,
    developmentalAge: body.developmentalAge != null ? String(body.developmentalAge) : undefined,
    sensorySensitivity: body.sensorySensitivity != null ? String(body.sensorySensitivity) : undefined,
    behavioralNotes: body.behavioralNotes != null ? String(body.behavioralNotes) : undefined,
    medicalConditions: body.medicalConditions != null ? String(body.medicalConditions) : undefined,
    medications: body.medications != null ? String(body.medications) : undefined,
    allergies: body.allergies != null ? String(body.allergies) : undefined,
    therapyStartDate: body.therapyStartDate != null ? String(body.therapyStartDate) : undefined,
    therapyStatus: body.therapyStatus != null ? String(body.therapyStatus) : undefined,
    assignedTherapistId: body.assignedTherapistId != null ? String(body.assignedTherapistId) : undefined,
    therapyCenterId: body.therapyCenterId != null ? String(body.therapyCenterId) : undefined,
    therapyPlanId: body.therapyPlanId != null ? String(body.therapyPlanId) : undefined,
    sessionsPerWeek: body.sessionsPerWeek != null ? Number(body.sessionsPerWeek) : undefined,
    communicationScore: body.communicationScore != null ? Number(body.communicationScore) : undefined,
    socialScore: body.socialScore != null ? Number(body.socialScore) : undefined,
    behavioralScore: body.behavioralScore != null ? Number(body.behavioralScore) : undefined,
    cognitiveScore: body.cognitiveScore != null ? Number(body.cognitiveScore) : undefined,
    motorSkillScore: body.motorSkillScore != null ? Number(body.motorSkillScore) : undefined,
    status: body.status != null ? String(body.status) : undefined,
  });
  res.status(201).json({ child: toChildDto(child) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const updated = await childrenService.update(id, {
    updatedBy: req.user!.userId,
    firstName: body.firstName != null ? String(body.firstName) : undefined,
    lastName: body.lastName != null ? String(body.lastName) : undefined,
    dateOfBirth: body.dateOfBirth != null ? String(body.dateOfBirth) : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
    diagnosis: body.diagnosis != null ? String(body.diagnosis) : undefined,
    referredBy: body.referredBy != null ? String(body.referredBy) : undefined,
    childCode: body.childCode != null ? String(body.childCode) : undefined,
    gender: body.gender != null ? String(body.gender) : undefined,
    profilePhoto: body.profilePhoto != null ? String(body.profilePhoto) : undefined,
    diagnosisType: body.diagnosisType != null ? String(body.diagnosisType) : undefined,
    autismLevel: body.autismLevel != null ? String(body.autismLevel) : undefined,
    diagnosisDate: body.diagnosisDate != null ? String(body.diagnosisDate) : undefined,
    primaryLanguage: body.primaryLanguage != null ? String(body.primaryLanguage) : undefined,
    communicationType: body.communicationType != null ? String(body.communicationType) : undefined,
    iqLevel: body.iqLevel != null ? String(body.iqLevel) : undefined,
    developmentalAge: body.developmentalAge != null ? String(body.developmentalAge) : undefined,
    sensorySensitivity: body.sensorySensitivity != null ? String(body.sensorySensitivity) : undefined,
    behavioralNotes: body.behavioralNotes != null ? String(body.behavioralNotes) : undefined,
    medicalConditions: body.medicalConditions != null ? String(body.medicalConditions) : undefined,
    medications: body.medications != null ? String(body.medications) : undefined,
    allergies: body.allergies != null ? String(body.allergies) : undefined,
    therapyStartDate: body.therapyStartDate != null ? String(body.therapyStartDate) : undefined,
    therapyStatus: body.therapyStatus != null ? String(body.therapyStatus) : undefined,
    assignedTherapistId: body.assignedTherapistId != null ? String(body.assignedTherapistId) : undefined,
    assignedTherapistIds: Array.isArray(body.assignedTherapistIds)
      ? (body.assignedTherapistIds as unknown[]).map((x) => String(x)).filter((x) => /^[0-9a-f-]{36}$/i.test(x))
      : undefined,
    therapyCenterId: body.therapyCenterId != null ? String(body.therapyCenterId) : undefined,
    therapyPlanId: body.therapyPlanId != null ? String(body.therapyPlanId) : undefined,
    sessionsPerWeek: body.sessionsPerWeek != null ? Number(body.sessionsPerWeek) : undefined,
    communicationScore: body.communicationScore != null ? Number(body.communicationScore) : undefined,
    socialScore: body.socialScore != null ? Number(body.socialScore) : undefined,
    behavioralScore: body.behavioralScore != null ? Number(body.behavioralScore) : undefined,
    cognitiveScore: body.cognitiveScore != null ? Number(body.cognitiveScore) : undefined,
    motorSkillScore: body.motorSkillScore != null ? Number(body.motorSkillScore) : undefined,
    status: body.status != null ? String(body.status) : undefined,
  });
  if (!updated) {
    res.status(500).json({ error: 'Update failed' });
    return;
  }
  const therapistIds = await childrenService.getChildTherapistIds(id);
  res.json({ child: { ...toChildDto(updated), assignedTherapistIds: therapistIds } });
}

/** Delete (soft-delete) a child. Admin only. */
export async function remove(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators can delete a child' });
    return;
  }
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  await childrenService.remove(id, req.user!.userId);
  res.status(204).send();
}
