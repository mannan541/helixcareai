import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../auth/domain/user_entity.dart';
import '../../children/domain/child_entity.dart';
import '../domain/clinic_slot_entity.dart';
import '../../../core/di/injection.dart';
import 'appointments_bloc.dart';

class AppointmentBookingScreen extends StatefulWidget {
  final ChildEntity? child;
  final bool adminMode; // admin booking = auto-approved
  const AppointmentBookingScreen({super.key, this.child, this.adminMode = false});

  @override
  State<AppointmentBookingScreen> createState() => _AppointmentBookingScreenState();
}

class _AppointmentBookingScreenState extends State<AppointmentBookingScreen> {
  DateTime _selectedDate = DateTime.now();
  UserEntity? _selectedTherapist;
  ClinicSlotEntity? _selectedSlot;
  List<ClinicSlotEntity> _clinicSlots = [];
  List<Map<String, dynamic>> _bookedSlots = [];
  bool _isLoadingSlots = false;
  bool _isLoadingClinicSlots = true;
  ChildEntity? _selectedChild;

  @override
  void initState() {
    super.initState();
    _selectedChild = widget.child;
    _loadClinicSlots();
  }

  Future<void> _loadClinicSlots() async {
    try {
      final dayOfWeek = _selectedDate.weekday % 7; // Dart: Mon=1..Sun=7, convert to 0=Sun
      final slots = await appointmentsRepository.listClinicSlots(dayOfWeek: dayOfWeek);
      if (mounted) {
        setState(() {
          _clinicSlots = slots.where((s) => s.isActive && !s.isBlocked).toList();
          _isLoadingClinicSlots = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingClinicSlots = false);
    }
  }

  Future<void> _fetchBookedSlots() async {
    if (_selectedTherapist == null) return;
    setState(() => _isLoadingSlots = true);
    try {
      final dateStr = _selectedDate.toIso8601String().split('T').first;
      final slots = await appointmentsRepository.getBookedSlots(
        therapistId: _selectedTherapist!.id,
        date: dateStr,
      );
      setState(() {
        _bookedSlots = slots;
        _isLoadingSlots = false;
      });
    } catch (e) {
      setState(() => _isLoadingSlots = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load booked slots: $e')));
    }
  }

  bool _isSlotBooked(ClinicSlotEntity slot) {
    for (final b in _bookedSlots) {
      final bStart = b['start_time'].toString().substring(0, 5); // "09:00"
      final slotStart = slot.startTime.substring(0, 5);
      if (bStart == slotStart) return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.adminMode ? 'Book Appointment (Admin)' : 'Book Appointment'),
        backgroundColor: theme.colorScheme.surface,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // -- Child selection (admin only) --
            if (widget.adminMode && _selectedChild == null) ...[
              _sectionTitle('Child'),
              ListTile(
                title: const Text('Select Child'),
                trailing: const Icon(Icons.arrow_drop_down),
                tileColor: Colors.grey[100],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                onTap: () => _openChildPicker(),
              ),
              const SizedBox(height: 16),
            ] else if (_selectedChild != null) ...[
              _sectionTitle('Child'),
              ListTile(
                leading: const Icon(Icons.child_care, color: Colors.blue),
                title: Text('${_selectedChild!.firstName} ${_selectedChild!.lastName}'),
                trailing: widget.adminMode ? const Icon(Icons.swap_horiz) : null,
                tileColor: Colors.blue.shade50,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                onTap: widget.adminMode ? () => _openChildPicker() : null,
              ),
              const SizedBox(height: 16),
            ],

            // -- Therapist --
            _sectionTitle('Therapist'),
            const SizedBox(height: 8),
            ListTile(
              title: Text(_selectedTherapist?.fullName ?? 'Select Therapist'),
              subtitle: Text(_selectedTherapist?.email ?? 'Required to see availability'),
              trailing: const Icon(Icons.arrow_drop_down),
              tileColor: Colors.grey[100],
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              onTap: () => _openTherapistPicker(),
            ),

            const SizedBox(height: 16),

            // -- Date --
            _sectionTitle('Date'),
            const SizedBox(height: 8),
            ListTile(
              title: Text(_selectedDate.toString().split(' ').first),
              trailing: const Icon(Icons.calendar_today),
              tileColor: Colors.grey[100],
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: widget.adminMode
                      ? DateTime.now().subtract(const Duration(days: 365))
                      : DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 180)),
                );
                if (picked != null) {
                  setState(() {
                    _selectedDate = picked;
                    _selectedSlot = null;
                  });
                  _loadClinicSlots();
                  _fetchBookedSlots();
                }
              },
            ),

            const SizedBox(height: 24),

            // -- Time slots --
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _sectionTitle('Available Slots (45 min)'),
                if (_isLoadingSlots || _isLoadingClinicSlots)
                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
            const SizedBox(height: 12),

            if (_isLoadingClinicSlots)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Loading slots...')))
            else if (_selectedTherapist == null)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Please select a therapist first')))
            else if (_clinicSlots.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No time slots configured for this day.')))
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 2.8,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: _clinicSlots.length,
                itemBuilder: (context, index) {
                  final slot = _clinicSlots[index];
                  final isBooked = _isSlotBooked(slot);
                  // Admins can override booked slots
                  final canSelect = !isBooked || widget.adminMode;
                  final isSelected = _selectedSlot?.id == slot.id;

                  Color bgColor;
                  Color textColor;
                  if (isBooked && !widget.adminMode) {
                    bgColor = Colors.grey[200]!;
                    textColor = Colors.grey[500]!;
                  } else if (isBooked && widget.adminMode) {
                    bgColor = isSelected ? theme.colorScheme.primary : Colors.orange.shade100;
                    textColor = isSelected ? Colors.white : Colors.orange.shade800;
                  } else {
                    bgColor = isSelected ? theme.colorScheme.primary : Colors.white;
                    textColor = isSelected ? Colors.white : Colors.black87;
                  }

                  return InkWell(
                    onTap: canSelect ? () => setState(() => _selectedSlot = slot) : null,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      decoration: BoxDecoration(
                        color: bgColor,
                        border: Border.all(
                          color: isSelected ? theme.colorScheme.primary : Colors.grey[300]!,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            slot.label,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textColor),
                            textAlign: TextAlign.center,
                          ),
                          if (isBooked)
                            Text(
                              widget.adminMode ? '(booked – override)' : 'Booked',
                              style: TextStyle(fontSize: 9, color: textColor),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: (_selectedSlot == null || _selectedChild == null || _selectedTherapist == null)
                    ? null
                    : _submit,
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: Text(widget.adminMode ? 'Book Now (Approved)' : 'Request Booking'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) => Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15));

  void _submit() {
    final slot = _selectedSlot!;
    final startTime = slot.startTime; // already "HH:mm:ss"
    final endTime = slot.endTime;

    context.read<AppointmentsBloc>().add(AppointmentCreateRequested(
          childId: _selectedChild!.id,
          therapistId: _selectedTherapist!.id,
          date: _selectedDate,
          startTime: startTime,
          endTime: endTime,
        ));

    final msg = widget.adminMode ? 'Appointment booked and approved!' : 'Booking request sent for approval.';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.green));
    Navigator.of(context).pop();
  }

  Future<void> _openTherapistPicker() async {
    List<UserEntity> list = [];

    Future<void> loadTherapists(String q) async {
      final res = await authRepository.getTherapists(limit: 50, offset: 0, search: q.isEmpty ? null : q);
      list = res.users;
    }

    await loadTherapists('');
    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setDialogState) => AlertDialog(
          title: const Text('Select Therapist'),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  decoration: const InputDecoration(hintText: 'Search...', prefixIcon: Icon(Icons.search)),
                  onChanged: (v) => loadTherapists(v).then((_) => setDialogState(() {})),
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: list.length,
                    itemBuilder: (_, i) => ListTile(
                      title: Text(list[i].fullName),
                      subtitle: Text(list[i].email),
                      onTap: () {
                        setState(() => _selectedTherapist = list[i]);
                        _fetchBookedSlots();
                        Navigator.of(ctx).pop();
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openChildPicker() async {
    try {
      final res = await childrenRepository.list(limit: 100, offset: 0);
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Select Child'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: res.children.length,
              itemBuilder: (_, i) {
                final c = res.children[i];
                return ListTile(
                  title: Text('${c.firstName} ${c.lastName}'),
                  onTap: () {
                    setState(() => _selectedChild = c);
                    Navigator.of(ctx).pop();
                  },
                );
              },
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }
}
