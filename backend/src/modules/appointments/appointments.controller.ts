import { Request, Response } from 'express';
import * as appointmentsService from './appointments.service';
import * as notificationsService from '../notifications/notifications.service';
import { query, queryOne } from '../../config/database';

export async function createAppointment(req: Request, res: Response) {
    try {
        const { childId, therapistId, appointmentDate, startTime, endTime } = req.body;
        const userId = (req as any).user.userId;
        const role = (req as any).user.role;

        // Admin can create approved appointments directly
        const status = role === 'admin' ? 'approved' : 'pending';

        const appointment = await appointmentsService.create({
            childId,
            therapistId,
            appointmentDate,
            startTime,
            endTime,
            status,
            createdBy: userId,
        });

        res.status(201).json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function listAppointments(req: Request, res: Response) {
    try {
        const { date, therapistId, childId, status } = req.query;
        const role = (req as any).user.role;
        const userId = (req as any).user.userId;

        const filters: any = {
            date: date as string,
            therapistId: therapistId as string,
            childId: childId as string,
            status: status as string,
        };

        if (role === 'parent') {
            filters.parentId = userId; // Secure parent list to only their children
        } else if (role === 'therapist') {
            filters.therapistId = userId; // Secure therapist list to only their schedule
        }

        const appointments = await appointmentsService.list(filters);
        res.json({ appointments });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function approveAppointment(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const adminId = (req as any).user.userId;

        // Only admin can approve
        if ((req as any).user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can approve appointments' });
        }

        const appointment = await appointmentsService.updateStatus(id, 'approved', adminId);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function getBookedSlots(req: Request, res: Response) {
    try {
        const { therapistId, date } = req.query;
        if (!therapistId || !date) {
            return res.status(400).json({ error: 'therapistId and date are required' });
        }
        const slots = await appointmentsService.getBookedSlots(therapistId as string, date as string);
        res.json({ slots });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateAppointmentStatus(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const adminId = (req as any).user.userId;

        if (!['approved', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const appointment = await appointmentsService.updateStatus(id, status, adminId);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateAppointment(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { appointmentDate, startTime, endTime, therapistId } = req.body;
        const role = (req as any).user.role;

        if (role !== 'admin' && role !== 'parent') {
            return res.status(403).json({ error: 'Only admins and parents can reschedule appointments' });
        }

        const isParent = role === 'parent';

        let queryStr = `UPDATE appointments SET appointment_date = $1, start_time = $2, end_time = $3, therapist_id = $4, updated_at = NOW() WHERE id = $5 AND deleted_at IS NULL RETURNING *`;

        if (isParent) {
            queryStr = `UPDATE appointments SET appointment_date = $1, start_time = $2, end_time = $3, therapist_id = $4, status = 'pending', updated_at = NOW() WHERE id = $5 AND deleted_at IS NULL RETURNING *`;
        }

        const rows = await query(queryStr, [appointmentDate, startTime, endTime, therapistId, id]);
        const appointment: any = rows[0];
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const child = await queryOne<{ user_id: string, first_name: string }>(`SELECT user_id, first_name FROM children WHERE id = $1`, [appointment.child_id]);

        if (isParent && child) {
            const admins = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'admin' AND is_active = true`);
            await notificationsService.createForUsers(
                admins.map(a => a.id),
                'signup_pending_approval' as any,
                'Reschedule Request',
                `A parent requested to reschedule an appointment for ${child.first_name} to ${appointmentDate} at ${startTime}. Please check your dashboard.`
            );
        } else if (!isParent && child) {
            await notificationsService.create(
                child.user_id,
                'session_logged_for_parent' as any,
                'Appointment Rescheduled',
                `Admin has rescheduled the appointment for ${child.first_name} to ${appointmentDate} at ${startTime}.`
            );
        }

        res.json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
