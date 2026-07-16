import 'package:flutter/material.dart';
import '../utils/session_metrics.dart';

class SessionMetricsDisplay extends StatelessWidget {
  const SessionMetricsDisplay({
    super.key,
    required this.metrics,
    required this.audience,
    this.compact = false,
  });

  final Map<String, dynamic> metrics;
  final MetricAudience audience;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final entries = getSessionMetricEntries(metrics);
    if (entries.isEmpty) return const SizedBox.shrink();

    if (compact) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final e in entries)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '${sessionMetricLabel(e.key)}: ', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    TextSpan(text: formatMetricDisplay(e.stored, audience), style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                style: const TextStyle(fontSize: 13),
              ),
            ),
        ],
      );
    }

    final core = entries.where((e) => coreSessionMetrics.contains(e.key)).toList();
    final additional = entries.where((e) => additionalSessionMetrics.contains(e.key)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (core.isNotEmpty) _group(context, 'Core metrics', core),
        if (additional.isNotEmpty) ...[
          if (core.isNotEmpty) const SizedBox(height: 12),
          _group(context, 'Additional metrics', additional),
        ],
      ],
    );
  }

  Widget _group(BuildContext context, String title, List<SessionMetricEntry> group) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),
        for (final e in group) ...[
          _metricCard(context, e),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _metricCard(BuildContext context, SessionMetricEntry e) {
    final def = metricDefs[e.key]!;
    final pick = fromStoredToPicker(e.stored);
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(def.label, style: const TextStyle(fontWeight: FontWeight.w600))),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (audience != 'parent')
                    Text(pickerStars(pick), style: const TextStyle(color: Colors.amber, fontSize: 14)),
                  Text(
                    formatMetricDisplay(e.stored, audience),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: audience == 'parent' ? theme.colorScheme.primary : null,
                      fontSize: audience == 'parent' ? 18 : 14,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(def.levels[pick] ?? '', style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}
