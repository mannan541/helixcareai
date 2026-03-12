import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:helixcareai_mobile/features/sessions/presentation/sessions_bloc.dart';
import 'package:helixcareai_mobile/core/di/injection.dart';
import 'package:helixcareai_mobile/core/utils/date_format.dart';
import 'package:helixcareai_mobile/features/admin/presentation/add_user_screen.dart';
import 'package:helixcareai_mobile/features/auth/domain/user_entity.dart';
import 'package:helixcareai_mobile/features/sessions/domain/session_entity.dart';
import 'package:helixcareai_mobile/features/children/domain/child_entity.dart';
import 'package:helixcareai_mobile/features/appointments/domain/appointment_entity.dart';

class SessionFormScreen extends StatefulWidget {
  const SessionFormScreen({
    super.key,
    required this.child,
    this.session,
    this.selectedAppointment,
    required this.onSaved,
  });

  final ChildEntity child;
  final SessionEntity? session;
  final AppointmentEntity? selectedAppointment;
  final VoidCallback onSaved;

  @override
  State<SessionFormScreen> createState() => _SessionFormScreenState();
}

const _therapyTitles = ['Speech', 'Behaviour', 'Occupational'];

/// Maps therapist title to therapy chip (e.g. "Speech Therapist" -> "Speech").
String? _therapyTitleFromTherapistTitle(String? therapistTitle) {
  if (therapistTitle == null || therapistTitle.isEmpty) return null;
  if (therapistTitle.contains('Speech')) return 'Speech';
  if (therapistTitle.contains('Behaviour')) return 'Behaviour';
  if (therapistTitle.contains('Occupational')) return 'Occupational';
  return null;
}

class _SessionFormScreenState extends State<SessionFormScreen> {
  /// Last therapist selected in the session form (for new sessions).
  static UserEntity? _lastSelectedTherapist;

  List<UserEntity>? _assignedTherapists;

  final _formKey = GlobalKey<FormState>();
  late DateTime _date;
  final _durationController = TextEditingController();
  final _notesController = TextEditingController();
  final _timeSlotController = TextEditingController();
  final Map<String, TextEditingController> _metricControllers = {};
  String? _therapyTitle;
  UserEntity? _selectedTherapist;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _date = widget.session?.sessionDate ?? widget.selectedAppointment?.appointmentDate ?? DateTime.now();
    _durationController.text = widget.session?.durationMinutes?.toString() ?? '45';
    _notesController.text = widget.session?.notesText ?? '';
    final metrics = widget.session?.structuredMetrics ?? {};
    final session = widget.session;
    if (session?.therapistUser != null) {
      final u = session!.therapistUser!;
      _selectedTherapist = UserEntity(
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: 'therapist',
        title: u.title,
      );
      _therapyTitle = metrics['therapyTitle'] as String? ?? _therapyTitleFromTherapistTitle(u.title);
    } else if (session?.therapistId != null) {
      _therapyTitle = metrics['therapyTitle'] as String?;
      WidgetsBinding.instance.addPostFrameCallback((_) => _resolveTherapistById(session!.therapistId!));
    } else if (widget.selectedAppointment?.therapistUser != null) {
      final u = widget.selectedAppointment!.therapistUser!;
      _selectedTherapist = UserEntity(
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: 'therapist',
        title: u.title,
      );
      _therapyTitle = _therapyTitleFromTherapistTitle(u.title);
    } else if (session == null && _lastSelectedTherapist != null) {
      _selectedTherapist = _lastSelectedTherapist;
      _therapyTitle = metrics['therapyTitle'] as String? ?? _therapyTitleFromTherapistTitle(_lastSelectedTherapist!.title);
    } else {
      _selectedTherapist = null;
      _therapyTitle = metrics['therapyTitle'] as String?;
    }
    String autoTimeSlot = '';
    if (session == null) {
      final now = DateTime.now();
      final target = now.subtract(const Duration(minutes: 45));
      final startOfWork = DateTime(target.year, target.month, target.day, 9, 0);
      int diffMins = target.difference(startOfWork).inMinutes;
      if (diffMins < 0) diffMins = 0;
      final slotIndex = diffMins ~/ 45;
      final slotStart = startOfWork.add(Duration(minutes: slotIndex * 45));
      final slotEnd = slotStart.add(const Duration(minutes: 45));
      String fmt(DateTime d) {
        final h = d.hour > 12 ? d.hour - 12 : (d.hour == 0 ? 12 : d.hour);
        final ampm = d.hour >= 12 ? 'PM' : 'AM';
        return '$h:${d.minute.toString().padLeft(2, '0')} $ampm';
      }
      autoTimeSlot = '${fmt(slotStart)} - ${fmt(slotEnd)}';
    }
    if (widget.selectedAppointment != null) {
      final appt = widget.selectedAppointment!;
      autoTimeSlot = '${formatAppTimeString(appt.startTime)} - ${formatAppTimeString(appt.endTime)}';
    }
    _timeSlotController.text = metrics['timeSlot']?.toString() ?? autoTimeSlot;
    for (final e in metrics.entries) {
      _metricControllers[e.key] = TextEditingController(text: e.value?.toString() ?? '');
    }
    if (_metricControllers.isEmpty) {
      _metricControllers['engagement'] = TextEditingController(text: '5');
      _metricControllers['focus'] = TextEditingController(text: '5');
      _metricControllers['communication'] = TextEditingController(text: '5');
    }
    if (_selectedTherapist == null) {
      authRepository.me().then((me) {
        if (me != null && (me.role == 'therapist' || me.isTherapist) && mounted && _selectedTherapist == null) {
          setState(() {
            _selectedTherapist = me;
            if (_therapyTitle == null) _therapyTitle = _therapyTitleFromTherapistTitle(me.title);
          });
        }
      });
    }

    _loadChildTherapists();
  }

  Future<void> _loadChildTherapists() async {
    final ids = widget.child.assignedTherapistIds ?? (widget.child.assignedTherapistId != null ? [widget.child.assignedTherapistId!] : null);
    if (ids == null || ids.isEmpty) return;
    try {
      final res = await authRepository.getTherapists(limit: 500, offset: 0);
      final list = res.users.where((u) => ids.contains(u.id)).toList();
      if (mounted) setState(() => _assignedTherapists = list);
    } catch (_) {}
  }

  Future<void> _resolveTherapistById(String therapistId) async {
    try {
      final res = await authRepository.getTherapists(limit: 500, offset: 0);
      UserEntity? u;
      for (final t in res.users) {
        if (t.id == therapistId) {
          u = t;
          break;
        }
      }
      if (u != null && mounted) {
        final therapist = u;
        setState(() {
          _selectedTherapist = therapist;
          if (_therapyTitle == null) _therapyTitle = _therapyTitleFromTherapistTitle(therapist?.title);
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _durationController.dispose();
    _notesController.dispose();
    _timeSlotController.dispose();
    for (final c in _metricControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.session != null;
    return BlocListener<SessionsBloc, SessionsState>(
      listenWhen: (prev, curr) => _saving && prev.isLoading && !curr.isLoading,
      listener: (context, state) {
        if (state.error != null) {
          setState(() => _saving = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
        } else {
          widget.onSaved();
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(isEdit ? 'Edit session' : 'Log session')),
        body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Child', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
              widget.child.fullName,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            if (widget.session != null) ...[
              const Text('Created by', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                widget.session!.createdByUser != null
                    ? '${widget.session!.createdByUser!.fullName} (${widget.session!.createdByUser!.email})'
                    : '—',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Text('Created: ${formatAppDateTime(widget.session!.createdAt)}', style: Theme.of(context).textTheme.bodySmall),
              if (widget.session!.updatedByUser != null || widget.session!.updatedAt.isAfter(widget.session!.createdAt)) ...[
                const SizedBox(height: 4),
                Text('Updated: ${formatAppDateTime(widget.session!.updatedAt)}', style: Theme.of(context).textTheme.bodySmall),
                if (widget.session!.updatedByUser != null)
                  Text('Updated by: ${widget.session!.updatedByUser!.fullName}', style: Theme.of(context).textTheme.bodySmall),
              ],
              const SizedBox(height: 16),
            ],
            const Text('Therapist', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            ListTile(
              title: Text(_selectedTherapist == null ? 'Select therapist (optional)' : '${_selectedTherapist!.fullName} (${_selectedTherapist!.email})'),
              trailing: _selectedTherapist != null ? IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(() => _selectedTherapist = null)) : const Icon(Icons.arrow_drop_down),
              tileColor: Theme.of(context).inputDecorationTheme.fillColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              onTap: () => _openTherapistPicker(context),
            ),
            const SizedBox(height: 16),
            const Text('Therapy title', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _therapyTitles.map((t) {
                final selected = _therapyTitle == t;
                return FilterChip(
                  label: Text(t),
                  selected: selected,
                  onSelected: (v) {
                    setState(() {
                      _therapyTitle = v ? t : null;
                      if (v && _assignedTherapists != null) {
                        for (final therapist in _assignedTherapists!) {
                          if (_therapyTitleFromTherapistTitle(therapist.title) == t) {
                            _selectedTherapist = therapist;
                            break;
                          }
                        }
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('Date'),
              subtitle: Text(_date.toString().split(' ').first),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked != null) setState(() => _date = picked);
              },
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _timeSlotController,
              decoration: const InputDecoration(
                labelText: 'Time slot (optional)',
                hintText: 'e.g. 9:00 AM - 10:00 AM',
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _durationController,
              decoration: const InputDecoration(labelText: 'Duration (minutes)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),
            const Text('Structured metrics', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._metricControllers.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextFormField(
                    controller: e.value,
                    decoration: InputDecoration(
                      labelText: _metricLabel(e.key),
                      hintText: '1-10 or value',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                )),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Therapist Notes (free text)', style: TextStyle(fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.format_list_bulleted, size: 20),
                  tooltip: 'Add bullet point',
                  onPressed: () {
                    final text = _notesController.text;
                    final selection = _notesController.selection;
                    const bullet = '• ';
                    if (selection.isValid) {
                      final newText = text.replaceRange(selection.start, selection.end, bullet);
                      _notesController.value = TextEditingValue(
                        text: newText,
                        selection: TextSelection.collapsed(offset: selection.start + bullet.length),
                      );
                    } else {
                      _notesController.text = text + bullet;
                    }
                  },
                ),
              ],
            ),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(hintText: 'Therapist notes...'),
              maxLines: 4,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : () => _submit(context),
              child: _saving
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Future<void> _openTherapistPicker(BuildContext context) async {
    final searchController = TextEditingController();
    List<UserEntity> list = [];
    int total = 0;
    String searchQuery = '';
    final currentUser = await authRepository.me();
    final isAdmin = currentUser?.isAdmin ?? false;

    Future<void> loadTherapists(String q) async {
      final res = await authRepository.getTherapists(limit: 50, offset: 0, search: q.isEmpty ? null : q);
      list = res.users;
      total = res.total;
    }

    await loadTherapists('');
    if (!context.mounted) return;
    final addNewRequested = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx2, setDialogState) {
            return AlertDialog(
              title: const Text('Select therapist'),
              content: SizedBox(
                width: double.maxFinite,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isAdmin)
                      ListTile(
                        leading: const Icon(Icons.person_add),
                        title: const Text('Add new therapist'),
                        onTap: () => Navigator.of(ctx).pop(true),
                      ),
                    TextField(
                      controller: searchController,
                      decoration: const InputDecoration(
                        hintText: 'Type to search by name or email',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (v) {
                        searchQuery = v;
                        loadTherapists(v).then((_) {
                          if (ctx2.mounted) setDialogState(() {});
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Flexible(
                      child: list.isEmpty
                          ? Padding(padding: const EdgeInsets.all(24), child: Text(total == 0 ? 'No therapists found' : 'Loading...'))
                          : ListView.builder(
                              shrinkWrap: true,
                              itemCount: list.length,
                              itemBuilder: (_, i) {
                                final u = list[i];
                                return ListTile(
                                  title: Text(u.fullName),
                                  subtitle: Text(u.email),
                                  onTap: () {
                                    final therapyFromTitle = _therapyTitleFromTherapistTitle(u.title);
                                    _lastSelectedTherapist = u;
                                    setState(() {
                                      _selectedTherapist = u;
                                      if (therapyFromTitle != null) _therapyTitle = therapyFromTitle;
                                    });
                                    Navigator.of(ctx).pop(false);
                                  },
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
              ],
            );
          },
        );
      },
    );
    searchController.dispose();

    if (addNewRequested == true && mounted) {
      final newTherapist = await Navigator.of(context).push<UserEntity?>(
        MaterialPageRoute(
          builder: (_) => AddUserScreen(therapistOnly: true),
        ),
      );
      if (newTherapist != null && mounted) {
        _lastSelectedTherapist = newTherapist;
        setState(() => _selectedTherapist = newTherapist);
      }
    }
  }

  String _metricLabel(String key) {
    return key.replaceFirst(key[0], key[0].toUpperCase());
  }

  void _submit(BuildContext context) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final structuredMetrics = <String, dynamic>{};
    if (_therapyTitle != null) structuredMetrics['therapyTitle'] = _therapyTitle;
    final timeSlot = _timeSlotController.text.trim();
    if (timeSlot.isNotEmpty) structuredMetrics['timeSlot'] = timeSlot;
    for (final e in _metricControllers.entries) {
      final v = e.value.text.trim();
      if (v.isNotEmpty) {
        final numVal = int.tryParse(v) ?? double.tryParse(v);
        structuredMetrics[e.key] = numVal ?? v;
      }
    }
    final duration = int.tryParse(_durationController.text.trim());
    final notesText = _notesController.text.trim().isEmpty ? null : _notesController.text.trim();
    if (widget.session != null) {
      context.read<SessionsBloc>().add(SessionUpdateRequested(
            id: widget.session!.id,
            therapistId: _selectedTherapist?.id,
            sessionDate: _date,
            durationMinutes: duration,
            notesText: notesText,
            structuredMetrics: structuredMetrics.isEmpty ? null : structuredMetrics,
          ));
    } else {
      context.read<SessionsBloc>().add(SessionCreateRequested(
            childId: widget.child.id,
            sessionDate: _date,
            therapistId: _selectedTherapist?.id,
            durationMinutes: duration,
            notesText: notesText,
            structuredMetrics: structuredMetrics.isEmpty ? null : structuredMetrics,
            appointmentId: widget.selectedAppointment?.id,
          ));
    }
  }
}
