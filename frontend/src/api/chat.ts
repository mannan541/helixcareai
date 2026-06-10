import { api } from './client';
import type { ChatMessage } from './types';

export async function chatHistory(childId: string | null, limit = 50): Promise<ChatMessage[]> {
  const id = childId ?? 'global';
  const { data } = await api.get(`/api/chat/history/${id}`, { params: { limit } });
  return data.messages;
}

export async function chatAsk(childId: string | null, question: string): Promise<string> {
  const { data } = await api.post('/api/chat/ask', { childId, question });
  return data.answer;
}
