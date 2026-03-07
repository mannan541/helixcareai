import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../auth/domain/user_entity.dart';
import '../../auth/data/auth_repository.dart';
import '../../children/domain/child_entity.dart';

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
  final _mobileController = TextEditingController();
  final _titleOtherController = TextEditingController();
  final _parentTitleOtherController = TextEditingController();
  final _passwordController = TextEditingController();
  late UserEntity _user;
  String _therapistTitle = _therapistTitleOptions.first;
  String _parentTitle = _parentTitleOptions.first;
  String _adminTitle = _adminTitleOptions.first;
  bool _loading = false;
  bool _initialLoad = true;
  bool _obscurePassword = true;
  bool _showMobileToParents = false;
  String? _error;
  final Set<String> _selectedChildIds = {};
  List<ChildEntity> _children = [];
  bool _childrenLoading = false;
  String? _currentUserId;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _fullNameController.text = _user.fullName;
    _applyTitleFromUser(_user);
    authRepository.me().then((u) {
      if (mounted) setState(() => _currentUserId = u?.id);
    });
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
        _mobileController.text = _user.mobileNumber ?? '';
        _showMobileToParents = _user.showMobileToParents ?? false;
        _applyTitleFromUser(_user);
        if (_user.isParent && _user.childIds != null) {
          _selectedChildIds.clear();
          _selectedChildIds.addAll(_user.childIds!);
        }
      }
      if (_user.isParent) _loadChildren();
    } catch (_) {}
    if (mounted) setState(() => _initialLoad = false);
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
    _mobileController.dispose();
    _titleOtherController.dispose();
    _parentTitleOtherController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _approveUser() async {
    if (_user.isApproved || _user.isAdmin) return;
    try {
      await authRepository.approveUserAsAdmin(_user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_user.fullName} has been approved and can now sign in.')),
      );
      _refetch();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to approve: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _disableUser() async {
    try {
      await authRepository.disableUserAsAdmin(_user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_user.fullName} has been disabled. They will be logged out.')),
      );
      _refetch();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to disable: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _enableUser() async {
    try {
      await authRepository.enableUserAsAdmin(_user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_user.fullName} has been re-enabled.')),
      );
      _refetch();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to enable: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _deleteUser() async {
    try {
      await authRepository.deleteUserAsAdmin(_user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_user.fullName} has been deleted.')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final showApprove = !_user.isApproved && !_user.isAdmin;
    final isSelf = _currentUserId != null && _user.id == _currentUserId;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit user'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (showApprove)
            FilledButton.tonal(
              onPressed: _approveUser,
              child: const Text('Approve user'),
            ),
        ],
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
                  if (_user.isDisabled) ...[
                    Card(
                      color: Theme.of(context).colorScheme.errorContainer.withOpacity(0.5),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Icon(Icons.block, color: Theme.of(context).colorScheme.error),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'This account is disabled. The user cannot sign in.',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            if (!isSelf)
                              FilledButton.tonal(
                                onPressed: _enableUser,
                                child: const Text('Enable'),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (showApprove) ...[
                    Card(
                      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.5),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Icon(Icons.pending_actions, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'This account is pending approval. The user cannot sign in until you approve.',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            FilledButton(
                              onPressed: _approveUser,
                              child: const Text('Approve'),
                            ),
                          ],
                        ),
                      ),
                    ),
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
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _mobileController,
                    decoration: const InputDecoration(labelText: 'Mobile number', hintText: 'Optional'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 8),
                  Text('Role: ${_user.role}', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  if (_user.isTherapist) ...[
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: const Text('Show mobile number to parents'),
                      value: _showMobileToParents,
                      onChanged: (v) => setState(() => _showMobileToParents = v),
                    ),
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
                    const SizedBox(height: 16),
                    const Text('Assigned children', style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    if (_childrenLoading)
                      const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
                    else if (_children.isEmpty)
                      const Padding(padding: EdgeInsets.all(8), child: Text('No children in the system.', style: TextStyle(color: Colors.grey)))
                    else
                      ..._children.map((c) => CheckboxListTile(
                            value: _selectedChildIds.contains(c.id),
                            title: Text(c.fullName),
                            subtitle: c.childCode != null || c.dateOfBirth != null
                                ? Text([
                                    if (c.childCode != null && c.childCode!.isNotEmpty) c.childCode,
                                    if (c.dateOfBirth != null) 'DOB: ${formatAppDateFromString(c.dateOfBirth) ?? c.dateOfBirth}',
                                  ].join(' • '))
                                : null,
                            onChanged: (v) => setState(() {
                              if (v == true) {
                                _selectedChildIds.add(c.id);
                              } else {
                                _selectedChildIds.remove(c.id);
                              }
                            }),
                          )),
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
                    decoration: InputDecoration(
                      labelText: 'New password (leave blank to keep current)',
                      hintText: 'Min 8 characters',
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    obscureText: _obscurePassword,
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
                  if (!isSelf) ...[
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text('Account actions', style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (_user.isDisabled)
                          FilledButton.tonal(
                            onPressed: _enableUser,
                            child: const Text('Enable user'),
                          )
                        else
                          OutlinedButton(
                            onPressed: _disableUser,
                            child: const Text('Disable user'),
                          ),
                        const SizedBox(width: 12),
                        OutlinedButton(
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Delete user?'),
                                content: Text(
                                  'Permanently delete ${_user.fullName}? They will not be able to sign in again.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx, false),
                                    child: const Text('Cancel'),
                                  ),
                                  FilledButton(
                                    onPressed: () => Navigator.pop(ctx, true),
                                    style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
                                    child: const Text('Delete'),
                                  ),
                                ],
                              ),
                            );
                            if (confirm == true && mounted) await _deleteUser();
                          },
                          style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                          child: const Text('Delete user'),
                        ),
                      ],
                    ),
                  ],
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
        childIds: _user.isParent ? _selectedChildIds.toList() : null,
        mobileNumber: _mobileController.text.trim().isEmpty ? null : _mobileController.text.trim(),
        showMobileToParents: _user.isTherapist ? _showMobileToParents : null,
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
