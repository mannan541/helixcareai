import OpenAI from 'openai';
import { query, queryOne } from '../../config/database';
import { env } from '../../config/env';

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

export async function embedText(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  const vector = response.data[0]?.embedding;
  if (!vector) throw new Error('Empty embedding response');
  return vector;
}

export async function createEmbeddingForSession(
  sessionId: string,
  childId: string,
  notesText: string
): Promise<void> {
  const embedding = await embedText(notesText);
  const vectorStr = `[${embedding.join(',')}]`;
  await query(
    `INSERT INTO embeddings (child_id, session_id, content, embedding)
     VALUES ($1, $2, $3, $4)`,
    [childId, sessionId, notesText, vectorStr]
  );
}

export async function getSimilarEmbeddings(
  childId: string,
  questionEmbedding: number[],
  limit: number = 5
): Promise<{ content: string }[]> {
  const vectorStr = `[${questionEmbedding.join(',')}]`;
  const rows = await query<{ content: string }>(
    `SELECT content FROM embeddings
     WHERE child_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [childId, vectorStr, limit]
  );
  return rows;
}

export async function generateRagResponse(
  contextParts: string[],
  question: string
): Promise<string> {
  if (!openai) {
    return 'AI is not configured. Please set OPENAI_API_KEY.';
  }
  const context = contextParts.length
    ? contextParts.join('\n\n---\n\n')
    : 'No prior session notes available for this child.';
  const systemContent = `You are a helpful assistant for autism therapy (HelixCareAI). Answer based only on the following session notes for this child. If the notes do not contain relevant information, say so. Be concise and supportive.`;
  const userContent = `Session notes (for context):\n${context}\n\nQuestion: ${question}`;
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    max_tokens: 500,
  });
  const reply = completion.choices[0]?.message?.content?.trim() ?? 'No response generated.';
  return reply;
}
