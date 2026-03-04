import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/di/injection.dart';
import '../domain/session_entity.dart';
import '../../children/domain/child_entity.dart';
import 'sessions_bloc.dart';
import 'session_form_screen.dart';

class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)!.settings.arguments as ChildEntity;
    return BlocProvider(
      create: (_) => SessionsBloc(sessionsRepository)..add(SessionsLoadRequested(child.id)),
      child: _SessionsView(child: child),
    );
  }
}

class _SessionsView extends StatelessWidget {
  const _SessionsView({required this.child});

  final ChildEntity child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Sessions — ${child.fullName}')),
      body: BlocConsumer<SessionsBloc, SessionsState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!)));
          }
        },
        builder: (context, state) {
          if (state.isLoading && state.sessions.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.error != null && state.sessions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.error!, textAlign: TextAlign.center),
                  TextButton(
                    onPressed: () => context.read<SessionsBloc>().add(SessionsLoadRequested(child.id)),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          final list = state.sessions;
          if (list.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.event_note, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No sessions yet'),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () => _openSessionForm(context, null),
                    icon: const Icon(Icons.add),
                    label: const Text('Log session'),
                  ),
                ],
              ),
            );
          }
          return Stack(
            children: [
              ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final s = list[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      title: Text(DateFormat.yMMMd().format(s.sessionDate)),
                      subtitle: Text(
                        [
                          if (s.durationMinutes != null) '${s.durationMinutes} min',
                          if (s.notesText != null && s.notesText!.isNotEmpty) s.notesText,
                        ].join(' • '),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _openSessionForm(context, s),
                    ),
                  );
                },
              ),
              if (state.isLoading)
                const Positioned.fill(
                  child: ColoredBox(
                    color: Color(0x20000000),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openSessionForm(context, null),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openSessionForm(BuildContext context, SessionEntity? session) {
    final bloc = context.read<SessionsBloc>();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => BlocProvider.value(
          value: bloc,
          child: SessionFormScreen(
            child: child,
            session: session,
            onSaved: () => bloc.add(SessionsLoadRequested(child.id)),
          ),
        ),
      ),
    );
  }
}
