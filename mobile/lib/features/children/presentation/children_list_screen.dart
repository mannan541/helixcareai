import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import 'child_detail_screen.dart';
import 'children_bloc.dart';

class ChildrenListScreen extends StatelessWidget {
  const ChildrenListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ChildrenBloc(childrenRepository)..add(const ChildrenLoadRequested()),
      child: const _ChildrenListView(),
    );
  }
}

class _ChildrenListView extends StatefulWidget {
  const _ChildrenListView();

  @override
  State<_ChildrenListView> createState() => _ChildrenListViewState();
}

class _ChildrenListViewState extends State<_ChildrenListView> {
  bool _canAddChild = false;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((user) {
      if (mounted) setState(() {
        _canAddChild = user?.isAdmin == true || user?.isTherapist == true;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ChildrenBloc, ChildrenState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
          }
        },
        builder: (context, state) {
          Widget body;
          if (state.isLoading && state.children.isEmpty) {
            body = const Center(child: CircularProgressIndicator());
          } else if (state.error != null && state.children.isEmpty) {
            body = Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SelectableText(state.error!, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.read<ChildrenBloc>().add(const ChildrenLoadRequested()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (state.children.isEmpty) {
            body = Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.child_care, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No children yet'),
                  if (_canAddChild) ...[
                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: () => _showAddChild(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Add child'),
                    ),
                  ],
                ],
              ),
            );
          } else {
            final list = state.children;
            body = Stack(
              children: [
                ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length + (state.hasMore ? 1 : 0),
                  itemBuilder: (context, i) {
                    if (i == list.length) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: state.isLoadingMore
                              ? const CircularProgressIndicator()
                              : TextButton(
                                  onPressed: () => context.read<ChildrenBloc>().add(const ChildrenLoadRequested(loadMore: true)),
                                  child: Text('Load more (${list.length} of ${state.total})'),
                                ),
                        ),
                      );
                    }
                    final c = list[i];
                    final subtitleParts = <String>[
                      if (c.childCode != null && c.childCode!.isNotEmpty) c.childCode!,
                      if (c.dateOfBirth != null) 'DOB: ${formatAppDateFromString(c.dateOfBirth) ?? c.dateOfBirth}',
                    ];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(c.fullName),
                        subtitle: subtitleParts.isEmpty
                            ? null
                            : Text(subtitleParts.join(' • ')),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).pushNamed(
                          '/child_detail',
                          arguments: ChildDetailArgs(
                            child: c,
                            childrenBloc: context.read<ChildrenBloc>(),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                if (state.isLoading && list.isEmpty) const Positioned.fill(child: ColoredBox(color: Color(0x20000000), child: Center(child: CircularProgressIndicator()))),
              ],
            );
          }
          return Scaffold(
            appBar: AppBar(
              title: const Text('Children'),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search by child ID or name',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onSubmitted: (q) {
                      context.read<ChildrenBloc>().add(ChildrenLoadRequested(search: q.isEmpty ? null : q));
                    },
                    onChanged: (q) {
                      if (q.isEmpty) {
                        context.read<ChildrenBloc>().add(const ChildrenLoadRequested(search: null));
                      }
                    },
                  ),
                ),
              ),
              actions: [
                _AddUserButton(),
                IconButton(
                  icon: const Icon(Icons.person),
                  onPressed: () => Navigator.of(context).pushNamed('/edit_profile'),
                ),
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () => _confirmLogout(context),
                ),
              ],
            ),
            body: body,
            floatingActionButton: state.children.isNotEmpty && _canAddChild
                ? FloatingActionButton(
                    onPressed: () => _showAddChild(context),
                    child: const Icon(Icons.add),
                  )
                : null,
          );
        },
      );
  }

  void _confirmLogout(BuildContext context) {
    showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
        ],
      ),
    ).then((confirmed) {
      if (confirmed == true) {
        authRepository.setToken(null);
        Navigator.of(context).pushReplacementNamed('/login');
      }
    });
  }

  void _showAddChild(BuildContext context) {
    final bloc = context.read<ChildrenBloc>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => BlocProvider.value(
        value: bloc,
        child: _AddChildSheet(
          onSubmit: (data) {
            bloc.add(ChildrenCreateRequested(
                  firstName: data.firstName,
                  lastName: data.lastName,
                  dateOfBirth: data.dateOfBirth,
                  notes: data.notes,
                  diagnosis: data.diagnosis,
                  referredBy: data.referredBy,
                  gender: data.gender,
                  diagnosisType: data.diagnosisType,
                  autismLevel: data.autismLevel,
                  primaryLanguage: data.primaryLanguage,
                  communicationType: data.communicationType,
                  therapyStatus: data.therapyStatus,
                ));
          },
        ),
      ),
    );
  }
}

class _AddUserButton extends StatefulWidget {
  @override
  State<_AddUserButton> createState() => _AddUserButtonState();
}

class _AddUserButtonState extends State<_AddUserButton> {
  bool? _isAdmin;

  @override
  void initState() {
    super.initState();
    authRepository.me().then((u) {
      if (mounted) setState(() => _isAdmin = u?.isAdmin);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isAdmin != true) return const SizedBox.shrink();
    return IconButton(
      icon: const Icon(Icons.person_add),
      tooltip: 'Add therapist/parent',
      onPressed: () => Navigator.of(context).pushNamed('/add_user'),
    );
  }
}

class _AddChildData {
  final String firstName;
  final String lastName;
  final String? dateOfBirth;
  final String? notes;
  final String? diagnosis;
  final String? referredBy;
  final String? gender;
  final String? diagnosisType; // ASD, ADHD, or custom when Other
  final String? autismLevel;
  final String? primaryLanguage;
  final String? communicationType;
  final String? therapyStatus;
  _AddChildData({
    required this.firstName,
    required this.lastName,
    this.dateOfBirth,
    this.notes,
    this.diagnosis,
    this.referredBy,
    this.gender,
    this.diagnosisType,
    this.autismLevel,
    this.primaryLanguage,
    this.communicationType,
    this.therapyStatus,
  });
}

class _AddChildSheet extends StatefulWidget {
  final void Function(_AddChildData data) onSubmit;

  const _AddChildSheet({required this.onSubmit});

  @override
  State<_AddChildSheet> createState() => _AddChildSheetState();
}

class _AddChildSheetState extends State<_AddChildSheet> {
  final _fn = TextEditingController();
  final _ln = TextEditingController();
  final _notes = TextEditingController();
  final _diagnosis = TextEditingController();
  final _referredBy = TextEditingController();
  final _primaryLanguageOther = TextEditingController();
  final _diagnosisTypeOther = TextEditingController();
  DateTime? _dob;
  String? _gender;
  String? _diagnosisType;
  String? _primaryLanguage; // English, Urdu, Other
  String? _autismLevel;
  String? _communicationType;
  String? _therapyStatus;
  bool _saving = false;

  static const List<String> _genderOptions = ['Male', 'Female', 'Other'];
  static const List<String> _diagnosisTypeOptions = ['ASD', 'ADHD', 'Other'];
  static const List<String> _primaryLanguageOptions = ['English', 'Urdu', 'Other'];
  static const List<String> _autismLevelOptions = ['Level 1', 'Level 2', 'Level 3', 'Not specified'];
  static const List<String> _communicationTypeOptions = ['Verbal', 'Non-verbal', 'Minimal', 'AAC', 'Other'];
  static const List<String> _therapyStatusOptions = ['Active', 'On hold', 'Completed', 'Not started'];

  @override
  void dispose() {
    _fn.dispose();
    _ln.dispose();
    _notes.dispose();
    _diagnosis.dispose();
    _referredBy.dispose();
    _primaryLanguageOther.dispose();
    _diagnosisTypeOther.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ChildrenBloc, ChildrenState>(
      listenWhen: (prev, curr) => _saving && prev.isLoading && !curr.isLoading,
      listener: (context, state) {
        if (state.error != null) {
          setState(() => _saving = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
        } else {
          Navigator.of(context).pop();
        }
      },
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add child', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: _fn, decoration: const InputDecoration(labelText: 'First name')),
            const SizedBox(height: 12),
            TextField(controller: _ln, decoration: const InputDecoration(labelText: 'Last name')),
            const SizedBox(height: 12),
            Text('Child code will be auto-generated (e.g. CH001)', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _gender,
              decoration: const InputDecoration(labelText: 'Gender'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._genderOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _gender = v),
            ),
            const SizedBox(height: 12),
            ListTile(
              title: Text(_dob == null ? 'Date of birth (optional)' : 'DOB: ${formatAppDate(_dob!)}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _dob ?? DateTime.now(),
                  firstDate: DateTime(1990),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _dob = picked);
              },
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _diagnosis,
              decoration: const InputDecoration(labelText: 'Diagnosis (optional)', hintText: 'e.g. ASD'),
              maxLines: 1,
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
              TextField(
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
              TextField(
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
            DropdownButtonFormField<String>(
              value: _therapyStatus,
              decoration: const InputDecoration(labelText: 'Therapy status'),
              items: [const DropdownMenuItem(value: null, child: Text('—')), ..._therapyStatusOptions.map((o) => DropdownMenuItem(value: o, child: Text(o)))],
              onChanged: (v) => setState(() => _therapyStatus = v),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _referredBy,
              decoration: const InputDecoration(labelText: 'Referred by (optional)', hintText: 'e.g. Dr. Smith'),
            ),
            const SizedBox(height: 12),
            TextField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes'), maxLines: 2),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving
                  ? null
                  : () {
                      if (_fn.text.trim().isEmpty || _ln.text.trim().isEmpty) return;
                      setState(() => _saving = true);
                      final dobStr = _dob != null ? '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}' : null;
                      widget.onSubmit(_AddChildData(
                        firstName: _fn.text.trim(),
                        lastName: _ln.text.trim(),
                        dateOfBirth: dobStr,
                        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
                        diagnosis: _diagnosis.text.trim().isEmpty ? null : _diagnosis.text.trim(),
                        referredBy: _referredBy.text.trim().isEmpty ? null : _referredBy.text.trim(),
                        gender: _gender,
                        diagnosisType: _diagnosisType == 'Other'
                            ? (_diagnosisTypeOther.text.trim().isEmpty ? null : _diagnosisTypeOther.text.trim())
                            : _diagnosisType,
                        autismLevel: _autismLevel,
                        primaryLanguage: _primaryLanguage == 'Other'
                            ? (_primaryLanguageOther.text.trim().isEmpty ? null : _primaryLanguageOther.text.trim())
                            : _primaryLanguage,
                        communicationType: _communicationType,
                        therapyStatus: _therapyStatus,
                      ));
                    },
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
}
