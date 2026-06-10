import { api } from './client';
import type { User } from './types';

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data;
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
  role: string;
}): Promise<{ user: User; message?: string }> {
  const { data } = await api.post('/api/auth/register', input);
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get('/api/auth/me');
  return data.user;
}

export async function updateProfile(input: {
  fullName?: string;
  password?: string;
  currentPassword?: string;
  mobileNumber?: string | null;
  showMobileToParents?: boolean;
}): Promise<User> {
  const { data } = await api.patch('/api/auth/profile', input);
  return data.user;
}

export async function dashboardCounts(): Promise<{
  children: number;
  sessions: number;
  totalAppointments: number;
  pendingAppointments: number;
}> {
  const { data } = await api.get('/api/auth/dashboard/counts');
  return data;
}

export async function listTherapists(q?: string): Promise<User[]> {
  const { data } = await api.get('/api/auth/therapists', { params: { q, limit: 100 } });
  return data.users;
}
