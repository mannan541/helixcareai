import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/di/injection.dart';
import '../domain/session_entity.dart';
import '../data/sessions_repository.dart';
import '../../children/domain/child_entity.dart';
import 'sessions_bloc.dart';
import 'session_form_screen.dart';

String _formatDateTime(DateTime dt) {
  return DateFormat('d MMM yyyy, h:mm a').format(dt);
}

class SessionDetailScreen extends StatefulWidget {
  const SessionDetailScreen({
    super.key,
    required this.child,
    required this.session,
    required this.canEdit,
    required this.canAddNotes,
    required this.onSaved,
  });

  final ChildEntity child;
  final SessionEntity session;
  /// Admin and therapist can edit the session.
  final bool canEdit;
  /// Only parents can add notes (comments) on a session.
  final bool canAddNotes;
  final VoidCallback onSaved;

  @override
  State<SessionDetailScreen> createState() => _SessionDetailScreenState();
}

class _SessionDetailScreenState extends State<SessionDetailScreen> {
  List<SessionCommentEntity> _comments = [];
  bool _loadingComments = true;
  final _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() => _loadingComments = true);
    try {
      final list = await sessionsRepository.listComments(widget.session.id);
      if (mounted) setState(() {
        _comments = list;
        _loadingComments = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingComments = false);
    }
  }

  Future<void> _addComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    try {
      await sessionsRepository.addComment(widget.session.id, text);
      _commentController.clear();
      _loadComments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText(e is Exception ? e.toString() : 'Failed to add comment')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.session;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Session'),
        actions: [
          if (widget.canEdit)
            TextButton(
              onPressed: () async {
                final bloc = context.read<SessionsBloc>();
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (ctx) => BlocProvider.value(
                      value: bloc,
                      child: SessionFormScreen(
                        child: widget.child,
                        session: s,
                        onSaved: widget.onSaved,
                      ),
                    ),
                  ),
                );
                widget.onSaved();
                if (context.mounted) Navigator.of(context).pop();
              },
              child: const Text('Edit'),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Created by', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            s.createdByUser != null ? '${s.createdByUser!.fullName} (${s.createdByUser!.email})' : '—',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          const Text('Therapist', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            s.therapistUser != null ? '${s.therapistUser!.fullName} (${s.therapistUser!.email})' : '—',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          Text('Created: ${_formatDateTime(s.createdAt)}', style: Theme.of(context).textTheme.bodySmall),
          if (s.updatedByUser != null || s.updatedAt.isAfter(s.createdAt)) ...[
            const SizedBox(height: 4),
            Text('Updated: ${_formatDateTime(s.updatedAt)}', style: Theme.of(context).textTheme.bodySmall),
            if (s.updatedByUser != null)
              Text('Updated by: ${s.updatedByUser!.fullName}', style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 16),
          Text('Session date: ${DateFormat.yMMMd().format(s.sessionDate)}', style: Theme.of(context).textTheme.bodyMedium),
          if (s.durationMinutes != null) Text('Duration: ${s.durationMinutes} min', style: Theme.of(context).textTheme.bodyMedium),
          if (s.notesText != null && s.notesText!.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Therapist Notes', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(s.notesText!, style: Theme.of(context).textTheme.bodyMedium),
          ],
          if (s.structuredMetrics.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Structured metrics', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            ...s.structuredMetrics.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('${e.key}: ${e.value}', style: Theme.of(context).textTheme.bodyMedium),
                )),
          ],
          const SizedBox(height: 24),
          const Text("Parent's Notes", style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_loadingComments)
            const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
          else if (_comments.isEmpty)
            Text("No parent's notes yet.", style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey))
          else
            ..._comments.map((c) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.userFullName ?? c.userId, style: const TextStyle(fontWeight: FontWeight.w600)),
                        if (c.userEmail != null) Text(c.userEmail!, style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 4),
                        Text(c.comment),
                        const SizedBox(height: 4),
                        Text(DateFormat('d MMM yyyy, h:mm a').format(c.createdAt), style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                )),
          if (widget.canAddNotes) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: const InputDecoration(
                      hintText: "Add a parent's note...",
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _addComment,
                  child: const Text('Post'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
