import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../auth/data/auth_repository.dart';
import '../domain/session_entity.dart';
import '../data/sessions_repository.dart';
import '../../children/domain/child_entity.dart';
import 'sessions_bloc.dart';
import 'session_form_screen.dart';

class SessionDetailScreen extends StatefulWidget {
  const SessionDetailScreen({
    super.key,
    required this.child,
    required this.session,
    required this.canEdit,
    required this.canAddNotes,
    required this.onSaved,
    this.canDeleteSession = false,
  });

  final ChildEntity child;
  final SessionEntity session;
  /// Admin and therapist can edit the session.
  final bool canEdit;
  /// Whether the user can add notes (comments) on a session (parent, therapist, admin).
  final bool canAddNotes;
  final VoidCallback onSaved;
  /// Only admin can delete the session.
  final bool canDeleteSession;

  @override
  State<SessionDetailScreen> createState() => _SessionDetailScreenState();
}

class _SessionDetailScreenState extends State<SessionDetailScreen> {
  List<SessionCommentEntity> _comments = [];
  bool _loadingComments = true;
  bool _postingComment = false;
  String? _currentUserId;
  final _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    authRepository.me().then((u) {
      if (mounted) setState(() => _currentUserId = u?.id);
    });
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
    setState(() => _postingComment = true);
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
    } finally {
      if (mounted) setState(() => _postingComment = false);
    }
  }

  Future<void> _editComment(SessionCommentEntity c) async {
    final controller = TextEditingController(text: c.comment);
    final updated = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Edit note"),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: "Note text",
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) Navigator.pop(ctx, text);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (updated == null || !mounted) return;
    try {
      await sessionsRepository.updateComment(widget.session.id, c.id, updated);
      if (mounted) _loadComments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText(e is Exception ? e.toString() : 'Failed to update note')),
        );
      }
    }
  }

  Future<void> _deleteComment(SessionCommentEntity c) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete note?'),
        content: const Text('This note will be removed. You cannot undo this.'),
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
    try {
      await sessionsRepository.deleteComment(widget.session.id, c.id);
      if (mounted) _loadComments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText(e is Exception ? e.toString() : 'Failed to delete note')),
        );
      }
    }
  }

  Future<void> _deleteSession() async {
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
    try {
      await sessionsRepository.deleteSession(widget.session.id);
      if (!mounted) return;
      widget.onSaved();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Session deleted')));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText(e is Exception ? e.toString() : 'Failed to delete session')),
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
          if (widget.canDeleteSession)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Delete session',
              onPressed: _deleteSession,
            ),
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
          if (s.therapistUser?.mobileNumber != null && s.therapistUser!.mobileNumber!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Mobile: ${s.therapistUser!.mobileNumber}', style: Theme.of(context).textTheme.bodyMedium),
          ],
          const SizedBox(height: 12),
          Text('Created: ${formatAppDateTime(s.createdAt)}', style: Theme.of(context).textTheme.bodySmall),
          if (s.updatedByUser != null || s.updatedAt.isAfter(s.createdAt)) ...[
            const SizedBox(height: 4),
            Text('Updated: ${formatAppDateTime(s.updatedAt)}', style: Theme.of(context).textTheme.bodySmall),
            if (s.updatedByUser != null)
              Text('Updated by: ${s.updatedByUser!.fullName}', style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 16),
          Text('Session date: ${formatAppDate(s.sessionDate)}', style: Theme.of(context).textTheme.bodyMedium),
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
          const Text('Notes', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_loadingComments)
            const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
          else if (_comments.isEmpty)
            Text('No notes yet.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey))
          else
            ..._comments.map((c) {
              final canEditComment = _currentUserId != null && c.userId == _currentUserId;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.userFullName ?? c.userId, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  if (c.userEmail != null) Text(c.userEmail!, style: Theme.of(context).textTheme.bodySmall),
                                ],
                              ),
                            ),
                          if (canEditComment) ...[
                            IconButton(
                              icon: const Icon(Icons.edit_outlined),
                              tooltip: 'Edit note',
                              onPressed: () => _editComment(c),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline),
                              tooltip: 'Delete note',
                              onPressed: () => _deleteComment(c),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(c.comment),
                      const SizedBox(height: 4),
                      Text(formatAppDateTime(c.createdAt), style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
              );
            }),
          if (widget.canAddNotes) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: const InputDecoration(
                      hintText: 'Add a note...',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _postingComment ? null : _addComment,
                  child: _postingComment
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Post'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
