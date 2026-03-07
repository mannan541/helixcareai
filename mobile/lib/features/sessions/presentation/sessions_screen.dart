import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/di/injection.dart';
import '../domain/session_entity.dart';
import '../data/sessions_repository.dart';
import '../../children/domain/child_entity.dart';
import 'sessions_bloc.dart';
import 'session_form_screen.dart';
import 'session_detail_screen.dart';

class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)?.settings.arguments;
    if (child is! ChildEntity) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sessions')),
        body: const Center(child: Text('Select a child from the list first.')),
      );
    }
    return BlocProvider(
      create: (_) => SessionsBloc(sessionsRepository)..add(SessionsLoadRequested(child.id)),
      child: _SessionsView(child: child),
    );
  }
}

class _SessionsView extends StatefulWidget {
  const _SessionsView({required this.child});

  final ChildEntity child;

  @override
  State<_SessionsView> createState() => _SessionsViewState();
}

class _SessionsViewState extends State<_SessionsView> {
  bool? _canEdit;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((user) {
      if (mounted) setState(() {
        _canEdit = user != null && (user.isAdmin || user.isTherapist);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = _canEdit ?? true;
    return Scaffold(
      appBar: AppBar(title: Text('Sessions — ${widget.child.fullName}')),
      body: BlocConsumer<SessionsBloc, SessionsState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
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
                  SelectableText(state.error!, textAlign: TextAlign.center),
                  TextButton(
                    onPressed: () => context.read<SessionsBloc>().add(SessionsLoadRequested(widget.child.id)),
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
                  if (canEdit) ...[
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: () => _openSessionForm(context, null),
                      icon: const Icon(Icons.add),
                      label: const Text('Log session'),
                    ),
                  ],
                ],
              ),
            );
          }
          return Stack(
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
                                onPressed: () => context.read<SessionsBloc>().add(SessionsLoadRequested(widget.child.id, loadMore: true)),
                                child: Text('Load more (${list.length} of ${state.total})'),
                              ),
                      ),
                    );
                  }
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
                      onTap: () => _openSessionDetailOrForm(context, s, canEdit),
                    ),
                  );
                },
              ),
              if (state.isLoading && list.isEmpty)
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
      floatingActionButton: canEdit
          ? FloatingActionButton(
              onPressed: () => _openSessionForm(context, null),
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  void _openSessionDetailOrForm(BuildContext context, SessionEntity session, bool canEdit) {
    final bloc = context.read<SessionsBloc>();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => BlocProvider.value(
          value: bloc,
          child: SessionDetailScreen(
            child: widget.child,
            session: session,
            canEdit: canEdit,
            canAddNotes: !canEdit,
            onSaved: () => bloc.add(SessionsLoadRequested(widget.child.id)),
          ),
        ),
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
            child: widget.child,
            session: session,
            onSaved: () => bloc.add(SessionsLoadRequested(widget.child.id)),
          ),
        ),
      ),
    );
  }
}
