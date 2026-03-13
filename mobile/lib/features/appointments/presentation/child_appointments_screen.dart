import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:table_calendar/table_calendar.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';
import '../../../core/utils/date_format.dart';
import '../../sessions/presentation/sessions_bloc.dart';
import '../../sessions/presentation/session_detail_screen.dart';
import '../../sessions/domain/session_entity.dart';
import '../../../core/di/injection.dart';
import '../../children/domain/child_entity.dart';
import '../../sessions/presentation/session_form_screen.dart';

class ChildAppointmentsScreen extends StatefulWidget {
  final ChildEntity child;

  const ChildAppointmentsScreen({super.key, required this.child});

  @override
  State<ChildAppointmentsScreen> createState() => _ChildAppointmentsScreenState();
}

class _ChildAppointmentsScreenState extends State<ChildAppointmentsScreen> {
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
    context.read<AppointmentsBloc>().add(AppointmentsListRequested(childId: widget.child.id));
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
        title: Text('${widget.child.fullName}\'s Schedule'),
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
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                        itemCount: selectedAppointments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final appt = selectedAppointments[index];

                          Color statusColor = Colors.grey;
                          if (appt.status == AppointmentStatus.approved) statusColor = Colors.green;
                          if (appt.status == AppointmentStatus.completed) statusColor = Colors.blue;

                          return Card(
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: appt.sessionId != null
                                  ? () => _viewSession(appt)
                                  : (appt.status == AppointmentStatus.approved ? () => _navigateToLogSession(appt) : null),
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
                                    Text('Therapist: ${appt.therapistUser?.fullName ?? "Unassigned"}'),
                                    if (appt.sessionId != null) ...[
                                      const SizedBox(height: 4),
                                      const Text(
                                        'Logged (Click to view)',
                                        style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                                      ),
                                    ],
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

  Future<void> _viewSession(AppointmentEntity appt) async {
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
              child: widget.child,
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

  Future<void> _navigateToLogSession(AppointmentEntity appt) async {
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
              child: widget.child,
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
}
