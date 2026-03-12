import { query, queryOne } from '../../config/database';



export type ChildRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  diagnosis: string | null;
  referred_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // Production schema (optional columns added by migration)
  child_code?: string | null;
  gender?: string | null;
  profile_photo?: string | null;
  diagnosis_type?: string | null;
  autism_level?: string | null;
  diagnosis_date?: string | null;
  primary_language?: string | null;
  communication_type?: string | null;
  iq_level?: string | null;
  developmental_age?: string | null;
  sensory_sensitivity?: string | null;
  behavioral_notes?: string | null;
  medical_conditions?: string | null;
  medications?: string | null;
  allergies?: string | null;
  therapy_start_date?: string | null;
  therapy_status?: string | null;
  assigned_therapist_id?: string | null;
  therapy_center_id?: string | null;
  therapy_plan_id?: string | null;
  sessions_per_week?: number | null;
  communication_score?: number | null;
  social_score?: number | null;
  behavioral_score?: number | null;
  cognitive_score?: number | null;
  motor_skill_score?: number | null;
  rag_profile_summary?: string | null;
  last_ai_analysis_date?: string | null;
  embedding_vector_id?: string | null;
  status?: string | null;
};

export type ChildCreateData = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  notes?: string;
  diagnosis?: string;
  referredBy?: string;
  childCode?: string;
  gender?: string;
  profilePhoto?: string;
  diagnosisType?: string;
  autismLevel?: string;
  diagnosisDate?: string;
  primaryLanguage?: string;
  communicationType?: string;
  iqLevel?: string;
  developmentalAge?: string;
  sensorySensitivity?: string;
  behavioralNotes?: string;
  medicalConditions?: string;
  medications?: string;
  allergies?: string;
  therapyStartDate?: string;
  therapyStatus?: string;
  assignedTherapistId?: string;
  therapyCenterId?: string;
  therapyPlanId?: string;
  sessionsPerWeek?: number;
  communicationScore?: number;
  socialScore?: number;
  behavioralScore?: number;
  cognitiveScore?: number;
  motorSkillScore?: number;
  status?: string;
};

/** Returns next child code in form CH001, CH002, ... */
export async function generateNextChildCode(): Promise<string> {
  const rows = await query<{ child_code: string }>(
    `SELECT child_code FROM children WHERE child_code IS NOT NULL AND child_code ~ '^CH[0-9]+\$' ORDER BY (SUBSTRING(child_code FROM 3))::INT DESC NULLS LAST LIMIT 1`
  );
  const last = rows[0]?.child_code;
  const nextNum = last ? parseInt(last.replace(/^CH/i, ''), 10) + 1 : 1;
  return 'CH' + String(nextNum).padStart(3, '0');
}

export async function create(userId: string, data: ChildCreateData): Promise<ChildRow> {
  const childCode = (data.childCode?.trim() || null) ?? await generateNextChildCode();
  const cols = ['user_id', 'first_name', 'last_name', 'date_of_birth', 'notes', 'diagnosis', 'referred_by', 'created_by', 'child_code'];
  const vals: unknown[] = [
    userId,
    data.firstName.trim(),
    data.lastName.trim(),
    data.dateOfBirth ?? null,
    data.notes ?? null,
    data.diagnosis?.trim() ?? null,
    data.referredBy?.trim() ?? null,
    userId,
    childCode,
  ];
  let i = 10;
  if (data.gender != null) { cols.push('gender'); vals.push(data.gender.trim() || null); i++; }
  if (data.profilePhoto != null) { cols.push('profile_photo'); vals.push(data.profilePhoto.trim() || null); i++; }
  if (data.diagnosisType != null) { cols.push('diagnosis_type'); vals.push(data.diagnosisType.trim() || null); i++; }
  if (data.autismLevel != null) { cols.push('autism_level'); vals.push(data.autismLevel.trim() || null); i++; }
  if (data.diagnosisDate != null) { cols.push('diagnosis_date'); vals.push(data.diagnosisDate.trim() || null); i++; }
  if (data.primaryLanguage != null) { cols.push('primary_language'); vals.push(data.primaryLanguage.trim() || null); i++; }
  if (data.communicationType != null) { cols.push('communication_type'); vals.push(data.communicationType.trim() || null); i++; }
  if (data.iqLevel != null) { cols.push('iq_level'); vals.push(data.iqLevel.trim() || null); i++; }
  if (data.developmentalAge != null) { cols.push('developmental_age'); vals.push(data.developmentalAge.trim() || null); i++; }
  if (data.sensorySensitivity != null) { cols.push('sensory_sensitivity'); vals.push(data.sensorySensitivity.trim() || null); i++; }
  if (data.behavioralNotes != null) { cols.push('behavioral_notes'); vals.push(data.behavioralNotes.trim() || null); i++; }
  if (data.medicalConditions != null) { cols.push('medical_conditions'); vals.push(data.medicalConditions.trim() || null); i++; }
  if (data.medications != null) { cols.push('medications'); vals.push(data.medications.trim() || null); i++; }
  if (data.allergies != null) { cols.push('allergies'); vals.push(data.allergies.trim() || null); i++; }
  if (data.therapyStartDate != null) { cols.push('therapy_start_date'); vals.push(data.therapyStartDate.trim() || null); i++; }
  if (data.therapyStatus != null) { cols.push('therapy_status'); vals.push(data.therapyStatus.trim() || null); i++; }
  if (data.assignedTherapistId != null) { cols.push('assigned_therapist_id'); vals.push(data.assignedTherapistId.trim() || null); i++; }
  if (data.therapyCenterId != null) { cols.push('therapy_center_id'); vals.push(data.therapyCenterId.trim() || null); i++; }
  if (data.therapyPlanId != null) { cols.push('therapy_plan_id'); vals.push(data.therapyPlanId.trim() || null); i++; }
  if (data.sessionsPerWeek != null) { cols.push('sessions_per_week'); vals.push(data.sessionsPerWeek); i++; }
  if (data.communicationScore != null) { cols.push('communication_score'); vals.push(data.communicationScore); i++; }
  if (data.socialScore != null) { cols.push('social_score'); vals.push(data.socialScore); i++; }
  if (data.behavioralScore != null) { cols.push('behavioral_score'); vals.push(data.behavioralScore); i++; }
  if (data.cognitiveScore != null) { cols.push('cognitive_score'); vals.push(data.cognitiveScore); i++; }
  if (data.motorSkillScore != null) { cols.push('motor_skill_score'); vals.push(data.motorSkillScore); i++; }
  if (data.status != null) { cols.push('status'); vals.push(data.status.trim() || null); i++; }
  const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
  const rows = await query<ChildRow>(
    `INSERT INTO children (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    vals
  );
  return rows[0];
}

export async function findById(id: string): Promise<ChildRow | null> {
  return queryOne<ChildRow>(`SELECT * FROM children WHERE id = $1`, [id]);
}

export type TherapyCenterRow = { id: string; name: string };
export type TherapyPlanRow = { id: string; name: string };

export async function listTherapyCenters(): Promise<TherapyCenterRow[]> {
  return query<TherapyCenterRow>('SELECT id, name FROM therapy_centers ORDER BY name');
}

export async function listTherapyPlans(): Promise<TherapyPlanRow[]> {
  return query<TherapyPlanRow>('SELECT id, name FROM therapy_plans ORDER BY name');
}

export async function getChildTherapistIds(childId: string): Promise<string[]> {
  const rows = await query<{ therapist_id: string }>(
    'SELECT therapist_id FROM child_therapists WHERE child_id = $1 ORDER BY created_at',
    [childId]
  );
  return rows.map((r) => r.therapist_id);
}

export async function setChildTherapists(childId: string, therapistIds: string[]): Promise<void> {
  await query('DELETE FROM child_therapists WHERE child_id = $1', [childId]);
  for (const tid of therapistIds) {
    if (tid && /^[0-9a-f-]{36}$/i.test(tid)) {
      await query(
        'INSERT INTO child_therapists (child_id, therapist_id) VALUES ($1, $2) ON CONFLICT (child_id, therapist_id) DO NOTHING',
        [childId, tid]
      );
    }
  }
}

export async function findByUserId(
  userId: string,
  role: string,
  opts?: { limit: number; offset: number; search?: string }
): Promise<{ rows: ChildRow[]; total: number }> {
  const limit = opts ? Math.min(Math.max(opts.limit, 1), 100) : 9999;
  const offset = opts ? Math.max(opts.offset, 0) : 0;
  const search = opts?.search?.trim();
  const canListAll = role === 'admin' || role === 'therapist';
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (!canListAll) {
    conditions.push(`user_id = $${idx++}`);
    params.push(userId);
  }
  if (search && search.length > 0) {
    conditions.push(
      `(child_code ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')) ILIKE $${idx})`
    );
    params.push(`%${search}%`);
    idx++;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM children ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const orderLimit = `ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  const rows = await query<ChildRow>(
    `SELECT * FROM children ${where} ${orderLimit}`,
    [...params, limit, offset]
  );
  return { rows, total };
}

export type ChildUpdateData = {
  updatedBy?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  notes?: string;
  diagnosis?: string;
  referredBy?: string;
  childCode?: string;
  gender?: string;
  profilePhoto?: string;
  diagnosisType?: string;
  autismLevel?: string;
  diagnosisDate?: string;
  primaryLanguage?: string;
  communicationType?: string;
  iqLevel?: string;
  developmentalAge?: string;
  sensorySensitivity?: string;
  behavioralNotes?: string;
  medicalConditions?: string;
  medications?: string;
  allergies?: string;
  therapyStartDate?: string;
  therapyStatus?: string;
  assignedTherapistId?: string;
  assignedTherapistIds?: string[];
  therapyCenterId?: string;
  therapyPlanId?: string;
  sessionsPerWeek?: number;
  communicationScore?: number;
  socialScore?: number;
  behavioralScore?: number;
  cognitiveScore?: number;
  motorSkillScore?: number;
  status?: string;
};

export async function update(id: string, data: ChildUpdateData): Promise<ChildRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.updatedBy !== undefined) { updates.push(`updated_by = $${i++}`); values.push(data.updatedBy); }
  if (data.firstName !== undefined) { updates.push(`first_name = $${i++}`); values.push(data.firstName.trim()); }
  if (data.lastName !== undefined) { updates.push(`last_name = $${i++}`); values.push(data.lastName.trim()); }
  if (data.dateOfBirth !== undefined) { updates.push(`date_of_birth = $${i++}`); values.push(data.dateOfBirth || null); }
  if (data.notes !== undefined) { updates.push(`notes = $${i++}`); values.push(data.notes); }
  if (data.diagnosis !== undefined) { updates.push(`diagnosis = $${i++}`); values.push(data.diagnosis?.trim() ?? null); }
  if (data.referredBy !== undefined) { updates.push(`referred_by = $${i++}`); values.push(data.referredBy?.trim() ?? null); }
  if (data.childCode !== undefined) { updates.push(`child_code = $${i++}`); values.push((data.childCode ?? '').trim() || null); }
  if (data.gender !== undefined) { updates.push(`gender = $${i++}`); values.push((data.gender ?? '').trim() || null); }
  if (data.profilePhoto !== undefined) { updates.push(`profile_photo = $${i++}`); values.push((data.profilePhoto ?? '').trim() || null); }
  if (data.diagnosisType !== undefined) { updates.push(`diagnosis_type = $${i++}`); values.push((data.diagnosisType ?? '').trim() || null); }
  if (data.autismLevel !== undefined) { updates.push(`autism_level = $${i++}`); values.push((data.autismLevel ?? '').trim() || null); }
  if (data.diagnosisDate !== undefined) { updates.push(`diagnosis_date = $${i++}`); values.push((data.diagnosisDate ?? '').trim() || null); }
  if (data.primaryLanguage !== undefined) { updates.push(`primary_language = $${i++}`); values.push((data.primaryLanguage ?? '').trim() || null); }
  if (data.communicationType !== undefined) { updates.push(`communication_type = $${i++}`); values.push((data.communicationType ?? '').trim() || null); }
  if (data.iqLevel !== undefined) { updates.push(`iq_level = $${i++}`); values.push((data.iqLevel ?? '').trim() || null); }
  if (data.developmentalAge !== undefined) { updates.push(`developmental_age = $${i++}`); values.push((data.developmentalAge ?? '').trim() || null); }
  if (data.sensorySensitivity !== undefined) { updates.push(`sensory_sensitivity = $${i++}`); values.push((data.sensorySensitivity ?? '').trim() || null); }
  if (data.behavioralNotes !== undefined) { updates.push(`behavioral_notes = $${i++}`); values.push((data.behavioralNotes ?? '').trim() || null); }
  if (data.medicalConditions !== undefined) { updates.push(`medical_conditions = $${i++}`); values.push((data.medicalConditions ?? '').trim() || null); }
  if (data.medications !== undefined) { updates.push(`medications = $${i++}`); values.push((data.medications ?? '').trim() || null); }
  if (data.allergies !== undefined) { updates.push(`allergies = $${i++}`); values.push((data.allergies ?? '').trim() || null); }
  if (data.therapyStartDate !== undefined) { updates.push(`therapy_start_date = $${i++}`); values.push((data.therapyStartDate ?? '').trim() || null); }
  if (data.therapyStatus !== undefined) { updates.push(`therapy_status = $${i++}`); values.push((data.therapyStatus ?? '').trim() || null); }
  if (data.assignedTherapistId !== undefined) { updates.push(`assigned_therapist_id = $${i++}`); values.push((data.assignedTherapistId ?? '').trim() || null); }
  if (data.therapyCenterId !== undefined) { updates.push(`therapy_center_id = $${i++}`); values.push((data.therapyCenterId ?? '').trim() || null); }
  if (data.therapyPlanId !== undefined) { updates.push(`therapy_plan_id = $${i++}`); values.push((data.therapyPlanId ?? '').trim() || null); }
  if (data.sessionsPerWeek !== undefined) { updates.push(`sessions_per_week = $${i++}`); values.push(data.sessionsPerWeek); }
  if (data.communicationScore !== undefined) { updates.push(`communication_score = $${i++}`); values.push(data.communicationScore); }
  if (data.socialScore !== undefined) { updates.push(`social_score = $${i++}`); values.push(data.socialScore); }
  if (data.behavioralScore !== undefined) { updates.push(`behavioral_score = $${i++}`); values.push(data.behavioralScore); }
  if (data.cognitiveScore !== undefined) { updates.push(`cognitive_score = $${i++}`); values.push(data.cognitiveScore); }
  if (data.motorSkillScore !== undefined) { updates.push(`motor_skill_score = $${i++}`); values.push(data.motorSkillScore); }
  if (data.status !== undefined) { updates.push(`status = $${i++}`); values.push((data.status ?? '').trim() || null); }
  if (data.assignedTherapistIds !== undefined) {
    await setChildTherapists(id, data.assignedTherapistIds);
    const firstId = data.assignedTherapistIds.length > 0 ? data.assignedTherapistIds[0] : null;
    updates.push(`assigned_therapist_id = $${i++}`);
    values.push((firstId ?? '').trim() || null);
  }
  if (updates.length === 0) return findById(id);
  values.push(id);
  const rows = await query<ChildRow>(
    `UPDATE children SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string, _deletedByUserId: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    `DELETE FROM children WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.length > 0;
}

export async function assignChildrenToUser(childIds: string[], userId: string): Promise<void> {
  if (childIds.length === 0) return;
  for (const childId of childIds) {
    await query('UPDATE children SET user_id = $1, updated_by = $2, updated_at = NOW() WHERE id = $3', [userId, userId, childId]);
  }
}

/** Get child IDs currently assigned to this user (parent). */
export async function getChildIdsByUserId(userId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    'SELECT id FROM children WHERE user_id = $1',
    [userId]
  );
  return rows.map((r) => r.id);
}

/**
 * Set which children belong to a parent. Unassigns children no longer in the list (reassigns to first admin).
 * Then assigns the given childIds to the parent.
 */
export async function setParentChildren(parentUserId: string, childIds: string[]): Promise<void> {
  const adminRow = await queryOne<{ id: string }>("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1");
  const fallbackUserId = adminRow?.id;
  if (!fallbackUserId) return;
  if (childIds.length === 0) {
    await query(
      'UPDATE children SET user_id = $1, updated_by = $2, updated_at = NOW() WHERE user_id = $3',
      [fallbackUserId, parentUserId, parentUserId]
    );
    return;
  }
  await query(
    `UPDATE children SET user_id = $1, updated_by = $2, updated_at = NOW()
     WHERE user_id = $3 AND id != ALL($4::uuid[])`,
    [fallbackUserId, parentUserId, parentUserId, childIds]
  );
  await assignChildrenToUser(childIds, parentUserId);
}

export function canAccessChild(childUserId: string, requestUserId: string, role: string): boolean {
  console.log('[childrenService.canAccessChild]', { childUserId, requestUserId, role });
  if (role === 'admin' || role === 'therapist') return true;
  return childUserId === requestUserId;
}
