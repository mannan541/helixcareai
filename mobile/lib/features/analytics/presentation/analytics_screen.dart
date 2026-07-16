import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../core/utils/session_metrics.dart';
import '../../children/domain/child_entity.dart';
import '../data/analytics_repository.dart';

String _formatSessionDate(String sessionDate) {
  try {
    final dt = DateTime.parse(sessionDate);
    final hasTime = sessionDate.contains('T') || sessionDate.contains(' ');
    if (hasTime && (dt.hour != 0 || dt.minute != 0)) {
      return formatAppDateTime(dt);
    }
    return formatAppDate(dt);
  } catch (_) {
    return sessionDate;
  }
}

Color _metricColor(String key) => Color(metricChartColors[key] ?? 0xFF64748B);

SessionMetricItem? _latestSessionWithMetric(List<SessionMetricItem> sessions, String metricKey) {
  final withMetric = sessions
      .where((s) => normalizeStoredScore(s.structuredMetrics[metricKey]) != null)
      .toList()
    ..sort((a, b) => DateTime.parse(b.sessionDate).compareTo(DateTime.parse(a.sessionDate)));
  return withMetric.isEmpty ? null : withMetric.first;
}

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  List<SessionMetricItem>? _sessions;
  String? _error;
  bool _loading = true;

  Future<void> _load(BuildContext context) async {
    final child = ModalRoute.of(context)?.settings.arguments as ChildEntity?;
    if (child == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await analyticsRepository.getChildMetrics(child.id);
      setState(() {
        _sessions = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading && _sessions == null && _error == null) {
      _load(context);
    }
  }

  List<SessionMetricItem> get _sortedSessions {
    final list = List<SessionMetricItem>.from(_sessions ?? []);
    list.sort((a, b) => DateTime.parse(a.sessionDate).compareTo(DateTime.parse(b.sessionDate)));
    return list;
  }

  List<String> get _activeMetricKeys {
    return activeMetricKeysFromSessions(_sortedSessions.map((s) => s.structuredMetrics).toList());
  }

  Map<String, double?> get _averages {
    final out = <String, double?>{};
    for (final key in _activeMetricKeys) {
      final vals = <int>[];
      for (final s in _sortedSessions) {
        final n = normalizeStoredScore(s.structuredMetrics[key]);
        if (n != null) vals.add(n);
      }
      if (vals.isEmpty) {
        out[key] = null;
      } else {
        out[key] = (vals.reduce((a, b) => a + b) / vals.length * 10).round() / 10;
      }
    }
    return out;
  }

  void _openSession(ChildEntity child, String sessionId) {
    Navigator.of(context).pushNamed('/session_detail', arguments: {
      'sessionId': sessionId,
      'childId': child.id,
    });
  }

  void _openSessions(ChildEntity child) {
    Navigator.of(context).pushNamed('/sessions', arguments: child);
  }

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)?.settings.arguments as ChildEntity?;
    if (child == null) return const Scaffold(body: Center(child: Text('Missing child')));
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text('Performance — ${child.fullName}')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: Text('Performance — ${child.fullName}')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SelectableText(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => _load(context), child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    final sessions = _sessions!;
    if (sessions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text('Performance — ${child.fullName}')),
        body: const Center(child: Text('No session data yet. Log sessions to see charts.')),
      );
    }

    final sorted = _sortedSessions;
    final activeKeys = _activeMetricKeys;
    final averages = _averages;

    return Scaffold(
      appBar: AppBar(
        title: Text('Performance — ${child.fullName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.summarize_outlined),
            tooltip: 'Export report',
            onPressed: () => Navigator.of(context).pushNamed('/child_report', arguments: child),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(context),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Tap any card, chart point, or session row to open details.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _summaryCard(
                  context,
                  label: 'Sessions',
                  value: '${sessions.length}',
                  color: Theme.of(context).colorScheme.primary,
                  subtitle: 'View all sessions',
                  onTap: () => _openSessions(child),
                ),
                for (final key in activeKeys)
                  _summaryCard(
                    context,
                    label: 'Avg ${sessionMetricLabel(key)}',
                    value: averages[key] != null ? formatMetricForParent(averages[key]) : '—',
                    color: _metricColor(key),
                    subtitle: _latestSessionWithMetric(sessions, key) != null
                        ? 'Latest: ${_formatSessionDate(_latestSessionWithMetric(sessions, key)!.sessionDate)}'
                        : 'View sessions',
                    onTap: () {
                      final latest = _latestSessionWithMetric(sessions, key);
                      if (latest != null) {
                        _openSession(child, latest.id);
                      } else {
                        _openSessions(child);
                      }
                    },
                  ),
              ],
            ),
            if (activeKeys.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text('Metrics over time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 4),
              Text(
                'Tap a point to open that session. Scores are on a 0–10 scale.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 240,
                child: LineChart(
                  LineChartData(
                    minY: 0,
                    maxY: 10,
                    lineTouchData: LineTouchData(
                      enabled: true,
                      touchCallback: (event, response) {
                        if (!event.isInterestedForInteractions) return;
                        final spots = response?.lineBarSpots;
                        if (spots == null || spots.isEmpty) return;
                        final idx = spots.first.spotIndex;
                        if (idx >= 0 && idx < sorted.length) {
                          _openSession(child, sorted[idx].id);
                        }
                      },
                    ),
                    gridData: FlGridData(show: true, drawVerticalLine: false),
                    titlesData: FlTitlesData(
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 28,
                          interval: 1,
                          getTitlesWidget: (value, meta) {
                            final i = value.toInt();
                            if (i >= 0 && i < sorted.length) {
                              final formatted = _formatSessionDate(sorted[i].sessionDate);
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  formatted.length > 10 ? '${formatted.substring(0, 8)}…' : formatted,
                                  style: const TextStyle(fontSize: 9),
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 28,
                          getTitlesWidget: (value, meta) => Text('${value.toInt()}', style: const TextStyle(fontSize: 10)),
                        ),
                      ),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: true),
                    lineBarsData: [
                      for (final key in activeKeys)
                        LineChartBarData(
                          spots: [
                            for (var i = 0; i < sorted.length; i++)
                              FlSpot(
                                i.toDouble(),
                                normalizeStoredScore(sorted[i].structuredMetrics[key])?.toDouble() ?? 0,
                              ),
                          ],
                          isCurved: true,
                          color: _metricColor(key),
                          barWidth: 2,
                          dotData: const FlDotData(show: true),
                          preventCurveOverShooting: true,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  for (final key in activeKeys)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 12, height: 12, decoration: BoxDecoration(color: _metricColor(key), shape: BoxShape.circle)),
                        const SizedBox(width: 4),
                        Text(sessionMetricLabel(key), style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                ],
              ),
            ],
            const SizedBox(height: 24),
            const Text('Session duration (minutes)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text('Tap a bar to open that session.', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            SizedBox(
              height: 220,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: (sorted.map((s) => (s.durationMinutes ?? 0).toDouble()).reduce((a, b) => a > b ? a : b) + 10).clamp(10, double.infinity),
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchCallback: (event, response) {
                      if (!event.isInterestedForInteractions) return;
                      final idx = response?.spot?.touchedBarGroupIndex;
                      if (idx != null && idx >= 0 && idx < sorted.length) {
                        _openSession(child, sorted[idx].id);
                      }
                    },
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= 0 && value.toInt() < sorted.length) {
                            final formatted = _formatSessionDate(sorted[value.toInt()].sessionDate);
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                formatted.length > 14 ? '${formatted.substring(0, 12)}…' : formatted,
                                style: const TextStyle(fontSize: 10),
                              ),
                            );
                          }
                          return const SizedBox();
                        },
                        reservedSize: 28,
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        getTitlesWidget: (value, meta) => Text(value.toInt().toString(), style: const TextStyle(fontSize: 11)),
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(show: true, drawVerticalLine: false),
                  borderData: FlBorderData(show: true),
                  barGroups: sorted.asMap().entries.map((e) {
                    final v = (e.value.durationMinutes ?? 0).toDouble();
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: v,
                          color: Theme.of(context).colorScheme.primary,
                          width: 16,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                      showingTooltipIndicators: [],
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text('Sessions in chart', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  for (final s in sorted.reversed)
                    ListTile(
                      title: Text(_formatSessionDate(s.sessionDate)),
                      subtitle: Text([
                        if (s.durationMinutes != null) '${s.durationMinutes} min',
                        ...activeKeys.map((k) {
                          final v = normalizeStoredScore(s.structuredMetrics[k]);
                          return v != null ? '${sessionMetricLabel(k)} ${formatMetricForParent(v)}' : null;
                        }).whereType<String>(),
                      ].join(' · ')),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _openSession(child, s.id),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard(
    BuildContext context, {
    required String label,
    required String value,
    required Color color,
    required VoidCallback onTap,
    String? subtitle,
  }) {
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 48) / 2,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.primary)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
