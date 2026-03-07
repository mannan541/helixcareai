import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../domain/user_entity.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _passwordController = TextEditingController();
  UserEntity? _user;
  String? _error;
  bool _loading = true;
  bool _saving = false;
  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await authRepository.me();
      if (mounted) {
        setState(() {
          _user = user;
          _loading = false;
          _error = user == null ? 'Not signed in' : null;
          if (user != null) _fullNameController.text = user.fullName;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _currentPasswordController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(appBar: AppBar(title: const Text('Edit profile')), body: const Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit profile')),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          SelectableText(_error ?? 'Could not load profile'),
          const SizedBox(height: 16),
          TextButton(onPressed: () => _loadUser(), child: const Text('Retry')),
        ])),
      );
    }
    final user = _user!;
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              initialValue: user.email,
              decoration: const InputDecoration(labelText: 'Email'),
              readOnly: true,
              enabled: false,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _fullNameController,
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            if (!user.isAdmin) ...[
              TextFormField(
                controller: _currentPasswordController,
                decoration: InputDecoration(
                  labelText: 'Current password',
                  hintText: 'Required when changing password',
                  suffixIcon: IconButton(
                    icon: Icon(_obscureCurrentPassword ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscureCurrentPassword = !_obscureCurrentPassword),
                  ),
                ),
                obscureText: _obscureCurrentPassword,
                validator: (v) {
                  final newPass = _passwordController.text.trim();
                  if (newPass.isNotEmpty && (v == null || v.isEmpty)) return 'Required to set new password';
                  return null;
                },
              ),
              const SizedBox(height: 16),
            ],
            TextFormField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: user.isAdmin ? 'New password (optional)' : 'New password (optional)',
                hintText: 'Leave blank to keep current',
                suffixIcon: IconButton(
                  icon: Icon(_obscureNewPassword ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscureNewPassword = !_obscureNewPassword),
                ),
              ),
              obscureText: _obscureNewPassword,
              onChanged: (_) => _formKey.currentState?.validate(),
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

  Future<void> _save(BuildContext context) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final fullName = _fullNameController.text.trim();
    final password = _passwordController.text.trim().isEmpty ? null : _passwordController.text.trim();
    final currentPassword = password != null && !_user!.isAdmin
        ? (_currentPasswordController.text.isEmpty ? null : _currentPasswordController.text)
        : null;
    try {
      final updated = await authRepository.updateProfile(
        fullName: fullName,
        password: password,
        currentPassword: currentPassword,
      );
      if (!context.mounted) return;
      if (updated != null) {
        Navigator.of(context).pop(updated);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
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
