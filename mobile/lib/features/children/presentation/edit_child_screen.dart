import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../domain/child_entity.dart';
import '../data/children_repository.dart';
import 'children_bloc.dart';

class EditChildScreen extends StatefulWidget {
  const EditChildScreen({super.key, required this.child, required this.repository});

  final ChildEntity child;
  final ChildrenRepository repository;

  @override
  State<EditChildScreen> createState() => _EditChildScreenState();
}

class _EditChildScreenState extends State<EditChildScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fn;
  late final TextEditingController _ln;
  late final TextEditingController _notes;
  late final TextEditingController _diagnosis;
  late final TextEditingController _referredBy;
  late DateTime? _dob;

  @override
  void initState() {
    super.initState();
    final c = widget.child;
    _fn = TextEditingController(text: c.firstName);
    _ln = TextEditingController(text: c.lastName);
    _notes = TextEditingController(text: c.notes ?? '');
    _diagnosis = TextEditingController(text: c.diagnosis ?? '');
    _referredBy = TextEditingController(text: c.referredBy ?? '');
    _dob = c.dateOfBirth != null ? DateTime.tryParse(c.dateOfBirth!) : null;
  }

  @override
  void dispose() {
    _fn.dispose();
    _ln.dispose();
    _notes.dispose();
    _diagnosis.dispose();
    _referredBy.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit child')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _fn,
              decoration: const InputDecoration(labelText: 'First name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _ln,
              decoration: const InputDecoration(labelText: 'Last name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            ListTile(
              title: Text(_dob == null ? 'Date of birth (optional)' : 'DOB: ${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _dob ?? DateTime.now(),
                  firstDate: DateTime(1990),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _dob = picked);
              },
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _diagnosis,
              decoration: const InputDecoration(labelText: 'Diagnosis (optional)', hintText: 'e.g. ASD'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _referredBy,
              decoration: const InputDecoration(labelText: 'Referred by (optional)', hintText: 'e.g. Dr. Smith'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'Notes'),
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => _save(context),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save(BuildContext context) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final dobStr = _dob != null ? '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}' : null;
    try {
      final updated = await widget.repository.update(widget.child.id,
        firstName: _fn.text.trim(),
        lastName: _ln.text.trim(),
        dateOfBirth: dobStr,
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        diagnosis: _diagnosis.text.trim().isEmpty ? null : _diagnosis.text.trim(),
        referredBy: _referredBy.text.trim().isEmpty ? null : _referredBy.text.trim(),
      );
      if (context.mounted) {
        context.read<ChildrenBloc>().add(const ChildrenLoadRequested());
        Navigator.of(context).pop(updated);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(e.toString())));
      }
    }
  }
}
