import { Request, Response } from 'express';
import * as appointmentsService from './appointments.service';

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

        // If parent, restrict to their children (this should be handled more strictly in a real app)
        // For now we assume the frontend sends correct childId or we can filter here.

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
