import { query } from '../../config/database';
import * as childrenService from '../children/children.service';
import * as ragService from '../ai/ragService';

export type ChatLogRow = {
  id: string;
  user_id: string;
  child_id: string;
  role: string;
  content: string;
  created_at: string;
};

export async function addLog(
  userId: string,
  childId: string | null,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatLogRow> {
  const rows = await query<ChatLogRow>(
    `INSERT INTO chat_logs (user_id, child_id, role, content) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, childId, role, content]
  );
  return rows[0];
}

export async function getHistory(userId: string, childId: string | null, limit: number = 50) {
  if (childId) {
    return query<ChatLogRow>(
      `SELECT id, user_id, child_id, role, content, created_at
       FROM chat_logs WHERE user_id = $1 AND child_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [userId, childId, limit]
    );
  }
  return query<ChatLogRow>(
    `SELECT id, user_id, child_id, role, content, created_at
     FROM chat_logs WHERE user_id = $1 AND child_id IS NULL
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function ask(
  userId: string,
  role: string,
  childId: string | null,
  question: string
): Promise<{ answer: string }> {
  if (!childId) {
    // Global mode: get all children accessible by this user
    const { rows } = await childrenService.findByUserId(userId, role);
    const childIds = rows.map((c: childrenService.ChildRow) => c.id);
    await addLog(userId, null, 'user', question);
    const answer = await ragService.askGlobalAssistant(childIds, question, { topK: 7 });
    await addLog(userId, null, 'assistant', answer);
    return { answer };
  }


  const child = await childrenService.findById(childId);
  if (!child) {
    throw Object.assign(new Error('Child not found'), { statusCode: 404 });
  }
  if (!childrenService.canAccessChild(child.user_id, userId, role)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  await addLog(userId, childId, 'user', question);
  const answer = await ragService.askChildAssistant(childId, question, { topK: 5 });
  await addLog(userId, childId, 'assistant', answer);
  return { answer };
}

