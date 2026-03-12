import { query, queryOne } from '../../config/database';

export type AppointmentRow = {
    id: string;
    child_id: string;
    therapist_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'completed' | 'cancelled';
    created_by: string | null;
    approved_by: string | null;
    created_at: string;
    updated_at: string;
};

export type AppointmentWithUserRow = AppointmentRow & {
    _child_first_name: string;
    _child_last_name: string;
    _therapist_full_name: string;
    _therapist_email: string;
    _therapist_title: string | null;
    session_id: string | null;
};

export async function create(data: {
    childId: string;
    therapistId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status?: 'pending' | 'approved';
    createdBy: string;
}): Promise<AppointmentRow> {
    const rows = await query<AppointmentRow>(
        `INSERT INTO appointments (child_id, therapist_id, appointment_date, start_time, end_time, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [
            data.childId,
            data.therapistId,
            data.appointmentDate,
            data.startTime,
            data.endTime,
            data.status || 'pending',
            data.createdBy,
        ]
    );
    return rows[0];
}

export async function list(filters: {
    date?: string;
    therapistId?: string;
    childId?: string;
    parentId?: string;
    status?: string;
}): Promise<AppointmentWithUserRow[]> {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    let sql = `
    SELECT a.*, 
           c.first_name AS _child_first_name, c.last_name AS _child_last_name,
           u.full_name AS _therapist_full_name, u.email AS _therapist_email, u.title AS _therapist_title,
           s.id AS session_id,
           u_log.full_name AS session_logged_by_name
    FROM appointments a
    JOIN children c ON a.child_id = c.id
    JOIN users u ON a.therapist_id = u.id
    LEFT JOIN sessions s ON a.id = s.appointment_id
    LEFT JOIN users u_log ON s.created_by = u_log.id
  `;

    if (filters.date) {
        params.push(filters.date);
        whereClauses.push(`a.appointment_date = $${params.length}`);
    }
    if (filters.therapistId) {
        params.push(filters.therapistId);
        whereClauses.push(`a.therapist_id = $${params.length}`);
    }
    if (filters.childId) {
        params.push(filters.childId);
        whereClauses.push(`a.child_id = $${params.length}`);
    }
    if (filters.status) {
        params.push(filters.status);
        whereClauses.push(`a.status = $${params.length}`);
    }
    if (filters.parentId) {
        params.push(filters.parentId);
        whereClauses.push(`c.user_id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY a.appointment_date ASC, a.start_time ASC`;

    return query<AppointmentWithUserRow>(sql, params);
}

export async function updateStatus(
    id: string,
    status: 'approved' | 'completed' | 'cancelled',
    adminId: string
): Promise<AppointmentRow | null> {
    try {
        let rows: AppointmentRow[];
        if (status === 'approved') {
            rows = await query<AppointmentRow>(
                `UPDATE appointments 
             SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
                [status, adminId, id]
            );
        } else {
            rows = await query<AppointmentRow>(
                `UPDATE appointments 
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
                [status, id]
            );
        }
        return rows[0] ?? null;
    } catch (err: any) {
        console.error('[updateStatus] DB error:', err.message, { id, status, adminId });
        throw err;
    }
}

export async function findById(id: string): Promise<AppointmentRow | null> {
    return queryOne<AppointmentRow>(
        'SELECT * FROM appointments WHERE id = $1',
        [id]
    );
}

export async function getBookedSlots(therapistId: string, date: string): Promise<{ id: string; start_time: string; end_time: string; appointment_date: string; status: string; child_name?: string; therapist_name?: string }[]> {
    return query<{ id: string; start_time: string; end_time: string; appointment_date: string; status: string; child_name: string; therapist_name: string }>(
        `SELECT a.id, a.start_time, a.end_time, a.appointment_date, a.status, 
                (c.first_name || ' ' || c.last_name) as child_name,
                u.full_name as therapist_name
         FROM appointments a
         JOIN children c ON a.child_id = c.id
         JOIN users u ON a.therapist_id = u.id
         WHERE a.therapist_id = $1 AND a.appointment_date = $2 AND a.status IN ('pending', 'approved', 'completed')`,
        [therapistId, date]
    );
}

export async function count(filters: {
    status?: string | string[];
    therapistId?: string;
    childId?: string;
    parentId?: string;
} = {}): Promise<number> {
    const params: unknown[] = [];
    let sql = `
    SELECT COUNT(*)::int as count
    FROM appointments a
    `;

    if (filters.parentId) {
        sql += ` JOIN children c ON a.child_id = c.id `;
    }

    sql += ` WHERE 1=1 `;

    if (filters.status) {
        if (Array.isArray(filters.status)) {
            params.push(filters.status);
            sql += ` AND a.status = ANY($${params.length})`;
        } else {
            params.push(filters.status);
            sql += ` AND a.status = $${params.length}`;
        }
    }
    if (filters.therapistId) {
        params.push(filters.therapistId);
        sql += ` AND a.therapist_id = $${params.length}`;
    }
    if (filters.childId) {
        params.push(filters.childId);
        sql += ` AND a.child_id = $${params.length}`;
    }
    if (filters.parentId) {
        params.push(filters.parentId);
        sql += ` AND c.user_id = $${params.length}`;
    }

    const row = await queryOne<{ count: number }>(sql, params);
    return row?.count ?? 0;
}

export async function remove(id: string): Promise<boolean> {
    console.log('[appointmentsService.remove] executing DELETE for id:', id);
    const result = await query(
        'DELETE FROM appointments WHERE id = $1 RETURNING id',
        [id]
    );
    console.log('[appointmentsService.remove] rows deleted:', result.length);
    return result.length > 0;
}
