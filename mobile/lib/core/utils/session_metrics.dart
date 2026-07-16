// Session clinical metrics: therapists score 1–5; stored as 0–10 for charts and parent reports.

const coreSessionMetrics = ['engagement', 'focus', 'communication'];

const additionalSessionMetrics = [
  'followingInstructions',
  'socialInteraction',
  'emotionalRegulation',
  'taskCompletion',
  'eyeContact',
  'impulseControl',
  'transitionHandling',
  'independence',
];

const allSessionMetricKeys = [...coreSessionMetrics, ...additionalSessionMetrics];

const sessionMetaKeys = {
  'therapyTitle',
  'timeSlot',
  'parentSummary',
  'progressUpdate',
  'homeRecommendations',
};

class PickerScaleItem {
  const PickerScaleItem({required this.score, required this.label, required this.meaning});
  final int score;
  final String label;
  final String meaning;
}

const pickerScale = [
  PickerScaleItem(score: 1, label: 'Very Poor', meaning: 'Significant difficulty'),
  PickerScaleItem(score: 2, label: 'Below Expected', meaning: 'Needs substantial support'),
  PickerScaleItem(score: 3, label: 'Average', meaning: 'Moderate performance'),
  PickerScaleItem(score: 4, label: 'Good', meaning: 'Meeting expectations'),
  PickerScaleItem(score: 5, label: 'Excellent', meaning: 'Consistently demonstrated'),
];

class MetricDef {
  const MetricDef({required this.label, required this.description, required this.levels});
  final String label;
  final String description;
  final Map<int, String> levels;
}

const metricDefs = <String, MetricDef>{
  'engagement': MetricDef(
    label: 'Engagement',
    description: 'How actively the child participated in the session.',
    levels: {
      1: 'Refused activities, frequently disengaged',
      2: 'Participated only with constant prompting',
      3: 'Participated in most activities with some prompting',
      4: 'Engaged throughout with minimal prompting',
      5: 'Fully engaged and self-motivated',
    },
  ),
  'focus': MetricDef(
    label: 'Focus',
    description: 'Ability to maintain attention on tasks.',
    levels: {
      1: 'Unable to stay on task',
      2: 'Frequent redirection required',
      3: 'Moderate focus with occasional redirection',
      4: 'Good attention span',
      5: 'Sustained focus throughout activities',
    },
  ),
  'communication': MetricDef(
    label: 'Communication',
    description: 'Verbal and non-verbal communication during the session.',
    levels: {
      1: 'Very limited communication',
      2: 'Rare responses or significant support needed',
      3: 'Basic communication with support',
      4: 'Effective communication in most situations',
      5: 'Consistent and independent communication',
    },
  ),
  'followingInstructions': MetricDef(
    label: 'Following Instructions',
    description: 'Ability to understand and follow directions.',
    levels: {
      1: 'Did not follow instructions',
      2: 'Followed with repeated prompting',
      3: 'Followed simple instructions with support',
      4: 'Followed multi-step instructions with minimal help',
      5: 'Followed instructions independently',
    },
  ),
  'socialInteraction': MetricDef(
    label: 'Social Interaction',
    description: 'Interaction with therapist or peers during activities.',
    levels: {
      1: 'Avoided social interaction',
      2: 'Minimal interaction, needed encouragement',
      3: 'Some reciprocal interaction',
      4: 'Positive interaction in structured activities',
      5: 'Initiated and sustained social interaction',
    },
  ),
  'emotionalRegulation': MetricDef(
    label: 'Emotional Regulation',
    description: 'Managing emotions and recovering from frustration.',
    levels: {
      1: 'Frequent dysregulation, long recovery',
      2: 'Often upset, needed significant co-regulation',
      3: 'Some frustration, calmed with support',
      4: 'Generally regulated with brief support',
      5: 'Well-regulated throughout the session',
    },
  ),
  'taskCompletion': MetricDef(
    label: 'Task Completion',
    description: 'Finishing assigned activities or therapy tasks.',
    levels: {
      1: 'Unable to complete tasks',
      2: 'Completed fragments with heavy support',
      3: 'Completed some tasks with support',
      4: 'Completed most tasks with minimal help',
      5: 'Completed tasks independently',
    },
  ),
  'eyeContact': MetricDef(
    label: 'Eye Contact',
    description: 'Appropriate eye contact during interaction (ASD).',
    levels: {
      1: 'Avoided eye contact entirely',
      2: 'Brief or inconsistent eye contact',
      3: 'Some eye contact with prompting',
      4: 'Good eye contact in structured moments',
      5: 'Consistent, appropriate eye contact',
    },
  ),
  'impulseControl': MetricDef(
    label: 'Impulse Control',
    description: 'Waiting turn, inhibiting impulsive responses (ADHD).',
    levels: {
      1: 'Impulsive throughout session',
      2: 'Frequent impulsive behaviour',
      3: 'Some impulsivity, improved with reminders',
      4: 'Good control with occasional reminders',
      5: 'Consistent impulse control',
    },
  ),
  'transitionHandling': MetricDef(
    label: 'Transition Handling',
    description: 'Moving between activities or leaving tasks.',
    levels: {
      1: 'Very difficult transitions, high distress',
      2: 'Resisted most transitions',
      3: 'Transitions with support and warnings',
      4: 'Smooth transitions with minimal support',
      5: 'Independent, flexible transitions',
    },
  ),
  'independence': MetricDef(
    label: 'Independence',
    description: 'Working and participating without hand-over-hand support.',
    levels: {
      1: 'Fully dependent on adult support',
      2: 'Required continuous assistance',
      3: 'Partial independence with prompting',
      4: 'Mostly independent with occasional help',
      5: 'Highly independent throughout',
    },
  ),
};

const metricChartColors = <String, int>{
  'engagement': 0xFF2563EB,
  'focus': 0xFF16A34A,
  'communication': 0xFFD97706,
  'followingInstructions': 0xFF7C3AED,
  'socialInteraction': 0xFFDB2777,
  'emotionalRegulation': 0xFF0891B2,
  'taskCompletion': 0xFF65A30D,
  'eyeContact': 0xFFEA580C,
  'impulseControl': 0xFF4F46E5,
  'transitionHandling': 0xFF0D9488,
  'independence': 0xFFCA8A04,
};

bool isSessionMetricKey(String key) => allSessionMetricKeys.contains(key);

String sessionMetricLabel(String key) {
  final def = metricDefs[key];
  if (def != null) return def.label;
  if (key.isEmpty) return key;
  return key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').trim().replaceFirstMapped(
        RegExp(r'^.'),
        (m) => m.group(0)!.toUpperCase(),
      );
}

int? normalizeStoredScore(dynamic raw) {
  if (raw == null || raw == '') return null;
  final n = raw is num ? raw.toDouble() : double.tryParse(raw.toString());
  if (n == null || !n.isFinite) return null;
  return n.round().clamp(0, 10);
}

int toStoredScore(int picker) => (picker * 2).clamp(2, 10);

int fromStoredToPicker(dynamic stored) {
  final n = normalizeStoredScore(stored);
  if (n == null) return 3;
  return (n / 2).round().clamp(1, 5);
}

String formatMetricForParent(dynamic stored) {
  final n = normalizeStoredScore(stored);
  if (n == null) return '—';
  return '$n/10';
}

String formatMetricForTherapist(dynamic stored) {
  final n = normalizeStoredScore(stored);
  if (n == null) return '—';
  final pick = fromStoredToPicker(n);
  PickerScaleItem? level;
  for (final s in pickerScale) {
    if (s.score == pick) {
      level = s;
      break;
    }
  }
  final suffix = level != null ? ' (${level.label})' : '';
  return '$pick/5 · $n/10$suffix';
}

typedef MetricAudience = String; // 'parent' | 'therapist' | 'admin'

String formatMetricDisplay(dynamic stored, MetricAudience audience) {
  if (audience == 'parent') return formatMetricForParent(stored);
  return formatMetricForTherapist(stored);
}

String pickerStars(int picker) {
  final p = picker.clamp(1, 5);
  return '${'★' * p}${'☆' * (5 - p)}';
}

class SessionMetricEntry {
  const SessionMetricEntry({required this.key, required this.stored});
  final String key;
  final int stored;
}

List<SessionMetricEntry> getSessionMetricEntries(Map<String, dynamic> metrics) {
  final entries = <SessionMetricEntry>[];
  for (final key in allSessionMetricKeys) {
    final stored = normalizeStoredScore(metrics[key]);
    if (stored != null) entries.add(SessionMetricEntry(key: key, stored: stored));
  }
  return entries;
}

/// Picker values: core defaults to 3; optional uses '' when unset.
Map<String, dynamic> loadPickerValuesFromMetrics(Map<String, dynamic> metrics) {
  final values = <String, dynamic>{};
  for (final key in coreSessionMetrics) {
    values[key] = metrics[key] != null ? fromStoredToPicker(metrics[key]) : 3;
  }
  for (final key in additionalSessionMetrics) {
    values[key] = metrics[key] != null ? fromStoredToPicker(metrics[key]) : '';
  }
  return values;
}

Map<String, int> buildStoredMetricsFromPickers(Map<String, dynamic> pickers) {
  final out = <String, int>{};
  for (final entry in pickers.entries) {
    final pick = entry.value;
    if (pick == '' || pick == null) continue;
    if (!isSessionMetricKey(entry.key)) continue;
    out[entry.key] = toStoredScore(pick is int ? pick : int.parse(pick.toString()));
  }
  return out;
}

List<String> activeMetricKeysFromSessions(List<Map<String, dynamic>> sessionMetricsList) {
  final present = <String>{};
  for (final m in sessionMetricsList) {
    for (final key in allSessionMetricKeys) {
      if (normalizeStoredScore(m[key]) != null) present.add(key);
    }
  }
  return allSessionMetricKeys.where(present.contains).toList();
}
