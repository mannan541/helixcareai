import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../auth/domain/user_entity.dart';
import '../../auth/data/auth_repository.dart';

class UsersListScreen extends StatefulWidget {
  const UsersListScreen({super.key, this.roleFilter, this.pendingOnly = false});

  /// Optional role filter: 'therapist', 'parent', or null for all users.
  final String? roleFilter;
  /// When true, show only pending (unapproved) signups and an Approve action.
  final bool pendingOnly;

  @override
  State<UsersListScreen> createState() => _UsersListScreenState();
}

class _UsersListScreenState extends State<UsersListScreen> {
  List<UserEntity> _users = [];
  int _total = 0;
  int _offset = 0;
  static const int _pageSize = 20;
  bool _loading = false;
  String? _error;
  String? _currentUserId;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkAdminAndLoad();
  }

  Future<void> _checkAdminAndLoad() async {
    final user = await authRepository.me();
    if (!mounted) return;
    if (user == null || !user.isAdmin) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _currentUserId = user.id);
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openEditUser(UserEntity user) {
    Navigator.of(context).pushNamed('/user_edit', arguments: user).then((_) {
      _load();
    });
  }

  Future<void> _approveUser(UserEntity user) async {
    try {
      await authRepository.approveUserAsAdmin(user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${user.fullName} has been approved and can now sign in.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to approve: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _disableUser(UserEntity user) async {
    try {
      await authRepository.disableUserAsAdmin(user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${user.fullName} has been disabled. They will be logged out.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to disable: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _enableUser(UserEntity user) async {
    try {
      await authRepository.enableUserAsAdmin(user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${user.fullName} has been re-enabled.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to enable: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  Future<void> _deleteUser(UserEntity user) async {
    try {
      await authRepository.deleteUserAsAdmin(user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${user.fullName} has been deleted.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete: $e'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }
  }

  void _openAddUser() {
    final Object? args;
    if (widget.roleFilter == 'therapist') {
      args = true; // therapistOnly
    } else if (widget.roleFilter == 'parent') {
      args = 'parent'; // initialRole
    } else {
      args = null; // full add user (therapist or parent)
    }
    Navigator.of(context).pushNamed('/add_user', arguments: args).then((_) {
      _load();
    });
  }

  Future<void> _load({bool reset = true}) async {
    setState(() {
      _loading = true;
      _error = null;
      if (reset) _offset = 0;
    });
    try {
      final resp = await authRepository.listUsers(
        role: widget.roleFilter,
        limit: _pageSize,
        offset: reset ? 0 : _offset,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        pendingOnly: widget.pendingOnly,
      );
      if (!mounted) return;
      setState(() {
        if (reset) {
          _users = resp.users;
          _offset = resp.users.length;
        } else {
          _users = [..._users, ...resp.users];
          _offset += resp.users.length;
        }
        _total = resp.total;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.pendingOnly
        ? 'Pending approvals'
        : (widget.roleFilter == null ? 'All users' : 'Users (${widget.roleFilter})');
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (!widget.pendingOnly)
            IconButton(
              icon: const Icon(Icons.person_add),
              tooltip: 'Add user',
              onPressed: _openAddUser,
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Search by name or email',
                      hintText: 'Search...',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: (_) => _load(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _loading ? null : () => _load(),
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SelectableText(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          Expanded(
            child: _loading && _users.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _users.isEmpty
                    ? Center(
                        child: Text(
                          widget.pendingOnly ? 'No pending signups' : 'No users found',
                        ),
                      )
                    : SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Name')),
                              DataColumn(label: Text('Email')),
                              DataColumn(label: Text('Type')),
                              DataColumn(label: Text('Title')),
                              DataColumn(label: Text('Status')),
                              DataColumn(label: Text('Actions')),
                            ],
                            rows: _users.map((u) {
                              final pending = !u.isApproved && u.role != 'admin';
                              final isSelf = _currentUserId != null && u.id == _currentUserId;
                              return DataRow(
                                onSelectChanged: (_) => _openEditUser(u),
                                cells: [
                                  DataCell(Text(u.fullName)),
                                  DataCell(Text(u.email)),
                                  DataCell(Text(u.role)),
                                  DataCell(Text(u.title ?? '—')),
                                  DataCell(
                                    pending
                                        ? FilledButton.tonal(
                                            onPressed: () => _approveUser(u),
                                            child: const Text('Approve'),
                                          )
                                        : Text(
                                            u.isDisabled ? 'Disabled' : (u.isApproved ? 'Approved' : '—'),
                                            style: TextStyle(
                                              color: u.isDisabled ? Theme.of(context).colorScheme.error : Theme.of(context).colorScheme.onSurfaceVariant,
                                              fontSize: 12,
                                            ),
                                          ),
                                  ),
                                  DataCell(
                                    isSelf
                                        ? const Text('—', style: TextStyle(fontSize: 12, color: Colors.grey))
                                        : PopupMenuButton<String>(
                                            icon: const Icon(Icons.more_vert),
                                            onSelected: (value) async {
                                              if (value == 'disable') {
                                                await _disableUser(u);
                                              } else if (value == 'enable') {
                                                await _enableUser(u);
                                              } else if (value == 'delete') {
                                                final confirm = await showDialog<bool>(
                                                  context: context,
                                                  builder: (ctx) => AlertDialog(
                                                    title: const Text('Delete user?'),
                                                    content: Text(
                                                      'Permanently delete ${u.fullName}? They will not be able to sign in again.',
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
                                                if (confirm == true && mounted) await _deleteUser(u);
                                              }
                                            },
                                            itemBuilder: (context) => [
                                              if (u.isDisabled)
                                                const PopupMenuItem(value: 'enable', child: Text('Enable')),
                                              if (!u.isDisabled)
                                                const PopupMenuItem(value: 'disable', child: Text('Disable')),
                                              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                            ],
                                          ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      ),
          ),
          if (_users.isNotEmpty && _users.length < _total)
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _loading ? null : () => _load(reset: false),
                child: Text('Load more (${_users.length} of $_total)'),
              ),
            ),
        ],
      ),
    );
  }
}
