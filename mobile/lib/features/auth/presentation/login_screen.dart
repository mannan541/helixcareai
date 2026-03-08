import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import 'auth_bloc.dart';

/// Set to true to show the "Create account" button on the login screen.
const bool _showSignupButton = false;

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthBloc(authRepository),
      child: const _LoginView(),
    );
  }
}

class _LoginView extends StatefulWidget {
  const _LoginView();

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Text('HelixCareAI', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Autism Therapy', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey)),
                const SizedBox(height: 48),
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
                    labelText: 'Password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
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
                                    context.read<AuthBloc>().add(AuthLoginRequested(_email.text.trim(), _password.text));
                                  }
                                },
                          child: loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Sign in'),
                        ),
                        if (_showSignupButton) ...[
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: loading ? null : () => Navigator.of(context).pushReplacementNamed('/register'),
                            child: const Text('Create account'),
                          ),
                        ],
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
