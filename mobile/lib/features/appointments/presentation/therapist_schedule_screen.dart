import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:table_calendar/table_calendar.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/sessions_bloc.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/session_form_screen.dart';
import 'package:helixcareai_mobile/core/di/injection.dart';
import 'package:helixcareai_mobile/features/children/data/children_repository.dart';
import 'package:helixcareai_mobile/core/utils/date_format.dart';
import '../../sessions/presentation/session_detail_screen.dart';
import '../../sessions/data/sessions_repository.dart';
import '../../auth/data/auth_repository.dart';
import '../../sessions/domain/session_entity.dart';

class TherapistScheduleScreen extends StatefulWidget {
  final String therapistId;
  const TherapistScheduleScreen({super.key, required this.therapistId});

  @override
  State<TherapistScheduleScreen> createState() => _TherapistScheduleScreenState();
}

class _TherapistScheduleScreenState extends State<TherapistScheduleScreen> {
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
    // Load ALL appointments for the therapist (no date filter in request 
    // to allow TableCalendar to show dots for all days)
    context.read<AppointmentsBloc>().add(AppointmentsListRequested(
          therapistId: widget.therapistId,
        ));
  }

  List<AppointmentEntity> _getEventsForDay(List<AppointmentEntity> appointments, DateTime day) {
    return appointments.where((appt) {
      if (appt.status == AppointmentStatus.cancelled) return false;
      return isSameDay(appt.appointmentDate, day);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Schedule'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAppointments),
        ],
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
                    ? const Center(child: Text('No appointments for this date.', style: TextStyle(color: Colors.grey)))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                        itemCount: selectedAppointments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final appt = selectedAppointments[index];
                          final isCompleted = appt.status == AppointmentStatus.completed;

                          Color statusColor = Colors.grey;
                          if (appt.status == AppointmentStatus.approved) statusColor = Colors.green;
                          if (appt.status == AppointmentStatus.completed) statusColor = Colors.blue;

                          return Card(
                            child: ListTile(
                              onTap: appt.sessionId != null
                                  ? () => _viewSession(appt)
                                  : (appt.status == AppointmentStatus.approved ? () => _navigateToLogSession(appt) : null),
                              title: Text(
                                '${formatAppDate(appt.appointmentDate)}  •  ${formatAppTimeString(appt.startTime)} - ${formatAppTimeString(appt.endTime)}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('Child: ${appt.childFullName}'),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Text('Status: '),
                                      Text(
                                        appt.status.toString().split('.').last.toUpperCase(),
                                        style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                  if (appt.sessionId != null) ...[
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Logged (Click to view)',
                                      style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ],
                              ),
                              isThreeLine: true,
                              trailing: (appt.status == AppointmentStatus.approved)
                                  ? ElevatedButton(
                                      onPressed: () => appt.sessionId != null ? _viewSession(appt) : _navigateToLogSession(appt),
                                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                                      child: Text(appt.sessionId != null ? 'View/Edit Session' : 'Log Session'),
                                    )
                                  : (isCompleted && appt.sessionId != null
                                      ? OutlinedButton(
                                          onPressed: () => _viewSession(appt),
                                          child: const Text('View Session'),
                                        )
                                      : (isCompleted ? const Icon(Icons.check_circle, color: Colors.green) : null)),
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText('Failed to load info: $e')));
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
