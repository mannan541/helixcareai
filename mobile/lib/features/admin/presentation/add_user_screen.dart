import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../auth/domain/user_entity.dart';
import '../../children/domain/child_entity.dart';

const _therapistTitleOptions = [
  'Behaviour Therapist',
  'Speech Therapist',
  'Occupational Therapist',
  'Other',
];

class AddUserScreen extends StatefulWidget {
  const AddUserScreen({super.key, this.therapistOnly = false});

  /// When true, title is "Add therapist", role is fixed to therapist, and on success we pop with the created user.
  final bool therapistOnly;

  @override
  State<AddUserScreen> createState() => _AddUserScreenState();
}

class _AddUserScreenState extends State<AddUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _titleOtherController = TextEditingController();
  late String _role;
  String _therapistTitle = _therapistTitleOptions.first;
  final Set<String> _selectedChildIds = {};
  List<ChildEntity> _children = [];
  bool _childrenLoading = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _role = widget.therapistOnly ? 'therapist' : 'therapist';
    if (!widget.therapistOnly) _loadChildren();
  }

  Future<void> _loadChildren() async {
    setState(() => _childrenLoading = true);
    try {
      final res = await childrenRepository.list(limit: 200, offset: 0);
      if (mounted) setState(() {
        _children = res.children;
        _childrenLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _childrenLoading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _fullNameController.dispose();
    _titleOtherController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.therapistOnly ? 'Add therapist' : 'Add user')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              widget.therapistOnly
                  ? 'Creates a therapist with default password: 12345678'
                  : 'Creates a Therapist or Parent with default password: 12345678',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Required';
                if (!v.contains('@')) return 'Invalid email';
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _fullNameController,
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            if (!widget.therapistOnly) ...[
              const SizedBox(height: 16),
              const Text('Role', style: TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Therapist'),
                    selected: _role == 'therapist',
                    onSelected: (_) => setState(() {
                      _role = 'therapist';
                      if (_children.isEmpty && !_childrenLoading) _loadChildren();
                    }),
                  ),
                  ChoiceChip(
                    label: const Text('Parent'),
                    selected: _role == 'parent',
                    onSelected: (_) => setState(() {
                      _role = 'parent';
                      if (_children.isEmpty && !_childrenLoading) _loadChildren();
                    }),
                  ),
                ],
              ),
            ],
            if (_role == 'therapist') ...[
              const SizedBox(height: 16),
              const Text('Title', style: TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _therapistTitle,
                decoration: const InputDecoration(border: OutlineInputBorder()),
                items: _therapistTitleOptions.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _therapistTitle = v ?? _therapistTitleOptions.first),
              ),
              if (_therapistTitle == 'Other') ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _titleOtherController,
                  decoration: const InputDecoration(
                    labelText: 'Title (other)',
                    hintText: 'Enter custom title',
                  ),
                  validator: (v) => _therapistTitle == 'Other' && (v == null || v.trim().isEmpty) ? 'Required when Other is selected' : null,
                ),
              ],
            ],
            if (_role == 'parent') ...[
              const SizedBox(height: 16),
              const Text('Associate with child(ren)', style: TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              if (_childrenLoading)
                const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
              else if (_children.isEmpty)
                const Padding(padding: EdgeInsets.all(8), child: Text('No children in the system.', style: TextStyle(color: Colors.grey)))
              else
                ..._children.map((c) => CheckboxListTile(
                      value: _selectedChildIds.contains(c.id),
                      title: Text(c.fullName),
                      subtitle: c.dateOfBirth != null ? Text('DOB: ${c.dateOfBirth}') : null,
                      onChanged: (v) => setState(() {
                        if (v == true) {
                          _selectedChildIds.add(c.id);
                        } else {
                          _selectedChildIds.remove(c.id);
                        }
                      }),
                    )),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : () => _submit(context),
              child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Create user'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit(BuildContext context) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);
    try {
      final role = widget.therapistOnly ? 'therapist' : _role;
      String? title;
      if (role == 'therapist') {
        title = _therapistTitle == 'Other' ? _titleOtherController.text.trim() : _therapistTitle;
        if (title.isEmpty) title = null;
      }
      final user = await authRepository.createUserAsAdmin(
        email: _emailController.text.trim(),
        fullName: _fullNameController.text.trim(),
        role: role,
        title: title,
        childIds: _role == 'parent' && _selectedChildIds.isNotEmpty ? _selectedChildIds.toList() : null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User created. Default password: 12345678')));
      Navigator.of(context).pop(user);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
