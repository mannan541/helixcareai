import { api } from './client';
import type { User } from './types';

export async function adminDashboardCounts(): Promise<{
  children: number;
  therapists: number;
  parents: number;
  admins: number;
  totalUsers: number;
  pendingUsers: number;
  clinicSlots: number;
  pendingAppointments: number;
  totalAppointments: number;
}> {
  const { data } = await api.get('/api/admin/dashboard/counts');
  return data;
}

export async function listUsers(params: {
  role?: string;
  q?: string;
  pending?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ users: User[]; total: number }> {
  const { data } = await api.get('/api/admin/users', {
    params: { ...params, pending: params.pending ? 'true' : undefined },
  });
  return data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get(`/api/admin/users/${id}`);
  return data.user ?? data;
}

export async function createUser(input: {
  email: string;
  fullName: string;
  role: 'therapist' | 'parent';
  title?: string;
  childIds?: string[];
}): Promise<{ user: User; message?: string }> {
  const { data } = await api.post('/api/admin/users', input);
  return data;
}

export async function updateUser(
  id: string,
  input: {
    fullName?: string;
    title?: string | null;
    password?: string;
    childIds?: string[];
    mobileNumber?: string | null;
    showMobileToParents?: boolean;
  }
): Promise<User> {
  const { data } = await api.patch(`/api/admin/users/${id}`, input);
  return data.user ?? data;
}

export async function approveUser(id: string): Promise<void> {
  await api.put(`/api/admin/users/${id}/approve`);
}

export async function disableUser(id: string): Promise<void> {
  await api.put(`/api/admin/users/${id}/disable`);
}

export async function enableUser(id: string): Promise<void> {
  await api.put(`/api/admin/users/${id}/enable`);
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}
