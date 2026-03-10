import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:table_calendar/table_calendar.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';
import '../../../core/utils/date_format.dart';

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
    _selectedDay = _focusedDay;
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
                firstDay: DateTime.utc(2020, 10, 16),
                lastDay: DateTime.utc(2030, 3, 14),
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
                        padding: const EdgeInsets.all(16),
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
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Time: ${formatAppTimeString(appt.startTime)} - ${formatAppTimeString(appt.endTime)}',
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
                                  
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
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
                                    ],
                                  ),
                                ],
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
}
