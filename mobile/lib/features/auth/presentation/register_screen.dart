import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import 'auth_bloc.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthBloc(authRepository),
      child: const _RegisterView(),
    );
  }
}

class _RegisterView extends StatefulWidget {
  const _RegisterView();

  @override
  State<_RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<_RegisterView> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _fullName = TextEditingController();
  String _role = 'parent';
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _fullName.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _fullName,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'Password (min 8)',
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => v == null || v.length < 8 ? 'Min 8 characters' : null,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: const [
                    DropdownMenuItem(value: 'parent', child: Text('Parent')),
                    DropdownMenuItem(value: 'therapist', child: Text('Therapist')),
                    DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  ],
                  onChanged: (v) => setState(() => _role = v ?? 'parent'),
                ),
                const SizedBox(height: 24),
                BlocConsumer<AuthBloc, AuthState>(
                  listener: (context, state) {
                    if (state.status == AuthStatus.authenticated && state.user != null) {
                      Navigator.of(context).pushNamedAndRemoveUntil(
                        '/dashboard',
                        (route) => false,
                        arguments: state.user,
                      );
                    } else if (state.status == AuthStatus.registrationPendingApproval) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Account created. You cannot sign in until an admin approves your account.',
                          ),
                        ),
                      );
                      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                    } else if (state.status == AuthStatus.failure && state.errorMessage != null) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.errorMessage!)));
                    }
                  },
                  builder: (context, state) {
                    final loading = state.status == AuthStatus.loading;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FilledButton(
                          onPressed: loading
                              ? null
                              : () {
                                  if (_formKey.currentState?.validate() ?? false) {
                                    context.read<AuthBloc>().add(AuthRegisterRequested(
                                          _email.text.trim(),
                                          _password.text,
                                          _fullName.text.trim(),
                                          _role,
                                        ));
                                  }
                                },
                          child: loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Register'),
                        ),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: loading ? null : () => Navigator.of(context).pushReplacementNamed('/login'),
                          child: const Text('Already have an account? Sign in'),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
