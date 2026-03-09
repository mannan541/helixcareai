import { Router } from 'express';
import * as appointmentsController from './appointments.controller';
import * as clinicSlotsController from './clinic_slots.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roles';

const router = Router();

// All appointment routes require authentication
router.use(authMiddleware);

// Appointments
router.post('/', appointmentsController.createAppointment);
router.get('/', appointmentsController.listAppointments);
router.get('/slots', appointmentsController.getBookedSlots);
router.put('/:id/approve', requireRoles('admin'), appointmentsController.approveAppointment);
router.patch('/:id/status', requireRoles('admin'), appointmentsController.updateAppointmentStatus);

// Clinic slots (admin-managed available/blocked windows)
router.get('/clinic-slots', clinicSlotsController.listSlots);
router.post('/clinic-slots', requireRoles('admin'), clinicSlotsController.createSlot);
router.put('/clinic-slots/:id', requireRoles('admin'), clinicSlotsController.updateSlot);
router.delete('/clinic-slots/:id', requireRoles('admin'), clinicSlotsController.deleteSlot);

export default router;
