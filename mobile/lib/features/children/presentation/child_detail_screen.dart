import 'package:flutter/material.dart';
import '../domain/child_entity.dart';

class ChildDetailScreen extends StatelessWidget {
  const ChildDetailScreen({super.key, required this.child});

  final ChildEntity child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(child.fullName)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.calendar_today),
              title: const Text('Sessions'),
              subtitle: const Text('Log and view sessions'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/sessions', arguments: child),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.show_chart),
              title: const Text('Performance'),
              subtitle: const Text('Charts and metrics'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/analytics', arguments: child),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.chat),
              title: const Text('Chatbot'),
              subtitle: const Text('Ask about this child\'s progress'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed('/chat', arguments: child),
            ),
          ),
        ],
      ),
    );
  }
}
