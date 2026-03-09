import 'package:flutter/material.dart';
import '../../di/injection.dart';
import '../../../features/auth/domain/user_entity.dart';
import '../../../features/dashboard/presentation/dashboard_screen.dart';
import '../../../features/children/presentation/children_list_screen.dart';
import '../../../features/sessions/presentation/sessions_screen.dart';
import '../../../features/chat/presentation/chat_screen.dart';
import '../../../features/admin/presentation/users_list_screen.dart';
import '../../../features/analytics/presentation/analytics_screen.dart';
import '../../storage/local_storage.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  UserEntity? _user;
  int _unreadCount = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await authRepository.me();
      final count = await authRepository.getNotificationUnreadCount();
      if (mounted) {
        setState(() {
          _user = user;
          _unreadCount = count;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  List<NavigationItem> _getNavigationItems(UserEntity user) {
    final items = [
      NavigationItem(
        label: 'Dashboard',
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard,
        widget: DashboardScreen(showAppBar: false, onTabSelected: _onItemTapped),
      ),

      NavigationItem(
        label: 'Children',
        icon: Icons.child_care_outlined,
        activeIcon: Icons.child_care,
        widget: const ChildrenListScreen(showAppBar: false),
      ),
    ];

    if (user.isAdmin) {
      items.add(NavigationItem(
        label: 'Users',
        icon: Icons.people_outline,
        activeIcon: Icons.people,
        widget: const UsersListScreen(showAppBar: false),
      ));
    } else {
      items.add(NavigationItem(
        label: 'Sessions',
        icon: Icons.event_note_outlined,
        activeIcon: Icons.event_note,
        widget: const SessionsScreen(showAppBar: false),
      ));
    }

    items.add(NavigationItem(
      label: 'Chat',
      icon: Icons.chat_outlined,
      activeIcon: Icons.chat,
      widget: const ChatScreen(showAppBar: false),
    ));

    return items;
  }


  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  Future<void> _handleLogout() async {
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
    if (ok == true && mounted) {
      authRepository.setToken(null);
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacementNamed('/login');
      });
      return const Scaffold();
    }

    final navigationItems = _getNavigationItems(_user!);
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    final isTablet = MediaQuery.of(context).size.width >= 600 && MediaQuery.of(context).size.width < 900;
    final useSideNav = isDesktop || isTablet;

    return Scaffold(
      appBar: AppBar(
        title: Text(navigationItems[_selectedIndex].label),
        leading: useSideNav ? const Padding(
          padding: EdgeInsets.all(8.0),
          child: Icon(Icons.health_and_safety, color: Colors.blue, size: 32),
        ) : null,
        actions: [
          IconButton(
            icon: _unreadCount > 0
                ? Badge(
                    label: Text(_unreadCount > 99 ? '99+' : '$_unreadCount'),
                    child: const Icon(Icons.notifications),
                  )
                : const Icon(Icons.notifications_outlined),
            onPressed: () async {
              await Navigator.of(context).pushNamed('/notifications');
              _loadUser();
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.of(context).pushNamed('/edit_profile'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Row(
        children: [
          if (useSideNav)
            NavigationDrawer(
              selectedIndex: _selectedIndex,
              onDestinationSelected: _onItemTapped,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(28, 16, 16, 10),
                  child: Text('Menu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                ...navigationItems.map((item) {
                  return NavigationDrawerDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.activeIcon),
                    label: Text(item.label),
                  );
                }),
              ],
            ),

          if (useSideNav) const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: navigationItems.map((item) => item.widget).toList(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: useSideNav
          ? null
          : NavigationBar(
              selectedIndex: _selectedIndex,
              onDestinationSelected: _onItemTapped,
              destinations: navigationItems.map((item) {
                return NavigationDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.activeIcon),
                  label: item.label,
                );
              }).toList(),
            ),
    );
  }
}

class NavigationItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget widget;

  NavigationItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.widget,
  });
}
