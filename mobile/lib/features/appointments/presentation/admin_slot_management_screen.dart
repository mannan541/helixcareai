import 'package:flutter/material.dart';
import '../domain/clinic_slot_entity.dart';
import '../../../core/di/injection.dart';

class AdminSlotManagementScreen extends StatefulWidget {
  const AdminSlotManagementScreen({super.key});

  @override
  State<AdminSlotManagementScreen> createState() => _AdminSlotManagementScreenState();
}

class _AdminSlotManagementScreenState extends State<AdminSlotManagementScreen> {
  List<ClinicSlotEntity> _slots = [];
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
      final slots = await appointmentsRepository.listClinicSlots();
      if (mounted) setState(() { _slots = slots; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _toggleActive(ClinicSlotEntity slot) async {
    try {
      final updated = await appointmentsRepository.updateClinicSlot(
        slot.id,
        isActive: !slot.isActive,
      );
      setState(() {
        _slots = _slots.map((s) => s.id == updated.id ? updated : s).toList();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteSlot(ClinicSlotEntity slot) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete slot?'),
        content: Text('Delete "${slot.label}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await appointmentsRepository.deleteClinicSlot(slot.id);
      setState(() => _slots.removeWhere((s) => s.id == slot.id));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Slot deleted')));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _openSlotForm({ClinicSlotEntity? existing}) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _SlotFormSheet(existing: existing),
    );
    if (result == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final available = _slots.where((s) => !s.isBlocked).toList();
    final blocked = _slots.where((s) => s.isBlocked).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Time Slots'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Add Slot'),
        onPressed: () => _openSlotForm(),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SelectableText(_error!, style: const TextStyle(color: Colors.red)),
                      TextButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  children: [
                    _buildSectionHeader('Available Slots', Icons.event_available, Colors.green),
                    const SizedBox(height: 8),
                    if (available.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No available slots defined.', style: TextStyle(color: Colors.grey)),
                      )
                    else
                      ...available.map((s) => _buildSlotCard(s)),
                    const SizedBox(height: 24),
                    _buildSectionHeader('Blocked Windows / Breaks', Icons.block, Colors.orange),
                    const SizedBox(height: 8),
                    if (blocked.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No blocked windows defined.', style: TextStyle(color: Colors.grey)),
                      )
                    else
                      ...blocked.map((s) => _buildSlotCard(s)),
                  ],
                ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
      ],
    );
  }

  Widget _buildSlotCard(ClinicSlotEntity slot) {
    final isBlocked = slot.isBlocked;
    final isActive = slot.isActive;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isBlocked ? Colors.orange.shade100 : Colors.green.shade100,
          child: Icon(
            isBlocked ? Icons.block : Icons.schedule,
            color: isBlocked ? Colors.orange : Colors.green,
          ),
        ),
        title: Text(slot.label, style: TextStyle(fontWeight: FontWeight.w600, color: isActive ? null : Colors.grey)),
        subtitle: Text(
          '${_fmt(slot.startTime)} → ${_fmt(slot.endTime)}${isActive ? '' : ' · Inactive'}',
          style: TextStyle(color: isActive ? null : Colors.grey),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Switch(
              value: isActive,
              onChanged: (_) => _toggleActive(slot),
              activeColor: isBlocked ? Colors.orange : Colors.green,
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (v) {
                if (v == 'edit') _openSlotForm(existing: slot);
                if (v == 'delete') _deleteSlot(slot);
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(String t) {
    // "09:00:00" → "09:00 AM"
    try {
      final parts = t.split(':');
      int h = int.parse(parts[0]);
      final m = parts[1];
      final period = h >= 12 ? 'PM' : 'AM';
      if (h == 0) h = 12;
      if (h > 12) h -= 12;
      return '${h.toString().padLeft(2, '0')}:$m $period';
    } catch (_) {
      return t;
    }
  }
}

class _SlotFormSheet extends StatefulWidget {
  final ClinicSlotEntity? existing;
  const _SlotFormSheet({this.existing});

  @override
  State<_SlotFormSheet> createState() => _SlotFormSheetState();
}

class _SlotFormSheetState extends State<_SlotFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _labelCtrl;
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 9, minute: 45);
  String _slotType = 'available';
  bool _isFullDay = false;
  List<int> _selectedDays = []; // 0=Sun, 1=Mon...
  bool _saving = false;

  final _daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _labelCtrl = TextEditingController(text: e?.label ?? '');
    if (e != null) {
      _startTime = _parseTime(e.startTime);
      _endTime = _parseTime(e.endTime);
      _slotType = e.slotType == ClinicSlotType.blocked ? 'blocked' : 'available';
      _isFullDay = e.startTime == '00:00:00' && e.endTime == '23:59:00';
      _selectedDays = List.from(e.dayOfWeek ?? []);
    }
  }

  TimeOfDay _parseTime(String t) {
    final parts = t.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:00';

  String _fmtDisplay(TimeOfDay t) {
    final h = t.hour == 0 ? 12 : (t.hour > 12 ? t.hour - 12 : t.hour);
    final period = t.hour >= 12 ? 'PM' : 'AM';
    return '${h.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')} $period';
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startTime = picked;
        // Auto-set label if it matches a standard pattern
        _autoLabel();
      } else {
        _endTime = picked;
        _autoLabel();
      }
    });
  }

  void _autoLabel() {
    if (_labelCtrl.text.isEmpty || _labelCtrl.text.contains('AM') || _labelCtrl.text.contains('PM')) {
      _labelCtrl.text = '${_fmtDisplay(_startTime)} - ${_fmtDisplay(_endTime)}';
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      final e = widget.existing;
      if (e != null) {
        await appointmentsRepository.updateClinicSlot(
          e.id,
          label: _labelCtrl.text.trim(),
          startTime: _isFullDay ? '00:00:00' : _fmtTime(_startTime),
          endTime: _isFullDay ? '23:59:00' : _fmtTime(_endTime),
          slotType: _slotType,
          dayOfWeek: _selectedDays.isEmpty ? null : _selectedDays,
        );
      } else {
        await appointmentsRepository.createClinicSlot(
          label: _labelCtrl.text.trim(),
          startTime: _isFullDay ? '00:00:00' : _fmtTime(_startTime),
          endTime: _isFullDay ? '23:59:00' : _fmtTime(_endTime),
          slotType: _slotType,
          dayOfWeek: _selectedDays.isEmpty ? null : _selectedDays,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: SelectableText('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isEdit ? 'Edit Slot' : 'Add New Slot',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),

            // Slot type toggle
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'available', label: Text('Available'), icon: Icon(Icons.event_available)),
                ButtonSegment(value: 'blocked', label: Text('Blocked / Break'), icon: Icon(Icons.block)),
              ],
              selected: {_slotType},
              onSelectionChanged: (s) => setState(() => _slotType = s.first),
            ),
            const SizedBox(height: 16),

            // Full Day switch
            SwitchListTile(
              title: const Text('Full Day Off / Block'),
              subtitle: const Text('Blocks the entire day (12:00 AM - 11:59 PM)'),
              value: _isFullDay,
              onChanged: (v) {
                setState(() {
                  _isFullDay = v;
                  if (v && _labelCtrl.text.isEmpty) _labelCtrl.text = 'Clinic Off Day';
                });
              },
            ),
            const SizedBox(height: 8),

            // Time pickers
            if (!_isFullDay)
              Row(
                children: [
                Expanded(
                  child: _TimePickerTile(
                    label: 'Start Time',
                    time: _fmtDisplay(_startTime),
                    onTap: () => _pickTime(true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TimePickerTile(
                    label: 'End Time',
                    time: _fmtDisplay(_endTime),
                    onTap: () => _pickTime(false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            const Text('Applies to Days (Optional)', style: TextStyle(fontWeight: FontWeight.w600)),
            Wrap(
              spacing: 8,
              children: List.generate(7, (i) {
                final isSelected = _selectedDays.contains(i);
                return FilterChip(
                  label: Text(_daysList[i]),
                  selected: isSelected,
                  onSelected: (b) {
                    setState(() {
                      if (b) {
                        _selectedDays.add(i);
                      } else {
                        _selectedDays.remove(i);
                      }
                    });
                  },
                );
              }),
            ),
            const SizedBox(height: 16),

            // Label
            TextFormField(
              controller: _labelCtrl,
              decoration: const InputDecoration(
                labelText: 'Label',
                hintText: 'e.g. Lunch Break or 09:00 AM - 09:45 AM',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Label is required' : null,
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(isEdit ? 'Save Changes' : 'Add Slot'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimePickerTile extends StatelessWidget {
  final String label;
  final String time;
  final VoidCallback onTap;

  const _TimePickerTile({required this.label, required this.time, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.blue),
                const SizedBox(width: 4),
                Text(time, style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
