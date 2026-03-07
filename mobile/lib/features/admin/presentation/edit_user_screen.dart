import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../auth/domain/user_entity.dart';

const _therapistTitleOptions = [
  'Behaviour Therapist',
  'Speech Therapist',
  'Occupational Therapist',
  'Other',
];

const _parentTitleOptions = ['Mother', 'Father', 'Other'];

const _adminTitleOptions = ['Super Admin', 'Owner', 'Manager'];

class EditUserScreen extends StatefulWidget {
  const EditUserScreen({super.key, required this.user});

  /// User to edit (from list). We may refetch to get latest.
  final UserEntity user;

  @override
  State<EditUserScreen> createState() => _EditUserScreenState();
}

class _EditUserScreenState extends State<EditUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _titleOtherController = TextEditingController();
  final _parentTitleOtherController = TextEditingController();
  final _passwordController = TextEditingController();
  late UserEntity _user;
  String _therapistTitle = _therapistTitleOptions.first;
  String _parentTitle = _parentTitleOptions.first;
  String _adminTitle = _adminTitleOptions.first;
  bool _loading = false;
  bool _initialLoad = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _fullNameController.text = _user.fullName;
    _applyTitleFromUser(_user);
    _refetch();
  }

  Future<void> _refetch() async {
    setState(() => _initialLoad = true);
    try {
      final u = await authRepository.getUserAsAdmin(_user.id);
      if (!mounted) return;
      if (u != null) {
        _user = u;
        _fullNameController.text = _user.fullName;
        _applyTitleFromUser(_user);
      }
    } catch (_) {}
    if (mounted) setState(() => _initialLoad = false);
  }

  void _applyTitleFromUser(UserEntity user) {
    if (user.isTherapist && user.title != null) {
      if (_therapistTitleOptions.contains(user.title)) {
        _therapistTitle = user.title!;
      } else {
        _therapistTitle = 'Other';
        _titleOtherController.text = user.title ?? '';
      }
    } else if (user.isParent && user.title != null) {
      if (_parentTitleOptions.contains(user.title)) {
        _parentTitle = user.title!;
      } else {
        _parentTitle = 'Other';
        _parentTitleOtherController.text = user.title ?? '';
      }
    } else if (user.isAdmin && user.title != null && _adminTitleOptions.contains(user.title)) {
      _adminTitle = user.title!;
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _titleOtherController.dispose();
    _parentTitleOtherController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit user'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _initialLoad
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    SelectableText(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    const SizedBox(height: 16),
                  ],
                  TextFormField(
                    controller: _fullNameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: _user.email,
                    decoration: const InputDecoration(labelText: 'Email'),
                    readOnly: true,
                    enabled: false,
                  ),
                  const SizedBox(height: 8),
                  Text('Role: ${_user.role}', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  if (_user.isTherapist) ...[
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
                      ),
                    ],
                  ],
                  if (_user.isParent) ...[
                    const SizedBox(height: 16),
                    const Text('Title', style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _parentTitle,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: _parentTitleOptions.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setState(() => _parentTitle = v ?? _parentTitleOptions.first),
                    ),
                    if (_parentTitle == 'Other') ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _parentTitleOtherController,
                        decoration: const InputDecoration(
                          labelText: 'Title (other)',
                          hintText: 'Enter custom title',
                        ),
                      ),
                    ],
                  ],
                  if (_user.isAdmin) ...[
                    const SizedBox(height: 16),
                    const Text('Title', style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _adminTitle,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: _adminTitleOptions.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setState(() => _adminTitle = v ?? _adminTitleOptions.first),
                    ),
                  ],
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    decoration: const InputDecoration(
                      labelText: 'New password (leave blank to keep current)',
                      hintText: 'Min 8 characters',
                    ),
                    obscureText: true,
                    validator: (v) {
                      if (v != null && v.isNotEmpty && v.length < 8) return 'Min 8 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _save,
                    child: _loading
                        ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Save'),
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      String? title;
      if (_user.isTherapist) {
        title = _therapistTitle == 'Other' ? _titleOtherController.text.trim() : _therapistTitle;
        if (title.isEmpty) title = null;
      } else if (_user.isParent) {
        title = _parentTitle == 'Other' ? _parentTitleOtherController.text.trim() : _parentTitle;
        if (title.isEmpty) title = null;
      } else if (_user.isAdmin) {
        title = _adminTitle;
      }
      final updated = await authRepository.updateUserAsAdmin(
        _user.id,
        fullName: _fullNameController.text.trim(),
        title: (_user.isTherapist || _user.isParent || _user.isAdmin) ? title : null,
        password: _passwordController.text.trim().isEmpty ? null : _passwordController.text.trim(),
      );
      if (!mounted) return;
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User updated')));
        Navigator.of(context).pop(updated);
      } else {
        setState(() => _error = 'Nothing to update');
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
