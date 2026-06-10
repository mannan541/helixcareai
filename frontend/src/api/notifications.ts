import { api } from './client';
import type { AppNotification } from './types';

export async function listNotifications(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{ notifications: AppNotification[]; total: number }> {
  const { data } = await api.get('/api/notifications', {
    params: { limit: 50, ...params, unreadOnly: params?.unreadOnly ? 'true' : undefined },
  });
  return data;
}

export async function unreadCount(): Promise<number> {
  const { data } = await api.get('/api/notifications/unread-count');
  return data.count;
}

export async function markRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.post('/api/notifications/read-all');
}
