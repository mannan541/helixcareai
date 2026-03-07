import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../auth/domain/user_entity.dart';
import '../../auth/data/auth_repository.dart';

class UsersListScreen extends StatefulWidget {
  const UsersListScreen({super.key, this.roleFilter});

  /// Optional role filter: 'therapist', 'parent', or null for all users.
  final String? roleFilter;

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
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.roleFilter == null ? 'All users' : 'Users (${widget.roleFilter})'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
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
                    ? const Center(child: Text('No users found'))
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
                            ],
                            rows: _users.map((u) {
                              return DataRow(
                                onSelectChanged: (_) => _openEditUser(u),
                                cells: [
                                  DataCell(Text(u.fullName)),
                                  DataCell(Text(u.email)),
                                  DataCell(Text(u.role)),
                                  DataCell(Text(u.title ?? '—')),
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
