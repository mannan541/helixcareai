import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

const SYSTEM_PROMPT = `You are a therapy assistant helping therapists, parents, and clinic admins understand a child's therapy progress and profile, and — for therapists/admins in global mode — clinic operations.
Use the Child Profile and session data below (recent sessions, metrics like engagement/focus/communication, and therapist notes) to answer accurately.
IMPORTANT: If the Session data section lists therapy sessions with notes or metrics, you MUST use that information. Never say there are "no notes" or "no session data" when sessions are provided below.
When asked about activities, list specific activities from therapist notes (bullet points, worksheets, games, speech tasks, etc.) with session dates.
When asked about performance, attendance, or progress, cite specific session dates and metric values.
When asked which goals are improving vs. stalled, compare metric values across the provided sessions chronologically (oldest to newest) and name the specific metrics/goals that moved and the direction — don't just describe the latest session.
You may also be given a "Clinic operations summary" listing therapist-level statistics (sessions, documentation completion, average duration, children assigned, goals-updated rate, parent feedback, utilization) and lists of sessions missing notes or children with stale goals or a clinic-wide summary (revenue, cancellations). When present, use it directly to answer operational/administrative questions (e.g. which therapist has the highest documentation completion rate, which sessions are missing notes, what was revenue this period) — don't say this data is unavailable if it's provided below. This summary is given in two time windows (a recent lookback window and all-time); if the question implies a specific period, pick the closer-matching window and say which one you used.
Answer clearly and professionally in English. Format any dates in English (e.g. 4 Mar 2025, 2:30 PM).`;

function buildSystemContent(context: string, childProfile?: string): string {
  const profileSection =
    childProfile && childProfile.trim()
      ? `Child Profile (use this to answer questions about the child's details, diagnosis, status, therapies, etc.):
${childProfile.trim()}

`
      : '';
  return `${SYSTEM_PROMPT}

${profileSection}Session data (recent sessions, metrics, and relevant records):
${context || 'No session data indexed yet for this child. Encourage logging sessions with metrics and notes.'}`;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('Gemini is not configured. Set GEMINI_API_KEY in your env.');
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export type GenerateOptions = {
  model?: string;
  maxTokens?: number;
  childProfile?: string;
};

/**
 * Call Google Gemini API for RAG chat. Used as fallback when Groq fails or is not configured.
 */
export async function askLLM(
  question: string,
  context: string,
  options: GenerateOptions = {}
): Promise<string> {
  const ai = getClient();
  const model = options?.model ?? env.GEMINI_MODEL;
  const systemInstruction = buildSystemContent(context, options?.childProfile);
  const response = await ai.models.generateContent({
    model,
    contents: question,
    config: {
      systemInstruction,
      maxOutputTokens: options?.maxTokens ?? 1200,
      temperature: 0.3,
    },
  });
  const text = response.text?.trim() ?? '';
  return text || 'No response generated.';
}

/** Direct system + user completion (non-RAG tasks). */
export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions & { temperature?: number } = {}
): Promise<string> {
  const ai = getClient();
  const model = options?.model ?? env.GEMINI_MODEL;
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: options?.maxTokens ?? 800,
      temperature: options?.temperature ?? 0.35,
    },
  });
  const text = response.text?.trim() ?? '';
  return text || 'No response generated.';
}

export function isConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
