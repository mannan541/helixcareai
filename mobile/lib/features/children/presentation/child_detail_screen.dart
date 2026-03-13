import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../domain/child_entity.dart';
import 'children_bloc.dart';
import 'edit_child_screen.dart';
import '../../appointments/domain/appointment_entity.dart';
import '../../appointments/presentation/appointments_bloc.dart';
import '../../sessions/domain/session_entity.dart';
import '../../sessions/data/sessions_repository.dart';
import '../../sessions/presentation/sessions_bloc.dart';
import '../../sessions/presentation/session_detail_screen.dart';
import '../../sessions/presentation/session_form_screen.dart';
import '../../auth/data/auth_repository.dart';
import '../../../core/widgets/linkable_text.dart';

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
  bool _canDeleteChild = false;

  @override
  void initState() {
    super.initState();
    _child = widget.child;
    authRepository.me().then((user) {
      if (mounted) setState(() => _canDeleteChild = user?.isAdmin == true);
    });
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
          if (_canDeleteChild)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _confirmDeleteChild(context),
              tooltip: 'Delete child (admin only)',
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('ID: ${_child.id}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Theme.of(context).textTheme.bodySmall?.color)),
                  ),
                  if (_child.childCode != null && _child.childCode!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('Child code: ${_child.childCode}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  if (_child.dateOfBirth != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('DOB: ${formatAppDateFromString(_child.dateOfBirth) ?? _child.dateOfBirth}', style: const TextStyle(fontWeight: FontWeight.w500)),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: LinkableText('Diagnosis: ${_child.diagnosis}', style: const TextStyle(fontWeight: FontWeight.w500)),
                    ),
                  if (_child.notes != null && _child.notes!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: LinkableText('Notes: ${_child.notes}', style: const TextStyle(fontWeight: FontWeight.w500)),
                    ),
                  if (_child.behavioralNotes != null && _child.behavioralNotes!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: LinkableText('Behavioral notes: ${_child.behavioralNotes}', style: const TextStyle(fontWeight: FontWeight.w500)),
                    ),
                  if (_child.referredBy != null && _child.referredBy!.isNotEmpty)
                    Text('Referred by: ${_child.referredBy}', style: const TextStyle(fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
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
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Booked Appointments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              TextButton(
                onPressed: () => Navigator.of(context).pushNamed('/child_schedule', arguments: _child),
                child: const Text('View Calendar'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FutureBuilder<List<AppointmentEntity>>(
            future: appointmentsRepository.listAppointments(childId: _child.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Text('Error: ${snapshot.error}');
              }
              var appts = snapshot.data ?? [];
              appts = appts.where((a) => a.status != AppointmentStatus.cancelled).toList();

              if (appts.isEmpty) {
                return const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No appointments booked')));
              }
              return Column(
                children: appts.map((appt) {
                  return Card(
                    clipBehavior: Clip.antiAlias,
                    child: ListTile(
                      onTap: appt.sessionId != null
                          ? () => _viewSession(context, appt)
                          : (appt.status == AppointmentStatus.approved
                              ? () => _navigateToLogSession(context, appt)
                              : null),
                      leading: const Icon(Icons.event),
                      title: Text('${formatAppDate(appt.appointmentDate)}  •  ${formatAppTimeString(appt.startTime)} - ${formatAppTimeString(appt.endTime)}'),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Therapist: ${appt.therapistUser?.fullName} - Status: ${appt.status.toString().split('.').last.toUpperCase()}'),
                          if (appt.sessionId != null)
                            const Text(
                              'Logged (Click to view)',
                              style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                            ),
                        ],
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit_calendar, color: Colors.blue),
                        tooltip: 'Reschedule',
                        onPressed: () {
                          // Allow parent to request a reschedule via the normal booking flow
                          Navigator.of(context).pushNamed('/book_appointment', arguments: appt).then((_) {
                            // refresh appointments list
                            setState(() {});
                          });
                        },
                      ),
                    ),
                  );
                }).toList(),
              );
            },
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

  Future<void> _confirmDeleteChild(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete child?'),
        content: Text('This will remove "${_child.fullName}" from the list. Session and therapy data are retained for records. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await childrenRepository.delete(_child.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Child deleted')));
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to delete: ${e.toString()}')));
    }
  }

  Future<void> _viewSession(BuildContext context, AppointmentEntity appt) async {
    if (appt.sessionId == null) return;
    try {
      final session = await sessionsRepository.getOne(appt.sessionId!);
      final me = await authRepository.me();
      if (!mounted) return;

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => SessionsBloc(sessionsRepository),
            child: SessionDetailScreen(
              child: _child,
              session: session,
              onSaved: () => setState(() {}),
              canEdit: me?.role == 'admin' || me?.id == session.therapistId,
              canAddNotes: true,
              canDeleteSession: me?.role == 'admin',
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText('Failed to load session: $e')));
      }
    }
  }

  Future<void> _navigateToLogSession(BuildContext context, AppointmentEntity appt) async {
    // Only therapists and admins can log sessions
    final me = await authRepository.me();
    if (me?.role == 'parent') return;

    try {
      SessionEntity? existingSession;
      if (appt.sessionId != null) {
        existingSession = await sessionsRepository.getOne(appt.sessionId!);
      }

      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => SessionsBloc(sessionsRepository),
            child: SessionFormScreen(
              child: _child,
              session: existingSession,
              selectedAppointment: appt,
              onSaved: () {
                appointmentsRepository.updateStatus(appt.id, 'completed').then((_) {
                  if (mounted) setState(() {});
                });
              },
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText('Failed to load info: $e')));
      }
    }
  }
}
