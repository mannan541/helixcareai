import * as childrenService from '../children/children.service';
import * as groqService from './groqService';
import * as geminiService from './geminiService';

export type ParentNotesConversion = {
  parentSummary: string;
  progressUpdate: string;
  homeRecommendations: string;
};

export const PARENT_NOTE_KEYS = ['parentSummary', 'progressUpdate', 'homeRecommendations'] as const;

const SYSTEM_PROMPT = `You convert clinical therapist session notes into warm, parent-friendly language for families of children in autism therapy.

Output ONLY valid JSON with exactly these keys (no markdown, no extra text):
- parentSummary: 2-3 sentences describing what happened today in plain language parents understand
- progressUpdate: 1-2 sentences on progress or observations, encouraging and specific when possible
- homeRecommendations: 1-2 actionable tips for parents to continue skills at home

Rules:
- Use the child's first name naturally when provided
- Avoid clinical jargon (e.g. "receptive language", "visual prompts") — use everyday words like "picture cards", "following instructions", "paying attention"
- Be specific when the notes mention activities or behaviours; do not invent facts not supported by the notes
- If notes are very brief, expand gently without making up clinical details
- Write in clear, supportive English`;

function buildUserPrompt(input: {
  childFirstName: string;
  notesText: string;
  therapyTitle?: string | null;
  engagement?: number | null;
  focus?: number | null;
  communication?: number | null;
}): string {
  const lines: string[] = [`Child's first name: ${input.childFirstName}`, '', 'Therapist notes (clinical):', input.notesText.trim()];
  if (input.therapyTitle) lines.push('', `Therapy type: ${input.therapyTitle}`);
  const scores: string[] = [];
  if (input.engagement != null) scores.push(`Engagement: ${input.engagement}/10`);
  if (input.focus != null) scores.push(`Focus: ${input.focus}/10`);
  if (input.communication != null) scores.push(`Communication: ${input.communication}/10`);
  if (scores.length) lines.push('', 'Session scores:', scores.join(', '));
  lines.push(
    '',
    'Example transformation:',
    'Input: "Worked on receptive language and visual prompts."',
    'Output: {"parentSummary":"Today Ahmed responded better to visual cues and was able to follow simple instructions independently.","progressUpdate":"Ahmed showed improved attention during structured activities.","homeRecommendations":"Continue using picture cards at home when giving simple instructions. Praise small successes."}'
  );
  return lines.join('\n');
}

function parseMetric(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function parseJsonResponse(raw: string): ParentNotesConversion {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const parentSummary = String(parsed.parentSummary ?? '').trim();
  const progressUpdate = String(parsed.progressUpdate ?? '').trim();
  const homeRecommendations = String(parsed.homeRecommendations ?? '').trim();

  if (!parentSummary && !progressUpdate && !homeRecommendations) {
    throw new Error('AI returned empty parent-friendly content');
  }

  return { parentSummary, progressUpdate, homeRecommendations };
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (groqService.isConfigured()) {
    try {
      return await groqService.complete(systemPrompt, userPrompt, { maxTokens: 600, temperature: 0.35 });
    } catch (err) {
      if (!geminiService.isConfigured()) throw err;
    }
  }
  if (geminiService.isConfigured()) {
    return geminiService.complete(systemPrompt, userPrompt, { maxTokens: 600, temperature: 0.35 });
  }
  throw new Error('AI is not configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
}

export async function convertTherapistNotes(input: {
  childId: string;
  notesText: string;
  therapyTitle?: string | null;
  structuredMetrics?: Record<string, unknown>;
}): Promise<ParentNotesConversion> {
  const trimmed = input.notesText?.trim();
  if (!trimmed) {
    throw new Error('Therapist notes are required to generate a parent-friendly summary');
  }

  const child = await childrenService.findById(input.childId);
  if (!child) throw new Error('Child not found');

  const firstName = (child.first_name ?? '').trim() || 'the child';
  const metrics = input.structuredMetrics ?? {};

  const raw = await callLLM(
    SYSTEM_PROMPT,
    buildUserPrompt({
      childFirstName: firstName,
      notesText: trimmed,
      therapyTitle: input.therapyTitle ?? (metrics.therapyTitle as string | undefined),
      engagement: parseMetric(metrics.engagement),
      focus: parseMetric(metrics.focus),
      communication: parseMetric(metrics.communication),
    })
  );

  return parseJsonResponse(raw);
}
