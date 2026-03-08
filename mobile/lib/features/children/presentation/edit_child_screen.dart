import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../auth/domain/user_entity.dart';
import '../domain/child_entity.dart';
import '../data/children_repository.dart';
import 'children_bloc.dart';

String _dateToStr(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

int? _ageFromDob(DateTime? dob) {
  if (dob == null) return null;
  final now = DateTime.now();
  int age = now.year - dob.year;
  if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) age--;
  return age;
}

DateTime? _dobFromAge(int? age) {
  if (age == null || age < 0) return null;
  final now = DateTime.now();
  return DateTime(now.year - age, now.month, now.day);
}

class EditChildScreen extends StatefulWidget {
  const EditChildScreen({super.key, required this.child, required this.repository});

  final ChildEntity child;
  final ChildrenRepository repository;

  @override
  State<EditChildScreen> createState() => _EditChildScreenState();
}

class _EditChildScreenState extends State<EditChildScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fn;
  late final TextEditingController _ln;
  late final TextEditingController _notes;
  late final TextEditingController _diagnosis;
  late final TextEditingController _referredBy;
  late final TextEditingController _childCode;
  late final TextEditingController _profilePhoto;
  late final TextEditingController _primaryLanguageOther;
  late final TextEditingController _iqLevel;
  late final TextEditingController _developmentalAge;
  late final TextEditingController _sensorySensitivity;
  late final TextEditingController _behavioralNotes;
  late final TextEditingController _medicalConditions;
  late final TextEditingController _medications;
  late final TextEditingController _allergies;
  late final TextEditingController _sessionsPerWeek;
  late final TextEditingController _communicationScore;
  late final TextEditingController _socialScore;
  late final TextEditingController _behavioralScore;
  late final TextEditingController _cognitiveScore;
  late final TextEditingController _motorSkillScore;
  late final TextEditingController _status;
  late final TextEditingController _diagnosisTypeOther;
  late final TextEditingController _ageController;
  late DateTime? _dob;
  late DateTime? _diagnosisDate;
  late DateTime? _therapyStartDate;
  int? _age;
  String? _gender;
  String? _diagnosisType;
  String? _autismLevel;
  String? _primaryLanguage; // 'English' | 'Urdu' | 'Other'
  String? _communicationType;
  String? _therapyStatus;
  String? _therapyCenterId;
  String? _therapyPlanId;
  List<UserEntity> _selectedTherapists = [];
  List<TherapyCenterOption> _therapyCenterOptions = [];
  List<TherapyPlanOption> _therapyPlanOptions = [];
  bool _saving = false;

  static const List<String> _genderOptions = ['Male', 'Female', 'Other'];
  static const List<String> _diagnosisTypeOptions = ['ASD', 'ADHD', 'Other'];
  static const List<String> _primaryLanguageOptions = ['English', 'Urdu', 'Other'];
  static const List<String> _autismLevelOptions = ['Level 1', 'Level 2', 'Level 3', 'Not specified'];
  static const List<String> _communicationTypeOptions = ['Verbal', 'Non-verbal', 'Minimal', 'AAC', 'Other'];
  static const List<String> _therapyStatusOptions = ['Active', 'On hold', 'Completed', 'Not started'];

  @override
  void initState() {
    super.initState();
    final c = widget.child;
    _fn = TextEditingController(text: c.firstName);
    _ln = TextEditingController(text: c.lastName);
    _notes = TextEditingController(text: c.notes ?? '');
    _diagnosis = TextEditingController(text: c.diagnosis ?? '');
    _referredBy = TextEditingController(text: c.referredBy ?? '');
    _dob = c.dateOfBirth != null ? DateTime.tryParse(c.dateOfBirth!) : null;
    _childCode = TextEditingController(text: c.childCode?.trim() ?? '');
    if ((c.childCode == null || c.childCode!.trim().isEmpty) && c.id.isNotEmpty) {
      widget.repository.getOne(c.id).then((updated) {
        if (mounted && (updated.childCode != null && updated.childCode!.trim().isNotEmpty)) {
          _childCode.text = updated.childCode!.trim();
          setState(() {});
        }
      });
    }
    _gender = c.gender;
    _profilePhoto = TextEditingController(text: c.profilePhoto ?? '');
    final dt = c.diagnosisType;
    if (dt == 'ASD' || dt == 'ADHD') {
      _diagnosisType = dt;
      _diagnosisTypeOther = TextEditingController();
    } else {
      _diagnosisType = dt != null && dt.isNotEmpty ? 'Other' : null;
      _diagnosisTypeOther = TextEditingController(text: (dt != null && dt != 'ASD' && dt != 'ADHD') ? dt : '');
    }
    _autismLevel = c.autismLevel;
    _diagnosisDate = c.diagnosisDate != null ? DateTime.tryParse(c.diagnosisDate!) : null;
    _therapyStartDate = c.therapyStartDate != null ? DateTime.tryParse(c.therapyStartDate!) : null;
    final pl = c.primaryLanguage;
    if (pl == 'English' || pl == 'Urdu') {
      _primaryLanguage = pl;
      _primaryLanguageOther = TextEditingController();
    } else {
      _primaryLanguage = pl != null && pl.isNotEmpty ? 'Other' : null;
      _primaryLanguageOther = TextEditingController(text: (pl != null && pl != 'English' && pl != 'Urdu') ? pl : '');
    }
    _communicationType = c.communicationType;
    _iqLevel = TextEditingController(text: c.iqLevel ?? '');
    _developmentalAge = TextEditingController(text: c.developmentalAge ?? '');
    _sensorySensitivity = TextEditingController(text: c.sensorySensitivity ?? '');
    _behavioralNotes = TextEditingController(text: c.behavioralNotes ?? '');
    _medicalConditions = TextEditingController(text: c.medicalConditions ?? '');
    _medications = TextEditingController(text: c.medications ?? '');
    _allergies = TextEditingController(text: c.allergies ?? '');
    _therapyStatus = c.therapyStatus;
    _therapyCenterId = c.therapyCenterId;
    _therapyPlanId = c.therapyPlanId;
    _age = _ageFromDob(_dob);
    _ageController = TextEditingController(text: _age?.toString() ?? '');
    _sessionsPerWeek = TextEditingController(text: c.sessionsPerWeek?.toString() ?? '');
    _loadTherapyOptions();
    _resolveAssignedTherapists(c.assignedTherapistIds ?? (c.assignedTherapistId != null ? [c.assignedTherapistId!] : null));
    _communicationScore = TextEditingController(text: c.communicationScore?.toString() ?? '');
    _socialScore = TextEditingController(text: c.socialScore?.toString() ?? '');
    _behavioralScore = TextEditingController(text: c.behavioralScore?.toString() ?? '');
    _cognitiveScore = TextEditingController(text: c.cognitiveScore?.toString() ?? '');
    _motorSkillScore = TextEditingController(text: c.motorSkillScore?.toString() ?? '');
    _status = TextEditingController(text: c.status ?? '');
  }

  @override
  void dispose() {
    _fn.dispose();
    _ln.dispose();
    _notes.dispose();
    _diagnosis.dispose();
    _referredBy.dispose();
    _childCode.dispose();
    _profilePhoto.dispose();
    _primaryLanguageOther.dispose();
    _iqLevel.dispose();
    _ageController.dispose();
    _developmentalAge.dispose();
    _sensorySensitivity.dispose();
    _behavioralNotes.dispose();
    _medicalConditions.dispose();
    _medications.dispose();
    _allergies.dispose();
    _sessionsPerWeek.dispose();
    _communicationScore.dispose();
    _socialScore.dispose();
    _behavioralScore.dispose();
    _cognitiveScore.dispose();
    _motorSkillScore.dispose();
    _status.dispose();
    _diagnosisTypeOther.dispose();
    super.dispose();
  }

  int? _parseInt(String s) {
    final v = int.tryParse(s.trim());
    return v;
  }

  Future<void> _loadTherapyOptions() async {
    try {
      final centers = await widget.repository.listTherapyCenters();
      final plans = await widget.repository.listTherapyPlans();
      if (mounted) setState(() {
        _therapyCenterOptions = centers;
        _therapyPlanOptions = plans;
      });
    } catch (_) {}
  }

  Future<void> _resolveAssignedTherapists(List<String>? ids) async {
    if (ids == null || ids.isEmpty) return;
    try {
      final res = await authRepository.getTherapists(limit: 500, offset: 0);
      final list = res.users.where((u) => ids.contains(u.id)).toList();
      if (mounted) setState(() => _selectedTherapists = list);
    } catch (_) {}
  }

  Future<void> _openTherapistPicker() async {
    final res = await authRepository.getTherapists(limit: 100, offset: 0);
    final existingIds = _selectedTherapists.map((t) => t.id).toSet();
    final available = res.users.where((u) => !existingIds.contains(u.id)).toList();
    if (!mounted) return;
    final picked = await showDialog<UserEntity>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add therapist'),
        content: SizedBox(
          width: double.maxFinite,
          child: available.isEmpty
              ? const Text('No more therapists to add.')
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: available.length,
                  itemBuilder: (_, i) {
                    final u = available[i];
                    return ListTile(
                      title: Text(u.fullName),
                      subtitle: Text(u.email),
                      onTap: () => Navigator.pop(ctx, u),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
    if (picked != null && mounted) setState(() => _selectedTherapists = [..._selectedTherapists, picked]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit child')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _sectionTitle('Identity'),
            TextFormField(
              controller: _childCode,
              readOnly: true,
              decoration: const InputDecoration(
                labelText: 'Child code',
                hintText: 'Auto-generated',
                helperText: 'Assigned automatically (e.g. CH001)',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _fn,
              decoration: const InputDecoration(labelText: 'First name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _ln,
              decoration: const InputDecoration(labelText: 'Last name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _gender,
              decoration: const InputDecoration(labelText: 'Gender'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._genderOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _gender = v),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ListTile(
                    title: Text(_dob == null ? 'Date of birth' : formatAppDate(_dob!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _dob ?? DateTime.now(),
                        firstDate: DateTime(1990),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) setState(() {
                        _dob = picked;
                        _age = _ageFromDob(picked);
                        _ageController.text = _age?.toString() ?? '';
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 80,
                  child: TextFormField(
                    controller: _ageController,
                    decoration: const InputDecoration(labelText: 'Age'),
                    keyboardType: TextInputType.number,
                    onChanged: (v) {
                      final a = int.tryParse(v.trim());
                      if (a != null && a >= 0 && a <= 120) {
                        final d = _dobFromAge(a);
                        if (d != null) setState(() => _dob = d);
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _profilePhoto,
              decoration: const InputDecoration(labelText: 'Profile photo URL'),
            ),
            const SizedBox(height: 24),
            _sectionTitle('Diagnosis'),
            TextFormField(
              controller: _diagnosis,
              decoration: const InputDecoration(labelText: 'Diagnosis (optional)', hintText: 'e.g. ASD'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _diagnosisType,
              decoration: const InputDecoration(labelText: 'Diagnosis type'),
              items: [
                const DropdownMenuItem(value: null, child: Text('—')),
                ..._diagnosisTypeOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))),
              ],
              onChanged: (v) => setState(() => _diagnosisType = v),
            ),
            if (_diagnosisType == 'Other') ...[
              const SizedBox(height: 12),
              TextFormField(
                controller: _diagnosisTypeOther,
                decoration: const InputDecoration(
                  labelText: 'Diagnosis type (please specify)',
                  hintText: 'e.g. Sensory processing disorder',
                ),
              ),
            ],
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _autismLevel,
              decoration: const InputDecoration(labelText: 'Autism level'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._autismLevelOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _autismLevel = v),
            ),
            const SizedBox(height: 12),
            ListTile(
              title: Text(_diagnosisDate == null ? 'Diagnosis date (optional)' : formatAppDate(_diagnosisDate!)),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _diagnosisDate ?? DateTime.now(),
                  firstDate: DateTime(1990),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _diagnosisDate = picked);
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _primaryLanguage,
              decoration: const InputDecoration(labelText: 'Primary language'),
              items: [
                const DropdownMenuItem(value: null, child: Text('—')),
                ..._primaryLanguageOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))),
              ],
              onChanged: (v) => setState(() => _primaryLanguage = v),
            ),
            if (_primaryLanguage == 'Other') ...[
              const SizedBox(height: 12),
              TextFormField(
                controller: _primaryLanguageOther,
                decoration: const InputDecoration(labelText: 'Other language (please specify)'),
              ),
            ],
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _communicationType,
              decoration: const InputDecoration(labelText: 'Communication type'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._communicationTypeOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _communicationType = v),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _referredBy,
              decoration: const InputDecoration(labelText: 'Referred by (optional)', hintText: 'e.g. Dr. Smith'),
            ),
            const SizedBox(height: 24),
            _sectionTitle('Clinical'),
            TextFormField(
              controller: _iqLevel,
              decoration: const InputDecoration(labelText: 'IQ level'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _developmentalAge,
              decoration: const InputDecoration(labelText: 'Developmental age'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _sensorySensitivity,
              decoration: const InputDecoration(labelText: 'Sensory sensitivity'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _behavioralNotes,
              decoration: const InputDecoration(labelText: 'Behavioral notes'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _medicalConditions,
              decoration: const InputDecoration(labelText: 'Medical conditions'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _medications,
              decoration: const InputDecoration(labelText: 'Medications'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _allergies,
              decoration: const InputDecoration(labelText: 'Allergies'),
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            _sectionTitle('Therapy'),
            ListTile(
              title: Text(_therapyStartDate == null ? 'Therapy start date (optional)' : formatAppDate(_therapyStartDate!)),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _therapyStartDate ?? DateTime.now(),
                  firstDate: DateTime(1990),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _therapyStartDate = picked);
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _therapyStatus,
              decoration: const InputDecoration(labelText: 'Therapy status'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._therapyStatusOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _therapyStatus = v),
            ),
            const SizedBox(height: 12),
            const Text('Assigned therapists', style: TextStyle(fontWeight: FontWeight.w500)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._selectedTherapists.map((t) => Chip(
                  label: Text(t.fullName),
                  deleteIcon: const Icon(Icons.close, size: 18),
                  onDeleted: () => setState(() => _selectedTherapists = _selectedTherapists.where((x) => x.id != t.id).toList()),
                )),
                ActionChip(
                  avatar: const Icon(Icons.add, size: 20),
                  label: const Text('Add therapist'),
                  onPressed: _openTherapistPicker,
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _therapyCenterId != null && _therapyCenterOptions.any((o) => o.id == _therapyCenterId)
                  ? _therapyCenterId
                  : null,
              decoration: const InputDecoration(labelText: 'Therapy center'),
              items: [
                const DropdownMenuItem(value: null, child: Text('—')),
                ..._therapyCenterOptions.map((o) => DropdownMenuItem(value: o.id, child: Text(o.name))),
              ],
              onChanged: (v) => setState(() => _therapyCenterId = v),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _therapyPlanId != null && _therapyPlanOptions.any((o) => o.id == _therapyPlanId)
                  ? _therapyPlanId
                  : null,
              decoration: const InputDecoration(labelText: 'Therapy plan'),
              items: [
                const DropdownMenuItem(value: null, child: Text('—')),
                ..._therapyPlanOptions.map((o) => DropdownMenuItem(value: o.id, child: Text(o.name))),
              ],
              onChanged: (v) => setState(() => _therapyPlanId = v),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _sessionsPerWeek,
              decoration: const InputDecoration(labelText: 'Sessions per week (0–14)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            _sectionTitle('Scores (0–10)'),
            TextFormField(
              controller: _communicationScore,
              decoration: const InputDecoration(labelText: 'Communication score'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _socialScore,
              decoration: const InputDecoration(labelText: 'Social score'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _behavioralScore,
              decoration: const InputDecoration(labelText: 'Behavioral score'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cognitiveScore,
              decoration: const InputDecoration(labelText: 'Cognitive score'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _motorSkillScore,
              decoration: const InputDecoration(labelText: 'Motor skill score'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            _sectionTitle('Other'),
            TextFormField(
              controller: _status,
              decoration: const InputDecoration(labelText: 'Status'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'Notes'),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : () => _save(context),
              child: _saving
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
    );
  }

  Future<void> _save(BuildContext context) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final dobStr = _dob != null ? _dateToStr(_dob!) : null;
    final diagnosisDateStr = _diagnosisDate != null ? _dateToStr(_diagnosisDate!) : null;
    final therapyStartDateStr = _therapyStartDate != null ? _dateToStr(_therapyStartDate!) : null;
    String? emptyToNull(String s) => s.trim().isEmpty ? null : s.trim();
    final primaryLang = _primaryLanguage == 'Other' ? emptyToNull(_primaryLanguageOther.text) : _primaryLanguage;
    final therapistIds = _selectedTherapists.map((t) => t.id).toList();
    try {
      final updated = await widget.repository.update(widget.child.id,
        firstName: _fn.text.trim(),
        lastName: _ln.text.trim(),
        dateOfBirth: dobStr,
        notes: emptyToNull(_notes.text),
        diagnosis: emptyToNull(_diagnosis.text),
        referredBy: emptyToNull(_referredBy.text),
        childCode: emptyToNull(_childCode.text),
        gender: _gender,
        profilePhoto: emptyToNull(_profilePhoto.text),
        diagnosisType: _diagnosisType == 'Other'
            ? emptyToNull(_diagnosisTypeOther.text)
            : _diagnosisType,
        autismLevel: _autismLevel,
        diagnosisDate: diagnosisDateStr,
        primaryLanguage: primaryLang,
        communicationType: _communicationType,
        iqLevel: emptyToNull(_iqLevel.text),
        developmentalAge: emptyToNull(_developmentalAge.text),
        sensorySensitivity: emptyToNull(_sensorySensitivity.text),
        behavioralNotes: emptyToNull(_behavioralNotes.text),
        medicalConditions: emptyToNull(_medicalConditions.text),
        medications: emptyToNull(_medications.text),
        allergies: emptyToNull(_allergies.text),
        therapyStartDate: therapyStartDateStr,
        therapyStatus: _therapyStatus,
        assignedTherapistIds: therapistIds.isNotEmpty ? therapistIds : null,
        therapyCenterId: _therapyCenterId,
        therapyPlanId: _therapyPlanId,
        sessionsPerWeek: _parseInt(_sessionsPerWeek.text),
        communicationScore: _parseInt(_communicationScore.text),
        socialScore: _parseInt(_socialScore.text),
        behavioralScore: _parseInt(_behavioralScore.text),
        cognitiveScore: _parseInt(_cognitiveScore.text),
        motorSkillScore: _parseInt(_motorSkillScore.text),
        status: emptyToNull(_status.text),
      );
      if (context.mounted) {
        context.read<ChildrenBloc>().add(const ChildrenLoadRequested());
        Navigator.of(context).pop(updated);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(e.toString())));
      }
    } finally {
      if (context.mounted) setState(() => _saving = false);
    }
  }
}
