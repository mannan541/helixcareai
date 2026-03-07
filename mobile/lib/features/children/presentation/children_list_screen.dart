import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import 'child_detail_screen.dart';
import 'children_bloc.dart';

class ChildrenListScreen extends StatelessWidget {
  const ChildrenListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ChildrenBloc(childrenRepository)..add(const ChildrenLoadRequested()),
      child: const _ChildrenListView(),
    );
  }
}

class _ChildrenListView extends StatefulWidget {
  const _ChildrenListView();

  @override
  State<_ChildrenListView> createState() => _ChildrenListViewState();
}

class _ChildrenListViewState extends State<_ChildrenListView> {
  bool _canAddChild = false;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((user) {
      if (mounted) setState(() {
        _canAddChild = user?.isAdmin == true || user?.isTherapist == true;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ChildrenBloc, ChildrenState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
          }
        },
        builder: (context, state) {
          Widget body;
          if (state.isLoading && state.children.isEmpty) {
            body = const Center(child: CircularProgressIndicator());
          } else if (state.error != null && state.children.isEmpty) {
            body = Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SelectableText(state.error!, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.read<ChildrenBloc>().add(const ChildrenLoadRequested()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (state.children.isEmpty) {
            body = Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.child_care, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No children yet'),
                  if (_canAddChild) ...[
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: () => _showAddChild(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Add child'),
                    ),
                  ],
                ],
              ),
            );
          } else {
            final list = state.children;
            body = Stack(
              children: [
                ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length + (state.hasMore ? 1 : 0),
                  itemBuilder: (context, i) {
                    if (i == list.length) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: state.isLoadingMore
                              ? const CircularProgressIndicator()
                              : TextButton(
                                  onPressed: () => context.read<ChildrenBloc>().add(const ChildrenLoadRequested(loadMore: true)),
                                  child: Text('Load more (${list.length} of ${state.total})'),
                                ),
                        ),
                      );
                    }
                    final c = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(c.fullName),
                        subtitle: c.dateOfBirth != null ? Text('DOB: ${c.dateOfBirth}') : null,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).pushNamed(
                          '/child_detail',
                          arguments: ChildDetailArgs(
                            child: c,
                            childrenBloc: context.read<ChildrenBloc>(),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                if (state.isLoading && list.isEmpty) const Positioned.fill(child: ColoredBox(color: Color(0x20000000), child: Center(child: CircularProgressIndicator()))),
              ],
            );
          }
          return Scaffold(
            appBar: AppBar(
              title: const Text('Children'),
              actions: [
                _AddUserButton(),
                IconButton(
                  icon: const Icon(Icons.person),
                  onPressed: () => Navigator.of(context).pushNamed('/edit_profile'),
                ),
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () => _confirmLogout(context),
                ),
              ],
            ),
            body: body,
            floatingActionButton: state.children.isNotEmpty && _canAddChild
                ? FloatingActionButton(
                    onPressed: () => _showAddChild(context),
                    child: const Icon(Icons.add),
                  )
                : null,
          );
        },
      );
  }

  void _confirmLogout(BuildContext context) {
    showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
        ],
      ),
    ).then((confirmed) {
      if (confirmed == true) {
        authRepository.setToken(null);
        Navigator.of(context).pushReplacementNamed('/login');
      }
    });
  }

  void _showAddChild(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _AddChildSheet(
        onSubmit: (firstName, lastName, dateOfBirth, notes, diagnosis, referredBy) {
          context.read<ChildrenBloc>().add(ChildrenCreateRequested(
                firstName: firstName,
                lastName: lastName,
                dateOfBirth: dateOfBirth,
                notes: notes,
                diagnosis: diagnosis,
                referredBy: referredBy,
              ));
          Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _AddUserButton extends StatefulWidget {
  @override
  State<_AddUserButton> createState() => _AddUserButtonState();
}

class _AddUserButtonState extends State<_AddUserButton> {
  bool? _isAdmin;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((u) {
      if (mounted) setState(() => _isAdmin = u?.isAdmin);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isAdmin != true) return const SizedBox.shrink();
    return IconButton(
      icon: const Icon(Icons.person_add),
      tooltip: 'Add therapist/parent',
      onPressed: () => Navigator.of(context).pushNamed('/add_user'),
    );
  }
}

class _AddChildSheet extends StatefulWidget {
  final void Function(String firstName, String lastName, String? dateOfBirth, String? notes, String? diagnosis, String? referredBy) onSubmit;

  const _AddChildSheet({required this.onSubmit});

  @override
  State<_AddChildSheet> createState() => _AddChildSheetState();
}

class _AddChildSheetState extends State<_AddChildSheet> {
  final _fn = TextEditingController();
  final _ln = TextEditingController();
  final _notes = TextEditingController();
  final _diagnosis = TextEditingController();
  final _referredBy = TextEditingController();
  DateTime? _dob;

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
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add child', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: _fn, decoration: const InputDecoration(labelText: 'First name')),
            const SizedBox(height: 12),
            TextField(controller: _ln, decoration: const InputDecoration(labelText: 'Last name')),
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
            TextField(
              controller: _diagnosis,
              decoration: const InputDecoration(labelText: 'Diagnosis (optional)', hintText: 'e.g. ASD'),
              maxLines: 1,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _referredBy,
              decoration: const InputDecoration(labelText: 'Referred by (optional)', hintText: 'e.g. Dr. Smith'),
            ),
            const SizedBox(height: 12),
            TextField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes'), maxLines: 2),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                if (_fn.text.trim().isEmpty || _ln.text.trim().isEmpty) return;
                final dobStr = _dob != null ? '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}' : null;
                widget.onSubmit(
                  _fn.text.trim(),
                  _ln.text.trim(),
                  dobStr,
                  _notes.text.trim().isEmpty ? null : _notes.text.trim(),
                  _diagnosis.text.trim().isEmpty ? null : _diagnosis.text.trim(),
                  _referredBy.text.trim().isEmpty ? null : _referredBy.text.trim(),
                );
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}
