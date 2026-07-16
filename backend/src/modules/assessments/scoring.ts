import type { AssessmentTemplate, AssessmentTypeId } from './assessmentTemplates';
import { getTemplate } from './assessmentTemplates';

export type AssessmentScores = {
  total?: number;
  subscales?: Record<string, number>;
  positiveScreen?: boolean;
  riskLevel?: 'low' | 'moderate' | 'high';
  interpretation: string;
};

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function countSymptomsAtOrAbove(
  template: AssessmentTemplate,
  responses: Record<string, unknown>,
  subscale: string,
  threshold: number
): number {
  return template.questions
    .filter((q) => q.subscale === subscale)
    .filter((q) => {
      const v = num(responses[q.id]);
      return v != null && v >= threshold;
    }).length;
}

function sumResponses(template: AssessmentTemplate, responses: Record<string, unknown>, filter?: (q: { subscale?: string }) => boolean): number {
  return template.questions
    .filter((q) => !filter || filter(q))
    .reduce((sum, q) => sum + (num(responses[q.id]) ?? 0), 0);
}

export function scoreAssessment(
  typeId: AssessmentTypeId,
  responses: Record<string, unknown>
): AssessmentScores {
  const template = getTemplate(typeId);
  if (!template) return { interpretation: 'Unknown assessment type.' };

  switch (typeId) {
    case 'adhd_rating_scale': {
      const inattention = sumResponses(template, responses, (q) => q.subscale === 'Inattention');
      const hyperactivity = sumResponses(template, responses, (q) => q.subscale === 'Hyperactivity-Impulsivity');
      const inattCount = countSymptomsAtOrAbove(template, responses, 'Inattention', 2);
      const hypCount = countSymptomsAtOrAbove(template, responses, 'Hyperactivity-Impulsivity', 2);
      const total = inattention + hyperactivity;
      const positiveScreen = inattCount >= 6 || hypCount >= 6;
      let interpretation = `Total score: ${total}/54. `;
      if (positiveScreen) {
        interpretation +=
          inattCount >= 6 && hypCount >= 6
            ? 'Combined presentation suggested — significant inattention and hyperactivity-impulsivity symptoms.'
            : inattCount >= 6
              ? 'Predominantly inattentive presentation suggested — further clinical evaluation recommended.'
              : 'Predominantly hyperactive-impulsive presentation suggested — further clinical evaluation recommended.';
      } else {
        interpretation += 'Does not meet screening threshold for ADHD — symptoms below clinical cutoff.';
      }
      return {
        total,
        subscales: { inattention, hyperactivity: hyperactivity },
        positiveScreen,
        riskLevel: positiveScreen ? 'high' : total >= 18 ? 'moderate' : 'low',
        interpretation,
      };
    }
    case 'vanderbilt': {
      const inattCount = countSymptomsAtOrAbove(template, responses, 'Inattention', 2);
      const hypCount = countSymptomsAtOrAbove(template, responses, 'Hyperactivity-Impulsivity', 2);
      const perfItems = template.questions.filter((q) => q.subscale === 'Performance');
      const perfProblem = perfItems.filter((q) => {
        const v = num(responses[q.id]);
        return v != null && v >= 4;
      }).length;
      const symptomPositive = inattCount >= 6 || hypCount >= 6;
      const perfPositive = perfProblem >= 2;
      const positiveScreen = symptomPositive && perfPositive;
      let interpretation = `Inattention symptoms (≥2 rated Often/Very Often): ${inattCount}/9. Hyperactivity symptoms: ${hypCount}/9. Performance concerns: ${perfProblem}/${perfItems.length}. `;
      interpretation += positiveScreen
        ? 'Positive Vanderbilt screen — ADHD symptoms with functional impairment. Refer for comprehensive evaluation.'
        : symptomPositive
          ? 'ADHD symptoms elevated but performance impairment threshold not met — monitor and re-screen.'
          : 'Negative screen on Vanderbilt symptom scales.';
      const total = sumResponses(template, responses, (q) => q.subscale !== 'Performance');
      return {
        total,
        subscales: { inattentionSymptoms: inattCount, hyperactivitySymptoms: hypCount, performanceConcerns: perfProblem },
        positiveScreen,
        riskLevel: positiveScreen ? 'high' : symptomPositive ? 'moderate' : 'low',
        interpretation,
      };
    }
    case 'social_responsiveness_scale': {
      const total = sumResponses(template, responses);
      const max = template.questions.length * 4;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation: string;
      if (total >= Math.round(max * 0.7)) {
        riskLevel = 'high';
        interpretation = `SRS raw score ${total}/${max} — severe social communication difficulties suggested. Comprehensive ASD evaluation recommended.`;
      } else if (total >= Math.round(max * 0.55)) {
        riskLevel = 'moderate';
        interpretation = `SRS raw score ${total}/${max} — moderate social communication concerns. Consider specialist referral.`;
      } else if (total >= Math.round(max * 0.4)) {
        riskLevel = 'moderate';
        interpretation = `SRS raw score ${total}/${max} — mild social communication differences noted. Monitor and follow up as needed.`;
      } else {
        interpretation = `SRS raw score ${total}/${max} — within expected range on this screening subset.`;
      }
      return { total, riskLevel, positiveScreen: riskLevel === 'high', interpretation };
    }
    case 'autism_checklist': {
      const fails = template.questions.filter((q) => {
        const v = String(responses[q.id] ?? '').toLowerCase();
        return v === 'no' || v === 'false';
      }).length;
      const positiveScreen = fails >= 3;
      const interpretation = positiveScreen
        ? `${fails} at-risk responses — positive autism screening. Recommend developmental evaluation and M-CHAT-R follow-up.`
        : `${fails} at-risk responses — low concern on this screening checklist. Continue routine monitoring.`;
      return {
        total: fails,
        positiveScreen,
        riskLevel: fails >= 5 ? 'high' : fails >= 3 ? 'moderate' : 'low',
        interpretation,
      };
    }
    default:
      return { interpretation: 'Unable to score assessment.' };
  }
}

/** Vanderbilt performance items use 1–5 scale; override input type per question in UI */
export function inputTypeForQuestion(template: AssessmentTemplate, questionId: string): string {
  if (template.id === 'vanderbilt' && questionId.startsWith('perf_')) return 'performance_1_5';
  return template.inputType;
}
