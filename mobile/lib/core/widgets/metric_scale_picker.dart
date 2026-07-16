import 'package:flutter/material.dart';
import '../utils/session_metrics.dart';

class MetricScalePicker extends StatelessWidget {
  const MetricScalePicker({
    super.key,
    required this.metricKey,
    required this.value,
    required this.onChanged,
    this.optional = false,
  });

  final String metricKey;
  final dynamic value; // int or ''
  final ValueChanged<dynamic> onChanged;
  final bool optional;

  @override
  Widget build(BuildContext context) {
    final def = metricDefs[metricKey]!;
    final selected = value == '' || value == null ? null : (value is int ? value : int.tryParse(value.toString()));
    final levelText = selected != null ? def.levels[selected] : null;
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      def.label + (optional ? ' (optional)' : ''),
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(def.description, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              if (selected != null)
                Text(
                  pickerStars(selected),
                  style: const TextStyle(color: Colors.amber, fontSize: 16),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final s in pickerScale)
                _ScaleButton(
                  score: s.score,
                  label: s.label,
                  tooltip: '${s.score} — ${s.label}: ${def.levels[s.score]}',
                  selected: selected == s.score,
                  onTap: () {
                    if (selected == s.score && optional) {
                      onChanged('');
                    } else {
                      onChanged(s.score);
                    }
                  },
                ),
              if (optional && selected != null)
                OutlinedButton(
                  onPressed: () => onChanged(''),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  child: const Text('Clear', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
          if (levelText != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Selected: $levelText (stored as ${(selected ?? 3) * 2}/10)',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ScaleButton extends StatelessWidget {
  const _ScaleButton({
    required this.score,
    required this.label,
    required this.tooltip,
    required this.selected,
    required this.onTap,
  });

  final int score;
  final String label;
  final String tooltip;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Tooltip(
      message: tooltip,
      child: Material(
        color: selected ? theme.colorScheme.primary : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 72,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? theme.colorScheme.primary : theme.dividerColor,
              ),
            ),
            child: Column(
              children: [
                Text(
                  '$score',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: selected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                  ),
                ),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    color: selected ? theme.colorScheme.onPrimary.withValues(alpha: 0.9) : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class MetricScaleLegend extends StatelessWidget {
  const MetricScaleLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Scoring guide (1–5 scale)', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            'Therapists rate each area 1–5 after the session. Scores are stored as 0–10 for progress charts and parent reports.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          ...pickerScale.map(
            (s) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text('${s.score} — ${s.label}: ${s.meaning}', style: theme.textTheme.bodySmall),
            ),
          ),
        ],
      ),
    );
  }
}
