import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:helixcareai_mobile/core/di/injection.dart';
import 'package:helixcareai_mobile/core/utils/date_format.dart';
import 'package:helixcareai_mobile/features/sessions/domain/session_entity.dart';
import 'package:helixcareai_mobile/features/sessions/data/sessions_repository.dart';
import 'package:helixcareai_mobile/features/children/domain/child_entity.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/sessions_bloc.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/session_form_screen.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/session_detail_screen.dart';

class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key, this.showAppBar = true});
  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is! ChildEntity) {
      return Scaffold(
        appBar: showAppBar ? AppBar(title: const Text('Sessions')) : null,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.event_note, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Select a child from the Children list to view sessions.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                },
                child: const Text('Go to Children'),
              ),
            ],
          ),
        ),
      );
    }
    return BlocProvider(
      create: (_) => SessionsBloc(sessionsRepository)..add(SessionsLoadRequested(arg.id)),
      child: _SessionsView(child: arg, showAppBar: showAppBar),
    );
  }
}

class _SessionsView extends StatefulWidget {
  const _SessionsView({required this.child, required this.showAppBar});

  final ChildEntity child;
  final bool showAppBar;

  @override
  State<_SessionsView> createState() => _SessionsViewState();
}


class _SessionsViewState extends State<_SessionsView> {
  bool? _canEdit;
  bool? _canDeleteSession;
  String? _currentUserId;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((user) {
      if (mounted) setState(() {
        _canEdit = user?.isAdmin ?? false; // only admin can edit broadly; therapist check per-session below
        _canDeleteSession = user?.isAdmin ?? false;
        _currentUserId = user?.id;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = _canEdit ?? true;
    return Scaffold(
      appBar: widget.showAppBar ? AppBar(title: Text('Sessions — ${widget.child.fullName}')) : null,
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
                  final isMySession = _currentUserId != null &&
                      s.therapistUser != null &&
                      s.therapistUser!.id == _currentUserId;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      title: Row(
                        children: [
                          Expanded(child: Text(formatAppDate(s.sessionDate))),
                          if (isMySession)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primaryContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Your session',
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            [
                              if (s.durationMinutes != null) '${s.durationMinutes} min',
                              if (s.notesText != null && s.notesText!.isNotEmpty) s.notesText,
                            ].join(' • '),
                          ),
                          if (s.therapistUser != null && !isMySession)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                'Conducted by ${s.therapistUser!.fullName}',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_canDeleteSession ?? false)
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.red),
                              onPressed: () => _confirmDeleteSession(context, s),
                            ),
                          const Icon(Icons.chevron_right),
                        ],
                      ),
                      onTap: () => _openSessionDetailOrForm(context, s),
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

  void _openSessionDetailOrForm(BuildContext context, SessionEntity session) {
    authRepository.me().then((user) {
      if (!context.mounted) return;
      final isAdmin = user?.isAdmin ?? false;
      final isTherapist = user?.isTherapist ?? false;
      final isOwner = _currentUserId != null && session.therapistId == _currentUserId;

      final canEdit = isAdmin || (isTherapist && isOwner);
      final canAddNotes = isAdmin || !isOwner; // Therapist cannot comment on own session, others and parents can.

      final bloc = context.read<SessionsBloc>();
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (ctx) => BlocProvider.value(
            value: bloc,
            child: SessionDetailScreen(
              child: widget.child,
              session: session,
              canEdit: canEdit,
              canAddNotes: canAddNotes,
              onSaved: () => bloc.add(SessionsLoadRequested(widget.child.id)),
              canDeleteSession: isAdmin,
            ),
          ),
        ),
      );
    });
  }

  Future<void> _confirmDeleteSession(BuildContext context, SessionEntity session) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete session?'),
        content: const Text('This session will be permanently deleted. You cannot undo this.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    context.read<SessionsBloc>().add(SessionDeleteRequested(session.id));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Delete request sent')));
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
