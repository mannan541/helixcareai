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

class _UsersListScreenState extends State<UsersListScreen> with TickerProviderStateMixin {
  List<UserEntity> _users = [];
  int _total = 0;
  int _offset = 0;
  static const int _pageSize = 20;
  bool _loading = false;
  String? _error;
  String? _currentUserId;
  final _searchController = TextEditingController();

  /// Active vs Archived tab when not pendingOnly.
  bool _showArchived = false;
  /// Role filter: null = All, 'therapist', 'parent'.
  String? _roleFilter;
  /// Sort column: full_name, email, role, approved_at, disabled_at, deleted_at.
  String _sortBy = 'full_name';
  bool _sortAsc = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _roleFilter = widget.roleFilter;
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && mounted) {
        final showArchived = _tabController.index == 1;
        if (showArchived != _showArchived) {
          setState(() {
            _showArchived = showArchived;
            _offset = 0;
          });
          _load();
        }
      }
    });
    _checkAdminAndLoad();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
    if (_roleFilter == 'therapist' || widget.roleFilter == 'therapist') {
      args = true;
    } else if (_roleFilter == 'parent' || widget.roleFilter == 'parent') {
      args = 'parent';
    } else {
      args = null;
    }
    Navigator.of(context).pushNamed('/add_user', arguments: args).then((_) {
      _load();
    });
  }

  void _setSort(String column) {
    setState(() {
      if (_sortBy == column) {
        _sortAsc = !_sortAsc;
      } else {
        _sortBy = column;
        _sortAsc = true;
      }
      _offset = 0;
    });
    _load();
  }

  Future<void> _load({bool reset = true}) async {
    setState(() {
      _loading = true;
      _error = null;
      if (reset) _offset = 0;
    });
    try {
      final resp = await authRepository.listUsers(
        role: _roleFilter ?? widget.roleFilter,
        limit: _pageSize,
        offset: reset ? 0 : _offset,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        pendingOnly: widget.pendingOnly,
        archivedOnly: !widget.pendingOnly && _showArchived,
        sortBy: _sortBy,
        sortOrder: _sortAsc ? 'asc' : 'desc',
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
        : (_showArchived ? 'Archived users' : (widget.roleFilter == null && _roleFilter == null ? 'All users' : 'Users (${_roleFilter ?? widget.roleFilter})'));
    return Scaffold(
        appBar: AppBar(
          title: Text(title),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.of(context).pop(),
          ),
          bottom: widget.pendingOnly
              ? null
              : TabBar(
                  controller: _tabController,
                  tabs: const [
                    Tab(text: 'Active'),
                    Tab(text: 'Archived'),
                  ],
                ),
          actions: [
            if (!widget.pendingOnly && !_showArchived)
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (!widget.pendingOnly)
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: DropdownButton<String?>(
                            value: _roleFilter,
                            hint: const Text('Role'),
                            items: const [
                              DropdownMenuItem(value: null, child: Text('All roles')),
                              DropdownMenuItem(value: 'therapist', child: Text('Therapist')),
                              DropdownMenuItem(value: 'parent', child: Text('Parent')),
                            ],
                            onChanged: (v) {
                              setState(() {
                                _roleFilter = v;
                                _offset = 0;
                              });
                              _load();
                            },
                          ),
                        ),
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
                            widget.pendingOnly
                                ? 'No pending signups'
                                : _showArchived
                                    ? 'No archived users'
                                    : 'No users found',
                          ),
                        )
                      : SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: DataTable(
                              columns: [
                                _sortableColumn('Name', 'full_name'),
                                _sortableColumn('Email', 'email'),
                                _sortableColumn('Type', 'role'),
                                const DataColumn(label: Text('Title')),
                                _sortableColumn('Status', _showArchived ? 'deleted_at' : 'disabled_at'),
                                const DataColumn(label: Text('Actions')),
                              ],
                              rows: _users.map((u) => _buildRow(u)).toList(),
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

  DataColumn _sortableColumn(String label, String columnKey) {
    final isSelected = _sortBy == columnKey;
    return DataColumn(
      label: InkWell(
        onTap: () => _setSort(columnKey),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label),
            if (isSelected) Icon(_sortAsc ? Icons.arrow_drop_up : Icons.arrow_drop_down, size: 20),
          ],
        ),
      ),
    );
  }

  DataRow _buildRow(UserEntity u) {
    final pending = !u.isApproved && u.role != 'admin';
    final isSelf = _currentUserId != null && u.id == _currentUserId;
    final isArchived = _showArchived && !widget.pendingOnly;

    return DataRow(
      onSelectChanged: isArchived ? null : (_) => _openEditUser(u),
      cells: [
        DataCell(Text(u.fullName)),
        DataCell(Text(u.email)),
        DataCell(Text(u.role)),
        DataCell(Text(u.title ?? '—')),
        DataCell(
          isArchived
              ? Text(
                  u.isDeleted ? 'Deleted' : 'Disabled',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontSize: 12,
                  ),
                )
              : pending
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
          isArchived
              ? FilledButton.tonal(
                  onPressed: () => _enableUser(u),
                  child: const Text('Enable'),
                )
              : isSelf
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
  }
}
