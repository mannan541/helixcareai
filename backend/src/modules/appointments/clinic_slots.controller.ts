import { Request, Response } from 'express';
import * as slotsService from './clinic_slots.service';

export async function listSlots(req: Request, res: Response) {
    try {
        const { day } = req.query;
        let slots;
        if (day !== undefined) {
            slots = await slotsService.getActiveSlotsForDay(Number(day));
        } else {
            slots = await slotsService.listSlots();
        }
        res.json({ slots });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function createSlot(req: Request, res: Response) {
    try {
        const { label, startTime, endTime, slotType, dayOfWeek } = req.body;
        if (!label || !startTime || !endTime) {
            res.status(400).json({ error: 'label, startTime and endTime are required' });
            return;
        }
        const adminId = (req as any).user.userId;
        const slot = await slotsService.createSlot({
            label,
            startTime,
            endTime,
            slotType,
            dayOfWeek,
            createdBy: adminId,
        });
        res.status(201).json({ slot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateSlot(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { label, startTime, endTime, slotType, dayOfWeek, isActive } = req.body;
        const slot = await slotsService.updateSlot(id, {
            label,
            startTime,
            endTime,
            slotType,
            dayOfWeek,
            isActive,
        });
        if (!slot) {
            res.status(404).json({ error: 'Slot not found' });
            return;
        }
        res.json({ slot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteSlot(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const deleted = await slotsService.deleteSlot(id);
        if (!deleted) {
            res.status(404).json({ error: 'Slot not found' });
            return;
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
