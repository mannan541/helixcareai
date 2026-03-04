import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/di/injection.dart';
import '../../children/domain/child_entity.dart';
import '../data/analytics_repository.dart';

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
              Text(_error!, textAlign: TextAlign.center),
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
    return Scaffold(
      appBar: AppBar(title: Text('Performance — ${child.fullName}')),
      body: RefreshIndicator(
        onRefresh: () => _load(context),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Duration (minutes)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            SizedBox(
              height: 220,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: (sessions.map((s) => (s.durationMinutes ?? 0).toDouble()).reduce((a, b) => a > b ? a : b) + 10).clamp(10, double.infinity),
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= 0 && value.toInt() < sessions.length) {
                            final d = sessions[value.toInt()].sessionDate;
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(d.length >= 10 ? d.substring(5, 10) : d, style: const TextStyle(fontSize: 10)),
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
                  barGroups: sessions.asMap().entries.map((e) {
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
            const Text('Structured metrics (latest)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...sessions.take(5).map((s) {
              final m = s.structuredMetrics;
              if (m.isEmpty) return const SizedBox.shrink();
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.sessionDate, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: m.entries.map((e) => Chip(
                              label: Text('${e.key}: ${e.value}'),
                              padding: EdgeInsets.zero,
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            )).toList(),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
