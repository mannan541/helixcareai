import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../children/domain/child_entity.dart';
import '../domain/session_entity.dart';
import '../data/sessions_repository.dart';
import 'sessions_bloc.dart';
import 'session_detail_screen.dart';
import 'session_form_screen.dart';

/// Loads session and child by id, then shows [SessionDetailScreen].
/// Used when opening from a notification (deep link).
class SessionDetailRouteScreen extends StatefulWidget {
  const SessionDetailRouteScreen({super.key, required this.sessionId, required this.childId});

  final String sessionId;
  final String childId;

  @override
  State<SessionDetailRouteScreen> createState() => _SessionDetailRouteScreenState();
}

class _SessionDetailRouteScreenState extends State<SessionDetailRouteScreen> {
  ChildEntity? _child;
  SessionEntity? _session;
  bool? _canEdit;
  bool? _canAddNotes;
  bool? _canDeleteSession;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await authRepository.me();
      final child = await childrenRepository.getOne(widget.childId);
      final session = await sessionsRepository.getOne(widget.sessionId);
      if (!mounted) return;
      final isAdmin = user?.isAdmin ?? false;
      final isTherapist = user?.isTherapist ?? false;
      final isOwner = user != null && session.therapistId == user.id;

      setState(() {
        _child = child;
        _session = session;
        _canEdit = isAdmin || (isTherapist && isOwner);
        _canAddNotes = isAdmin || !isOwner;
        _canDeleteSession = isAdmin;
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
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _child == null || _session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'Session or child not found', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Back')),
            ],
          ),
        ),
      );
    }
    final child = _child!;
    final session = _session!;
    final canEdit = _canEdit ?? false;
    return BlocProvider(
      create: (_) => SessionsBloc(sessionsRepository)..add(SessionsLoadRequested(child.id)),
      child: SessionDetailScreen(
        child: child,
        session: session,
        canEdit: _canEdit ?? false,
        canAddNotes: _canAddNotes ?? true,
        onSaved: () {},
        canDeleteSession: _canDeleteSession ?? false,
      ),
    );
  }
}
