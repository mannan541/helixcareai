import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
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

class _ChildrenListView extends StatelessWidget {
  const _ChildrenListView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ChildrenBloc, ChildrenState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!)));
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
                  Text(state.error!, textAlign: TextAlign.center),
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
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () => _showAddChild(context),
                    icon: const Icon(Icons.add),
                    label: const Text('Add child'),
                  ),
                ],
              ),
            );
          } else {
            final list = state.children;
            body = Stack(
              children: [
                ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final c = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(c.fullName),
                        subtitle: c.dateOfBirth != null ? Text('DOB: ${c.dateOfBirth}') : null,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).pushNamed('/child_detail', arguments: c),
                      ),
                    );
                  },
                ),
                if (state.isLoading) const Positioned.fill(child: ColoredBox(color: Color(0x20000000), child: Center(child: CircularProgressIndicator()))),
              ],
            );
          }
          return Scaffold(
            appBar: AppBar(
              title: const Text('Children'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () {
                    authRepository.setToken(null);
                    Navigator.of(context).pushReplacementNamed('/login');
                  },
                ),
              ],
            ),
            body: body,
            floatingActionButton: state.children.isNotEmpty
                ? FloatingActionButton(
                    onPressed: () => _showAddChild(context),
                    child: const Icon(Icons.add),
                  )
                : null,
          );
        },
      );
  }

  void _showAddChild(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _AddChildSheet(
        onSubmit: (firstName, lastName, dateOfBirth, notes) {
          context.read<ChildrenBloc>().add(ChildrenCreateRequested(
                firstName: firstName,
                lastName: lastName,
                dateOfBirth: dateOfBirth,
                notes: notes,
              ));
          Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _AddChildSheet extends StatefulWidget {
  final void Function(String firstName, String lastName, String? dateOfBirth, String? notes) onSubmit;

  const _AddChildSheet({required this.onSubmit});

  @override
  State<_AddChildSheet> createState() => _AddChildSheetState();
}

class _AddChildSheetState extends State<_AddChildSheet> {
  final _fn = TextEditingController();
  final _ln = TextEditingController();
  final _notes = TextEditingController();
  String? _dob;

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
            TextField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes'), maxLines: 2),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                if (_fn.text.trim().isEmpty || _ln.text.trim().isEmpty) return;
                widget.onSubmit(_fn.text.trim(), _ln.text.trim(), _dob, _notes.text.trim().isEmpty ? null : _notes.text.trim());
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}
