import { api } from './client';
import type { SessionMetric } from './types';

export async function childMetrics(childId: string): Promise<SessionMetric[]> {
  const { data } = await api.get(`/api/analytics/child/${childId}`);
  return data.sessions;
}
