import { api } from './client';
import type { Appointment, ClinicSlot } from './types';

export async function listAppointments(params?: {
  date?: string;
  therapistId?: string;
  childId?: string;
  status?: string;
}): Promise<Appointment[]> {
  const { data } = await api.get('/api/appointments', { params });
  return data.appointments;
}

export async function createAppointment(input: {
  childId: string;
  therapistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}): Promise<Appointment> {
  const { data } = await api.post('/api/appointments', input);
  return data.appointment;
}

export async function updateAppointment(
  id: string,
  input: { appointmentDate: string; startTime: string; endTime: string; therapistId: string }
): Promise<Appointment> {
  const { data } = await api.put(`/api/appointments/${id}`, input);
  return data.appointment;
}

export async function approveAppointment(id: string): Promise<Appointment> {
  const { data } = await api.put(`/api/appointments/${id}/approve`);
  return data.appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: 'approved' | 'completed' | 'cancelled'
): Promise<Appointment> {
  const { data } = await api.patch(`/api/appointments/${id}/status`, { status });
  return data.appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.delete(`/api/appointments/${id}`);
}

export async function getBookedSlots(therapistId: string, date: string): Promise<Appointment[]> {
  const { data } = await api.get('/api/appointments/slots', { params: { therapistId, date } });
  return data.slots;
}

export async function listClinicSlots(day?: number): Promise<ClinicSlot[]> {
  const { data } = await api.get('/api/appointments/clinic-slots', {
    params: day !== undefined ? { day } : undefined,
  });
  return data.slots;
}

export async function createClinicSlot(input: {
  label: string;
  startTime: string;
  endTime: string;
  slotType?: 'available' | 'blocked';
  dayOfWeek?: number[] | null;
}): Promise<ClinicSlot> {
  const { data } = await api.post('/api/appointments/clinic-slots', input);
  return data.slot;
}

export async function updateClinicSlot(
  id: string,
  input: Partial<{
    label: string;
    startTime: string;
    endTime: string;
    slotType: 'available' | 'blocked';
    dayOfWeek: number[] | null;
    isActive: boolean;
  }>
): Promise<ClinicSlot> {
  const { data } = await api.put(`/api/appointments/clinic-slots/${id}`, input);
  return data.slot;
}

export async function deleteClinicSlot(id: string): Promise<void> {
  await api.delete(`/api/appointments/clinic-slots/${id}`);
}
