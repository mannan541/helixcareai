import { api } from './client';

export type TimelineItemType =
  | 'appointment'
  | 'session'
  | 'attendance'
  | 'comment'
  | 'assessment'
  | 'goal_achievement';

export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  occurredAt: string;
  title: string;
  summary: string | null;
  meta: Record<string, unknown>;
  actor: { id: string; fullName: string; role?: string } | null;
};

export type TimelineResult = {
  items: TimelineItem[];
  total: number;
  counts: Record<TimelineItemType, number>;
};

export async function getChildTimeline(
  childId: string,
  params?: {
    limit?: number;
    offset?: number;
    types?: TimelineItemType[];
    from?: string;
    to?: string;
  }
): Promise<TimelineResult> {
  const { data } = await api.get<TimelineResult>(`/api/children/${childId}/timeline`, {
    params: {
      limit: params?.limit,
      offset: params?.offset,
      from: params?.from,
      to: params?.to,
      types: params?.types?.join(','),
    },
  });
  return data;
}
