import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:table_calendar/table_calendar.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';
import '../../../core/utils/date_format.dart';
import '../../sessions/presentation/sessions_bloc.dart';
import '../../sessions/presentation/session_form_screen.dart';
import '../../../core/di/injection.dart';
import '../../children/data/children_repository.dart';
import '../../sessions/data/sessions_repository.dart';
import '../../auth/data/auth_repository.dart';
import '../../sessions/presentation/session_detail_screen.dart';
import '../../sessions/domain/session_entity.dart';

class AdminAppointmentApprovalScreen extends StatefulWidget {
  const AdminAppointmentApprovalScreen({super.key});

  @override
  State<AdminAppointmentApprovalScreen> createState() => _AdminAppointmentApprovalScreenState();
}

class _AdminAppointmentApprovalScreenState extends State<AdminAppointmentApprovalScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDay = DateTime(now.year, now.month, now.day);
    _focusedDay = _selectedDay!;
    _loadAppointments();
  }

  void _loadAppointments() {
    // Load ALL appointments (no status filter) so they show as dots
    context.read<AppointmentsBloc>().add(const AppointmentsListRequested());
  }

  List<AppointmentEntity> _getEventsForDay(List<AppointmentEntity> appointments, DateTime day) {
    return appointments.where((appt) {
      return isSameDay(appt.appointmentDate, day);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Appointments Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAppointments),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Add Appointment'),
        onPressed: () {
          Navigator.of(context).pushNamed('/admin_book_appointment').then((_) {
            _loadAppointments();
          });
        },
      ),
      body: BlocBuilder<AppointmentsBloc, AppointmentsState>(
        builder: (context, state) {
          if (state.isLoading && state.appointments.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.error != null) {
            return Center(child: SelectableText('Error: ${state.error}'));
          }

          final allAppointments = state.appointments;
          final selectedAppointments = _selectedDay != null
              ? _getEventsForDay(allAppointments, _selectedDay!)
              : [];

          return Column(
            children: [
              TableCalendar<AppointmentEntity>(
                firstDay: DateTime(2020, 10, 16),
                lastDay: DateTime(2030, 3, 14),
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                eventLoader: (day) => _getEventsForDay(allAppointments, day),
                calendarStyle: const CalendarStyle(
                  markerDecoration: BoxDecoration(
                    color: Colors.blue,
                    shape: BoxShape.circle,
                  ),
                ),
                headerStyle: const HeaderStyle(
                  formatButtonVisible: false,
                  titleCentered: true,
                ),
              ),
              const Divider(),
              Expanded(
                child: selectedAppointments.isEmpty
                    ? const Center(child: Text('No booked slots for this date.', style: TextStyle(color: Colors.grey)))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                        itemCount: selectedAppointments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final appt = selectedAppointments[index];
                          final isPending = appt.status == AppointmentStatus.pending;
                          
                          Color statusColor = Colors.grey;
                          if (appt.status == AppointmentStatus.approved) statusColor = Colors.green;
                          if (appt.status == AppointmentStatus.cancelled) statusColor = Colors.red;
                          if (appt.status == AppointmentStatus.completed) statusColor = Colors.blue;

                          return Card(
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: appt.sessionId != null ? () => _viewSession(appt) : null,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          '${formatAppDate(appt.appointmentDate)}  •  ${formatAppTimeString(appt.startTime)} - ${formatAppTimeString(appt.endTime)}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                        Chip(
                                          label: Text(
                                            appt.status.toString().split('.').last.toUpperCase(),
                                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                          backgroundColor: statusColor,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text('Child: ${appt.childFullName}'),
                                    Text('Therapist: ${appt.therapistUser?.fullName ?? "Unassigned"}'),
                                    if (appt.sessionId != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'Logged by ${appt.sessionLoggedByName ?? '—'} (Click to view)',
                                        style: const TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                                          onPressed: () => _confirmDeleteAppointment(appt.id),
                                          tooltip: 'Hard Delete',
                                        ),
                                        const Spacer(),
                                        OutlinedButton(
                                          onPressed: () {
                                            Navigator.of(context).pushNamed('/admin_book_appointment', arguments: appt).then((_) {
                                              _loadAppointments();
                                            });
                                          },
                                          child: const Text('Edit / Reschedule'),
                                        ),
                                        if (isPending) ...[
                                          const SizedBox(width: 8),
                                          TextButton(
                                            onPressed: () => _updateStatus(appt.id, 'cancelled'),
                                            style: TextButton.styleFrom(foregroundColor: Colors.red),
                                            child: const Text('Cancel'),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            onPressed: () => _updateStatus(appt.id, 'approved'),
                                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                                            child: const Text('Approve'),
                                          ),
                                        ],
                                        if (appt.status == AppointmentStatus.approved) ...[
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            onPressed: () => _navigateToLogSession(appt),
                                            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                                            child: Text(appt.sessionId != null ? 'Edit Session' : 'Log Session'),
                                          ),
                                        ],
                                        if (appt.status == AppointmentStatus.completed && appt.sessionId != null) ...[
                                          const SizedBox(width: 8),
                                          OutlinedButton(
                                            onPressed: () => _viewSession(appt),
                                            child: const Text('View Session'),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _updateStatus(String id, String status) {
    context.read<AppointmentsBloc>().add(AppointmentStatusUpdateRequested(id: id, status: status));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Updating status to $status...')));
  }

  void _confirmDeleteAppointment(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hard delete appointment?'),
        content: const Text('This will permanently remove the record from the database. You cannot undo this.'),
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
    if (confirm == true) {
      context.read<AppointmentsBloc>().add(AppointmentDeleteRequested(id: id));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Deleting appointment...')));
    }
  }

  Future<void> _navigateToLogSession(AppointmentEntity appt) async {
    try {
      final child = await childrenRepository.getOne(appt.childId);
      
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
              child: child,
              session: existingSession,
              selectedAppointment: appt,
              onSaved: () {
                context.read<AppointmentsBloc>().add(AppointmentStatusUpdateRequested(
                      id: appt.id,
                      status: 'completed',
                    ));
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

  Future<void> _viewSession(AppointmentEntity appt) async {
    if (appt.sessionId == null) return;
    try {
      final child = await childrenRepository.getOne(appt.childId);
      final session = await sessionsRepository.getOne(appt.sessionId!);
      final me = await authRepository.me();
      if (!mounted) return;

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => SessionsBloc(sessionsRepository),
            child: SessionDetailScreen(
              child: child,
              session: session,
              onSaved: _loadAppointments,
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
}
