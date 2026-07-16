import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../children/domain/child_entity.dart';
import '../data/reports_repository.dart';
import '../../../core/utils/session_metrics.dart';

class ChildReportScreen extends StatefulWidget {
  const ChildReportScreen({super.key});

  @override
  State<ChildReportScreen> createState() => _ChildReportScreenState();
}

class _ChildReportScreenState extends State<ChildReportScreen> {
  late DateTime _from;
  late DateTime _to;
  ChildReportData? _report;
  String? _error;
  bool _loading = false;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _from = DateTime(now.year, now.month, 1);
    _to = now;
  }

  String _fmt(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

  Future<void> _pickFrom() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _from,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _from = picked);
  }

  Future<void> _pickTo() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _to,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _to = picked);
  }

  Future<void> _generate(ChildEntity child) async {
    if (_to.isBefore(_from)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End date must be on or after start date')),
      );
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _report = null;
    });
    try {
      final report = await reportsRepository.getChildReport(
        childId: child.id,
        from: _fmt(_from),
        to: _fmt(_to),
      );
      setState(() {
        _report = report;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _exportCsv(ChildEntity child) async {
    setState(() => _exporting = true);
    try {
      final csv = await reportsRepository.getChildReportCsv(
        childId: child.id,
        from: _fmt(_from),
        to: _fmt(_to),
      );
      final name = child.fullName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      await Share.share(
        csv,
        subject: 'Child report — ${child.fullName}',
        sharePositionOrigin: Rect.fromLTWH(0, 0, 1, 1),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Report exported (${name}_${_fmt(_from)}_${_fmt(_to)}.csv)')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)?.settings.arguments as ChildEntity?;
    if (child == null) {
      return const Scaffold(body: Center(child: Text('Missing child')));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Report — ${child.fullName}'),
        actions: [
          if (_report != null)
            IconButton(
              icon: _exporting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.ios_share),
              tooltip: 'Export CSV',
              onPressed: _exporting ? null : () => _exportCsv(child),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Date range', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickFrom,
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(formatAppDate(_from)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickTo,
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(formatAppDate(_to)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _loading ? null : () => _generate(child),
            icon: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.summarize),
            label: Text(_loading ? 'Generating…' : 'Generate report'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            SelectableText(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (_report != null) ...[
            const SizedBox(height: 24),
            _sectionTitle('Attendance'),
            _statCard([
              _statRow('Scheduled', '${_report!.attendance.scheduled}'),
              _statRow('Completed', '${_report!.attendance.completed}'),
              _statRow('Missed', '${_report!.attendance.missed}'),
              _statRow('Cancelled', '${_report!.attendance.cancelled}'),
              if (_report!.attendance.attendanceRate != null)
                _statRow('Attendance rate', '${_report!.attendance.attendanceRate}%'),
            ]),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _sectionTitle('Performance'),
                TextButton(
                  onPressed: () => Navigator.of(context).pushNamed('/analytics', arguments: child),
                  child: const Text('View charts'),
                ),
              ],
            ),
            _statCard([
              _statRow('Sessions logged', '${_report!.performance.totalSessions}'),
              _statRow('Total minutes', '${_report!.performance.totalMinutes}'),
              if (_report!.performance.avgEngagement != null)
                _statRow('Avg engagement', formatMetricForParent(_report!.performance.avgEngagement)),
              if (_report!.performance.avgFocus != null)
                _statRow('Avg focus', formatMetricForParent(_report!.performance.avgFocus)),
              if (_report!.performance.avgCommunication != null)
                _statRow('Avg communication', formatMetricForParent(_report!.performance.avgCommunication)),
            ]),
            if (_report!.performance.trend.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Progress trend (2nd half vs 1st half of period)', style: TextStyle(fontSize: 13)),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                children: _report!.performance.trend.entries
                    .where((e) => e.value != null)
                    .map((e) => Chip(
                          label: Text('${e.key}: ${e.value! > 0 ? '+' : ''}${e.value} pts'),
                          visualDensity: VisualDensity.compact,
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 16),
            _sectionTitle('Skill scores (current)'),
            _statCard(
              _report!.child.scores.entries
                  .where((e) => e.value != null)
                  .map((e) => _statRow(e.key, '${e.value}'))
                  .toList(),
            ),
            if (_report!.sessions.isNotEmpty) ...[
              const SizedBox(height: 16),
              _sectionTitle('Sessions (${_report!.sessions.length})'),
              ..._report!.sessions.map((s) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(formatAppDateFromString(s.date) ?? s.date),
                      subtitle: Text([
                        if (s.therapyTitle != null) s.therapyTitle,
                        if (s.durationMinutes != null) '${s.durationMinutes} min',
                        if (s.engagement != null) 'Eng: ${formatMetricForParent(s.engagement)}',
                        if (s.focus != null) 'Focus: ${formatMetricForParent(s.focus)}',
                        if (s.communication != null) 'Comm: ${formatMetricForParent(s.communication)}',
                      ].whereType<String>().join(' · ')),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).pushNamed('/session_detail', arguments: {
                        'sessionId': s.id,
                        'childId': child.id,
                      }),
                    ),
                  )),
            ],
          ],
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      );

  Widget _statCard(List<Widget> children) => Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(children: children),
        ),
      );

  Widget _statRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
}
