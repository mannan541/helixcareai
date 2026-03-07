import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';

const OLLAMA_GENERATE_URL = `${env.OLLAMA_URL.replace(/\/$/, '')}/api/generate`;
const MODEL = env.OLLAMA_MODEL;

const SYSTEM_PROMPT = `You are a therapy assistant helping therapists and parents understand a child's therapy progress and profile.
Use the Child Profile and Therapy Notes below to answer the question accurately.
Answer clearly and professionally.`;

function buildPrompt(context: string, question: string, childProfile?: string): string {
  const profileSection =
    childProfile && childProfile.trim()
      ? `Child Profile (use this to answer questions about the child's details, diagnosis, status, therapies, etc.):
${childProfile.trim()}

`
      : '';
  return `${SYSTEM_PROMPT}

${profileSection}Therapy Notes (session notes and progress):
${context || 'No therapy notes available for this child.'}

Question:
${question}`;
}

export type GenerateOptions = {
  model?: string;
  maxTokens?: number;
  /** Child profile text (details, diagnosis, status, etc.) for the AI to use when answering. */
  childProfile?: string;
};

/**
 * Call local Ollama API to generate a response given question and context (RAG).
 */
export async function askLLM(
  question: string,
  context: string,
  options: GenerateOptions = {}
): Promise<string> {
  const prompt = buildPrompt(context, question, options?.childProfile);
  const model = options?.model ?? MODEL;
  try {
    const { data } = await axios.post<{ response?: string; error?: string; done?: boolean }>(
      OLLAMA_GENERATE_URL,
      {
        model,
        prompt,
        stream: false,
        options: {
          num_predict: options.maxTokens ?? 500,
        },
      },
      {
        timeout: 120_000,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );
    if (data.error) {
      throw new Error(data.error);
    }
    const answer = (data.response ?? '').trim();
    return answer || 'No response generated.';
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const e = err as AxiosError<{ error?: string }>;
      let message = e.response?.data?.error ?? e.message ?? 'Ollama request failed';
      if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
        message = 'Ollama is not running. Start it with: ollama serve. Then run: ollama pull llama3';
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        message = 'Ollama took too long to respond. Make sure llama3 is pulled (ollama pull llama3).';
      }
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = e.response?.status ?? 502;
      throw error;
    }
    throw err;
  }
}
