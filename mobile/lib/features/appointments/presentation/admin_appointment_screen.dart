import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../domain/appointment_entity.dart';
import 'appointments_bloc.dart';

class AdminAppointmentApprovalScreen extends StatefulWidget {
  const AdminAppointmentApprovalScreen({super.key});

  @override
  State<AdminAppointmentApprovalScreen> createState() => _AdminAppointmentApprovalScreenState();
}

class _AdminAppointmentApprovalScreenState extends State<AdminAppointmentApprovalScreen> {
  @override
  void initState() {
    super.initState();
    _loadPending();
  }

  void _loadPending() {
    context.read<AppointmentsBloc>().add(const AppointmentsListRequested(status: 'pending'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pending Appointments')),
      body: BlocBuilder<AppointmentsBloc, AppointmentsState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());
          if (state.error != null) return Center(child: Text('Error: ${state.error}'));

          final pending = state.appointments;

          if (pending.isEmpty) {
            return const Center(child: Text('No pending appointment requests'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: pending.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final appt = pending[index];

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Date: ${appt.appointmentDate.toString().split(' ').first}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text('Time: ${appt.startTime} - ${appt.endTime}'),
                      const SizedBox(height: 8),
                      Text('Child: ${appt.childFullName}'),
                      Text('Therapist: ${appt.therapistUser?.fullName}'),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
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
                      ),
                    ],
                  ),
                ),
              );
            },
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
