import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

const SYSTEM_PROMPT = `You are a therapy assistant helping therapists and parents understand a child's therapy progress and profile.
Use the Child Profile and Therapy Notes below to answer the question accurately.
Answer clearly and professionally.`;

function buildSystemContent(context: string, childProfile?: string): string {
  const profileSection =
    childProfile && childProfile.trim()
      ? `Child Profile (use this to answer questions about the child's details, diagnosis, status, therapies, etc.):
${childProfile.trim()}

`
      : '';
  return `${SYSTEM_PROMPT}

${profileSection}Therapy Notes (session notes and progress):
${context || 'No therapy notes available for this child.'}`;
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
      maxOutputTokens: options?.maxTokens ?? 500,
      temperature: 0.3,
    },
  });
  const text = response.text?.trim() ?? '';
  return text || 'No response generated.';
}

export function isConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
