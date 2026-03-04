import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../domain/session_entity.dart';
import '../../children/domain/child_entity.dart';
import 'sessions_bloc.dart';

class SessionFormScreen extends StatefulWidget {
  const SessionFormScreen({
    super.key,
    required this.child,
    this.session,
    required this.onSaved,
  });

  final ChildEntity child;
  final SessionEntity? session;
  final VoidCallback onSaved;

  @override
  State<SessionFormScreen> createState() => _SessionFormScreenState();
}

class _SessionFormScreenState extends State<SessionFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late DateTime _date;
  final _durationController = TextEditingController();
  final _notesController = TextEditingController();
  final Map<String, TextEditingController> _metricControllers = {};

  @override
  void initState() {
    super.initState();
    _date = widget.session?.sessionDate ?? DateTime.now();
    _durationController.text = widget.session?.durationMinutes?.toString() ?? '';
    _notesController.text = widget.session?.notesText ?? '';
    final metrics = widget.session?.structuredMetrics ?? {};
    for (final e in metrics.entries) {
      _metricControllers[e.key] = TextEditingController(text: e.value?.toString() ?? '');
    }
    if (_metricControllers.isEmpty) {
      _metricControllers['engagement'] = TextEditingController();
      _metricControllers['focus'] = TextEditingController();
      _metricControllers['communication'] = TextEditingController();
    }
  }

  @override
  void dispose() {
    _durationController.dispose();
    _notesController.dispose();
    for (final c in _metricControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.session != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit session' : 'Log session')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Structured metrics', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._metricControllers.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextFormField(
                    controller: e.value,
                    decoration: InputDecoration(
                      labelText: _metricLabel(e.key),
                      hintText: '1-10 or value',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                )),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('Date'),
              subtitle: Text(_date.toString().split(' ').first),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked != null) setState(() => _date = picked);
              },
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _durationController,
              decoration: const InputDecoration(labelText: 'Duration (minutes)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            const Text('Notes (free text)', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(hintText: 'Session notes...'),
              maxLines: 4,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => _submit(context),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  String _metricLabel(String key) {
    return key.replaceFirst(key[0], key[0].toUpperCase());
  }

  void _submit(BuildContext context) {
    final structuredMetrics = <String, dynamic>{};
    for (final e in _metricControllers.entries) {
      final v = e.value.text.trim();
      if (v.isNotEmpty) {
        final numVal = int.tryParse(v) ?? double.tryParse(v);
        structuredMetrics[e.key] = numVal ?? v;
      }
    }
    final duration = int.tryParse(_durationController.text.trim());
    final notesText = _notesController.text.trim().isEmpty ? null : _notesController.text.trim();
    if (widget.session != null) {
      context.read<SessionsBloc>().add(SessionUpdateRequested(
            id: widget.session!.id,
            sessionDate: _date,
            durationMinutes: duration,
            notesText: notesText,
            structuredMetrics: structuredMetrics.isEmpty ? null : structuredMetrics,
          ));
    } else {
      context.read<SessionsBloc>().add(SessionCreateRequested(
            childId: widget.child.id,
            sessionDate: _date,
            durationMinutes: duration,
            notesText: notesText,
            structuredMetrics: structuredMetrics.isEmpty ? null : structuredMetrics,
          ));
    }
    widget.onSaved();
    Navigator.of(context).pop();
  }
}
