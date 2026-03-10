import { query, queryOne } from '../../config/database';

export type ClinicSlotRow = {
    id: string;
    label: string;
    start_time: string;
    end_time: string;
    slot_type: 'available' | 'blocked';
    day_of_week: number[] | null;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

export async function listSlots(): Promise<ClinicSlotRow[]> {
    return query<ClinicSlotRow>(
        `SELECT * FROM clinic_slots ORDER BY start_time ASC`
    );
}

export async function createSlot(data: {
    label: string;
    startTime: string;
    endTime: string;
    slotType?: 'available' | 'blocked';
    dayOfWeek?: number[] | null;
    createdBy: string;
}): Promise<ClinicSlotRow> {
    const rows = await query<ClinicSlotRow>(
        `INSERT INTO clinic_slots (label, start_time, end_time, slot_type, day_of_week, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
            data.label,
            data.startTime,
            data.endTime,
            data.slotType ?? 'available',
            data.dayOfWeek ?? null,
            data.createdBy,
        ]
    );
    return rows[0];
}

export async function updateSlot(
    id: string,
    data: Partial<{
        label: string;
        startTime: string;
        endTime: string;
        slotType: 'available' | 'blocked';
        dayOfWeek: number[] | null;
        isActive: boolean;
    }>
): Promise<ClinicSlotRow | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (data.label !== undefined) {
        params.push(data.label);
        setClauses.push(`label = $${params.length}`);
    }
    if (data.startTime !== undefined) {
        params.push(data.startTime);
        setClauses.push(`start_time = $${params.length}`);
    }
    if (data.endTime !== undefined) {
        params.push(data.endTime);
        setClauses.push(`end_time = $${params.length}`);
    }
    if (data.slotType !== undefined) {
        params.push(data.slotType);
        setClauses.push(`slot_type = $${params.length}`);
    }
    if (data.dayOfWeek !== undefined) {
        params.push(data.dayOfWeek);
        setClauses.push(`day_of_week = $${params.length}`);
    }
    if (data.isActive !== undefined) {
        params.push(data.isActive);
        setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) return null;

    params.push(id);
    const rows = await query<ClinicSlotRow>(
        `UPDATE clinic_slots SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = $${params.length} RETURNING *`,
        params
    );
    return rows[0] ?? null;
}

export async function deleteSlot(id: string): Promise<boolean> {
    const rows = await query(
        `DELETE FROM clinic_slots WHERE id = $1 RETURNING id`,
        [id]
    );
    return rows.length > 0;
}

/** Returns active slots that should be shown for a given day-of-week (0=Sun). */
export async function getActiveSlotsForDay(dayOfWeek: number): Promise<ClinicSlotRow[]> {
    return query<ClinicSlotRow>(
        `SELECT * FROM clinic_slots
         WHERE is_active = TRUE
           AND (day_of_week IS NULL OR $1 = ANY(day_of_week))
         ORDER BY start_time ASC`,
        [dayOfWeek]
    );
}
