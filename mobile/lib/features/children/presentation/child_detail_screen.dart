import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../domain/child_entity.dart';
import 'children_bloc.dart';
import 'edit_child_screen.dart';

/// Arguments for the child detail route. Pass [childrenBloc] so Edit can refresh the list.
class ChildDetailArgs {
  const ChildDetailArgs({required this.child, required this.childrenBloc});
  final ChildEntity child;
  final ChildrenBloc childrenBloc;
}

class ChildDetailScreen extends StatefulWidget {
  const ChildDetailScreen({super.key, required this.child, this.childrenBloc});

  final ChildEntity child;
  final ChildrenBloc? childrenBloc;

  @override
  State<ChildDetailScreen> createState() => _ChildDetailScreenState();
}

class _ChildDetailScreenState extends State<ChildDetailScreen> {
  late ChildEntity _child;

  @override
  void initState() {
    super.initState();
    _child = widget.child;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_child.fullName),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _openEdit(context),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_child.dateOfBirth != null || _child.diagnosis != null || _child.referredBy != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_child.dateOfBirth != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('DOB: ${_child.dateOfBirth}', style: const TextStyle(fontWeight: FontWeight.w500)),
                      ),
                    if (_child.diagnosis != null && _child.diagnosis!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('Diagnosis: ${_child.diagnosis}', style: const TextStyle(fontWeight: FontWeight.w500)),
                      ),
                    if (_child.referredBy != null && _child.referredBy!.isNotEmpty)
                      Text('Referred by: ${_child.referredBy}', style: const TextStyle(fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Card(
            child: ListTile(
              leading: const Icon(Icons.calendar_today),
              title: const Text('Sessions'),
              subtitle: const Text('Log and view sessions'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/sessions', arguments: _child),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.show_chart),
              title: const Text('Performance'),
              subtitle: const Text('Charts and metrics'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/analytics', arguments: _child),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.chat),
              title: const Text('Chatbot'),
              subtitle: const Text('Ask about this child\'s progress'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/chat', arguments: _child),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openEdit(BuildContext context) async {
    final bloc = widget.childrenBloc;
    if (bloc == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot edit from this screen')),
      );
      return;
    }
    final updated = await Navigator.of(context).push<ChildEntity>(
      MaterialPageRoute(
        builder: (ctx) => BlocProvider.value(
          value: bloc,
          child: EditChildScreen(child: _child, repository: childrenRepository),
        ),
      ),
    );
    if (updated != null && mounted) setState(() => _child = updated);
  }
}
