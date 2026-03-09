import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../auth/domain/user_entity.dart';
import '../../auth/data/auth_repository.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.initialUser, this.showAppBar = true, this.onTabSelected});

  /// When provided (e.g. after login/register), dashboard shows immediately without waiting for me().
  final UserEntity? initialUser;
  final bool showAppBar;
  final void Function(int index)? onTabSelected;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}


class _DashboardScreenState extends State<DashboardScreen> {
  UserEntity? _user;
  DashboardCounts? _counts;
  int? _childrenCount; // for therapist/parent
  int? _sessionsCount; // for therapist: my sessions; for parent: children's sessions
  int _notificationUnreadCount = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialUser != null) {
      _user = widget.initialUser;
      _loading = false;
    }
    _load();
  }

  Future<void> _load() async {
    if (_user == null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final user = await authRepository.me();
      if (!mounted) return;
      if (user == null) {
        setState(() {
          if (widget.initialUser == null) _user = null;
          _loading = false;
        });
        return;
      }
      DashboardCounts? counts;
      int? childrenCount;
      int? sessionsCount;
      if (user.isAdmin) {
        counts = await authRepository.getDashboardCounts();
      } else {
        final userCounts = await authRepository.getDashboardCountsForUser();
        childrenCount = userCounts?.children;
        sessionsCount = userCounts?.sessions;
      }
      final unreadCount = await authRepository.getNotificationUnreadCount();
      if (!mounted) return;
      setState(() {
        _user = user;
        _counts = counts;
        _childrenCount = childrenCount;
        _sessionsCount = sessionsCount;
        _notificationUnreadCount = unreadCount;
        _loading = false;
      });
    } catch (e) {
      if (_user != null) {
        // We had initial user; keep showing it and ignore me() failure (e.g. network)
        if (mounted) setState(() { _loading = false; });
        return;
      }
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _user == null) {
      return Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Dashboard')) : null,
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_user == null) {
      return Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Dashboard')) : null,
        body: const Center(child: Text('Not logged in')),
      );
    }
    final user = _user!;
    final roleLabel = user.isAdmin ? 'Admin' : (user.isTherapist ? 'Therapist' : 'Parent');
    
    final body = RefreshIndicator(
      onRefresh: _load,
      child: _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SelectableText(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          : SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildWelcomeSection(user.fullName, roleLabel),
                  const SizedBox(height: 24),
                  if (user.isAdmin) _buildAdminCards(),
                  if (user.isTherapist) _buildTherapistCards(),
                  if (user.isParent) _buildParentCards(),
                ],
              ),
            ),
    );

    if (!widget.showAppBar) return body;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: _notificationUnreadCount > 0
                ? Badge(
                    label: Text(_notificationUnreadCount > 99 ? '99+' : '$_notificationUnreadCount'),
                    child: const Icon(Icons.notifications),
                  )
                : const Icon(Icons.notifications_outlined),
            onPressed: () async {
              await Navigator.of(context).pushNamed('/notifications');
              _load();
            },
          ),
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
    );
  }


  Widget _buildWelcomeSection(String fullName, String roleLabel) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, $fullName',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              roleLabel,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Use the cards below to navigate.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdminCards() {
    final c = _counts;
    final children = c?.children ?? 0;
    final therapists = c?.therapists ?? 0;
    final parents = c?.parents ?? 0;
    final totalUsers = c?.totalUsers ?? 0;
    final pendingUsers = c?.pendingUsers ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Admin overview', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(
          'Tap a card to view or manage.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        if (pendingUsers > 0) ...[
          _DashboardCard(
            title: 'Pending approvals',
            count: pendingUsers,
            icon: Icons.pending_actions,
            onTap: () => _navigateTo(context, '/pending_users'),
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            Expanded(child: _DashboardCard(
              title: 'Children',
              count: children,
              icon: Icons.child_care,
              onTap: () => _navigateTo(context, '/children'),
            )),
            const SizedBox(width: 12),
            Expanded(child: _DashboardCard(
              title: 'Therapists',
              count: therapists,
              icon: Icons.medical_services,
              onTap: () => _navigateTo(context, '/users', arguments: 'therapist'),
            )),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _DashboardCard(
              title: 'Parents',
              count: parents,
              icon: Icons.family_restroom,
              onTap: () => _navigateTo(context, '/users', arguments: 'parent'),
            )),
            const SizedBox(width: 12),
            Expanded(child: _DashboardCard(
              title: 'All users',
              count: totalUsers,
              icon: Icons.people,
              onTap: () => _navigateTo(context, '/users'),
            )),
          ],
        ),
      ],
    );
  }

  Widget _buildTherapistCards() {
    final childrenCount = _childrenCount ?? 0;
    final sessionsCount = _sessionsCount ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        Text('Therapist', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _DashboardCard(
              title: 'Children',
              count: childrenCount,
              icon: Icons.child_care,
              onTap: () => _navigateTo(context, '/children'),
            )),
            const SizedBox(width: 12),
            Expanded(child: _DashboardCard(
              title: 'Log session',
              count: sessionsCount,
              icon: Icons.event_note,
              onTap: () {
                _navigateTo(context, '/children');
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Select a child to log a session')),
                  );
                }
              },
            )),
          ],
        ),
      ],
    );
  }

  Widget _buildParentCards() {
    final childrenCount = _childrenCount ?? 0;
    final sessionsCount = _sessionsCount ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        Text('My children', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _DashboardCard(
              title: 'My Children',
              count: childrenCount,
              icon: Icons.child_care,
              onTap: () => _navigateTo(context, '/children'),
            )),
            const SizedBox(width: 12),
            Expanded(child: _DashboardCard(
              title: 'Sessions',
              count: sessionsCount,
              icon: Icons.event_note,
              onTap: () => _navigateTo(context, '/children'),
            )),
          ],
        ),
      ],
    );
  }

  void _navigateTo(BuildContext context, String route, {Object? arguments}) {
    if (widget.onTabSelected != null) {
      if (route == '/children') {
        widget.onTabSelected!(1);
        return;
      }
      if (route == '/users' || route == '/pending_users') {
        widget.onTabSelected!(2);
        return;
      }
      if (route == '/sessions') {
        widget.onTabSelected!(2);
        return;
      }
      if (route == '/chat') {
        widget.onTabSelected!(3);
        return;
      }
    }
    if (arguments != null) {
      Navigator.of(context).pushNamed(route, arguments: arguments);
    } else {
      Navigator.of(context).pushNamed(route);
    }
  }


  Future<void> _confirmLogout(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      authRepository.setToken(null);
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }
}

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.onTap,
    this.count,
  });

  final String title;
  final int? count;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 32, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                '${count ?? 0}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
