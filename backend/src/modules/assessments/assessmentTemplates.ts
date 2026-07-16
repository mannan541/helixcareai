export type AssessmentTypeId =
  | 'adhd_rating_scale'
  | 'vanderbilt'
  | 'social_responsiveness_scale'
  | 'autism_checklist';

export type QuestionInputType = 'likert_0_3' | 'likert_1_4' | 'yes_no' | 'performance_1_5';

export type AssessmentQuestion = {
  id: string;
  text: string;
  subscale?: string;
};

export type AssessmentTemplate = {
  id: AssessmentTypeId;
  name: string;
  shortName: string;
  description: string;
  respondentOptions: string[];
  inputType: QuestionInputType;
  questions: AssessmentQuestion[];
  reference: string;
};

const ADHD_SYMPTOMS: AssessmentQuestion[] = [
  { id: 'inatt_1', subscale: 'Inattention', text: 'Fails to give close attention to details or makes careless mistakes' },
  { id: 'inatt_2', subscale: 'Inattention', text: 'Has difficulty sustaining attention in tasks or play activities' },
  { id: 'inatt_3', subscale: 'Inattention', text: 'Does not seem to listen when spoken to directly' },
  { id: 'inatt_4', subscale: 'Inattention', text: 'Does not follow through on instructions and fails to finish tasks' },
  { id: 'inatt_5', subscale: 'Inattention', text: 'Has difficulty organizing tasks and activities' },
  { id: 'inatt_6', subscale: 'Inattention', text: 'Avoids or dislikes tasks requiring sustained mental effort' },
  { id: 'inatt_7', subscale: 'Inattention', text: 'Loses things necessary for tasks or activities' },
  { id: 'inatt_8', subscale: 'Inattention', text: 'Is easily distracted by extraneous stimuli' },
  { id: 'inatt_9', subscale: 'Inattention', text: 'Is forgetful in daily activities' },
  { id: 'hyp_1', subscale: 'Hyperactivity-Impulsivity', text: 'Fidgets with hands or feet or squirms in seat' },
  { id: 'hyp_2', subscale: 'Hyperactivity-Impulsivity', text: 'Leaves seat when remaining seated is expected' },
  { id: 'hyp_3', subscale: 'Hyperactivity-Impulsivity', text: 'Runs about or climbs excessively in inappropriate situations' },
  { id: 'hyp_4', subscale: 'Hyperactivity-Impulsivity', text: 'Has difficulty playing or engaging in leisure activities quietly' },
  { id: 'hyp_5', subscale: 'Hyperactivity-Impulsivity', text: 'Is "on the go" or acts as if "driven by a motor"' },
  { id: 'hyp_6', subscale: 'Hyperactivity-Impulsivity', text: 'Talks excessively' },
  { id: 'hyp_7', subscale: 'Hyperactivity-Impulsivity', text: 'Blurts out answers before questions have been completed' },
  { id: 'hyp_8', subscale: 'Hyperactivity-Impulsivity', text: 'Has difficulty awaiting turn' },
  { id: 'hyp_9', subscale: 'Hyperactivity-Impulsivity', text: 'Interrupts or intrudes on others' },
];

const VANDERBILT_PERFORMANCE: AssessmentQuestion[] = [
  { id: 'perf_1', subscale: 'Performance', text: 'Overall school performance' },
  { id: 'perf_2', subscale: 'Performance', text: 'Reading' },
  { id: 'perf_3', subscale: 'Performance', text: 'Writing' },
  { id: 'perf_4', subscale: 'Performance', text: 'Mathematics' },
  { id: 'perf_5', subscale: 'Performance', text: 'Relationship with peers' },
  { id: 'perf_6', subscale: 'Performance', text: 'Participation in organized activities' },
  { id: 'perf_7', subscale: 'Performance', text: 'Relationship with parents' },
  { id: 'perf_8', subscale: 'Performance', text: 'Relationship with siblings' },
];

const SRS_ITEMS: AssessmentQuestion[] = [
  { id: 'srs_1', text: 'Seems much more fidgety in social situations than when alone' },
  { id: 'srs_2', text: 'Expressions on face do not match what is being said' },
  { id: 'srs_3', text: 'Knows when it is time to talk and when to listen' },
  { id: 'srs_4', text: 'Is able to communicate feelings to others' },
  { id: 'srs_5', text: 'Avoids eye contact or has unusual eye contact' },
  { id: 'srs_6', text: 'Concentrates too much on parts of things rather than seeing the whole' },
  { id: 'srs_7', text: 'Is overly sensitive to sounds, lights, or textures' },
  { id: 'srs_8', text: 'Resists changes in routine or environment' },
  { id: 'srs_9', text: 'Has difficulty making friends' },
  { id: 'srs_10', text: 'Shows little interest in peers' },
  { id: 'srs_11', text: 'Has difficulty understanding the feelings of others' },
  { id: 'srs_12', text: 'Does not respond when name is called' },
  { id: 'srs_13', text: 'Has unusually narrow range of interests' },
  { id: 'srs_14', text: 'Repeats words or phrases over and over' },
  { id: 'srs_15', text: 'Has repetitive body movements or mannerisms' },
];

const AUTISM_CHECKLIST: AssessmentQuestion[] = [
  { id: 'ac_1', text: 'Does your child enjoy being swung, bounced on your knee, etc.?' },
  { id: 'ac_2', text: 'Does your child take an interest in other children?' },
  { id: 'ac_3', text: 'Does your child like climbing on things?' },
  { id: 'ac_4', text: 'Does your child enjoy playing peek-a-boo or hide-and-seek?' },
  { id: 'ac_5', text: 'Does your child ever pretend, for example, to talk on the phone?' },
  { id: 'ac_6', text: 'Does your child ever use his/her index finger to point, to ask for something?' },
  { id: 'ac_7', text: 'Does your child ever use his/her index finger to point, to indicate interest?' },
  { id: 'ac_8', text: 'Can your child play properly with small toys without mouthing or dropping them?' },
  { id: 'ac_9', text: 'Does your child ever bring objects over to you to show you something?' },
  { id: 'ac_10', text: 'Does your child look you in the eye for more than a second or two?' },
  { id: 'ac_11', text: 'Does your child seem overly sensitive to noise?' },
  { id: 'ac_12', text: 'Does your child get upset by everyday noises?' },
  { id: 'ac_13', text: 'Does your child walk?' },
  { id: 'ac_14', text: 'Does your child look at your face to check your reaction when faced with something unfamiliar?' },
  { id: 'ac_15', text: 'Does your child try to attract your attention to his/her own activity?' },
  { id: 'ac_16', text: 'Does your child understand when you tell him/her to do something?' },
  { id: 'ac_17', text: 'If something new happens, does your child look at your face?' },
  { id: 'ac_18', text: 'Does your child like movement activities?' },
  { id: 'ac_19', text: 'Does your child make unusual finger movements near his/her face?' },
  { id: 'ac_20', text: 'Does your child try to get you to watch him/her?' },
];

export const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: 'adhd_rating_scale',
    name: 'ADHD Rating Scale',
    shortName: 'ADHD-RS',
    description:
      'DSM-based ADHD symptom checklist rated 0–3 (Never to Very Often). Used to screen inattention and hyperactivity-impulsivity.',
    respondentOptions: ['Parent', 'Teacher', 'Clinician'],
    inputType: 'likert_0_3',
    questions: ADHD_SYMPTOMS,
    reference: 'Based on DSM-5 ADHD symptom criteria (abbreviated screening form).',
  },
  {
    id: 'vanderbilt',
    name: 'Vanderbilt Assessment',
    shortName: 'Vanderbilt',
    description:
      'ADHD symptom scales plus performance impairment items. Positive screen suggests further clinical evaluation.',
    respondentOptions: ['Parent', 'Teacher'],
    inputType: 'likert_0_3',
    questions: [...ADHD_SYMPTOMS, ...VANDERBILT_PERFORMANCE.map((q) => ({ ...q, subscale: 'Performance' }))],
    reference: 'NICHQ Vanderbilt Assessment Scales (abbreviated screening version).',
  },
  {
    id: 'social_responsiveness_scale',
    name: 'Social Responsiveness Scale',
    shortName: 'SRS',
    description:
      'Measures social communication and restricted/repetitive behaviors on a 1–4 Likert scale.',
    respondentOptions: ['Parent', 'Teacher', 'Clinician'],
    inputType: 'likert_1_4',
    questions: SRS_ITEMS,
    reference: 'SRS-2 inspired items (abbreviated screening subset).',
  },
  {
    id: 'autism_checklist',
    name: 'Autism Checklist',
    shortName: 'Autism Screen',
    description:
      'Yes/No developmental screening checklist for autism spectrum concerns (M-CHAT inspired).',
    respondentOptions: ['Parent', 'Caregiver', 'Clinician'],
    inputType: 'yes_no',
    questions: AUTISM_CHECKLIST,
    reference: 'M-CHAT-R inspired screening checklist (abbreviated).',
  },
];

export function getTemplate(typeId: string): AssessmentTemplate | undefined {
  return ASSESSMENT_TEMPLATES.find((t) => t.id === typeId);
}

export function isValidAssessmentType(typeId: string): typeId is AssessmentTypeId {
  return ASSESSMENT_TEMPLATES.some((t) => t.id === typeId);
}
