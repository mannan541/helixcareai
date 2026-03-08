import OpenAI from 'openai';
import { env } from '../../config/env';

const groq =
  env.GROQ_API_KEY ?
    new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const SYSTEM_PROMPT = `You are a therapy assistant helping therapists and parents understand a child's therapy progress and profile.
Use the Child Profile and Therapy Notes below to answer the question accurately.
Answer clearly and professionally.`;

function buildMessages(context: string, question: string, childProfile?: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const profileSection =
    childProfile && childProfile.trim()
      ? `Child Profile (use this to answer questions about the child's details, diagnosis, status, therapies, etc.):
${childProfile.trim()}

`
      : '';
  const systemContent = `${SYSTEM_PROMPT}

${profileSection}Therapy Notes (session notes and progress):
${context || 'No therapy notes available for this child.'}`;
  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: question },
  ];
}

export type GenerateOptions = {
  model?: string;
  maxTokens?: number;
  childProfile?: string;
};

/**
 * Call Groq Cloud API (OpenAI-compatible) for RAG chat. Use when GROQ_API_KEY is set.
 */
export async function askLLM(
  question: string,
  context: string,
  options: GenerateOptions = {}
): Promise<string> {
  if (!groq) {
    throw new Error('Groq is not configured. Set GROQ_API_KEY in your env.');
  }
  const model = options?.model ?? env.GROQ_MODEL;
  const messages = buildMessages(context, question, options?.childProfile);
  const completion = await groq.chat.completions.create({
    model,
    messages,
    max_tokens: options?.maxTokens ?? 500,
    temperature: 0.3,
  });
  const answer = (completion.choices[0]?.message?.content ?? '').trim();
  return answer || 'No response generated.';
}

export function isConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY);
}
