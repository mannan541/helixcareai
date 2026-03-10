import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';
import '../../sessions/presentation/session_form_screen.dart';
import '../../../core/di/injection.dart';
import '../../children/data/children_repository.dart';

class TherapistScheduleScreen extends StatefulWidget {
  final String therapistId;
  const TherapistScheduleScreen({super.key, required this.therapistId});

  @override
  State<TherapistScheduleScreen> createState() => _TherapistScheduleScreenState();
}

class _TherapistScheduleScreenState extends State<TherapistScheduleScreen> {
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  void _loadAppointments() {
    context.read<AppointmentsBloc>().add(AppointmentsListRequested(
          date: _selectedDate.toIso8601String().split('T').first,
          therapistId: widget.therapistId,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Schedule'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime.now().subtract(const Duration(days: 30)),
                lastDate: DateTime.now().add(const Duration(days: 90)),
              );
              if (picked != null) {
                setState(() => _selectedDate = picked);
                _loadAppointments();
              }
            },
          ),
        ],
      ),
      body: BlocBuilder<AppointmentsBloc, AppointmentsState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());
          if (state.error != null) return Center(child: SelectableText('Error: ${state.error}'));

          final appointments = state.appointments;

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: appointments.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final appt = appointments[index];
              final isCompleted = appt.status == AppointmentStatus.completed;

              return Card(
                child: ListTile(
                  title: Text('${appt.startTime} - ${appt.endTime}'),
                  subtitle: Text('Child: ${appt.childFullName}\nStatus: ${appt.status.toString().split('.').last.toUpperCase()}'),
                  isThreeLine: true,
                  trailing: (appt.status == AppointmentStatus.approved)
                      ? ElevatedButton(
                          onPressed: () => _navigateToLogSession(appt),
                          child: const Text('Log Session'),
                        )
                      : (isCompleted ? const Icon(Icons.check_circle, color: Colors.green) : null),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _navigateToLogSession(AppointmentEntity appt) async {
    // Need to fetch full child entity first
    try {
      final child = await childrenRepository.getOne(appt.childId);
      if (!mounted) return;

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => SessionFormScreen(
            child: child,
            onSaved: () {
              // Update appointment status to completed after logging session
              context.read<AppointmentsBloc>().add(AppointmentStatusUpdateRequested(
                    id: appt.id,
                    status: 'completed',
                  ));
            },
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText('Failed to load child info: $e')));
    }
  }
}
