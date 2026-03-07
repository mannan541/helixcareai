import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../auth/data/auth_repository.dart';
import '../../children/data/children_repository.dart';
import '../domain/notification_entity.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationEntity> _notifications = [];
  int _total = 0;
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
      final resp = await authRepository.getNotifications(limit: 50, offset: 0);
      if (!mounted) return;
      setState(() {
        _notifications = resp.notifications;
        _total = resp.total;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _markAsRead(NotificationEntity n) async {
    if (!n.isUnread) return;
    try {
      await authRepository.markNotificationRead(n.id);
      if (!mounted) return;
      setState(() {
        final i = _notifications.indexWhere((x) => x.id == n.id);
        if (i >= 0) {
          _notifications[i] = NotificationEntity(
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            readAt: DateTime.now(),
            createdAt: n.createdAt,
            meta: n.meta,
          );
        }
      });
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await authRepository.markAllNotificationsRead();
      if (!mounted) return;
      await _load();
    } catch (_) {}
  }

  Future<void> _onNotificationTap(NotificationEntity n) async {
    await _markAsRead(n);
    if (!mounted) return;
    final nav = Navigator.of(context);
    nav.pop();

    switch (n.type) {
      case 'signup_pending_approval':
        nav.pushNamed('/pending_users');
        break;
      case 'session_logged_for_parent':
      case 'session_logged_by_admin':
      case 'parent_comment_on_session':
      case 'staff_comment_on_session':
        final sessionId = n.meta['sessionId'] as String?;
        final childId = n.meta['childId'] as String?;
        if (sessionId != null && childId != null) {
          nav.pushNamed('/session_detail', arguments: {'sessionId': sessionId, 'childId': childId});
        } else if (childId != null) {
          try {
            final child = await childrenRepository.getOne(childId);
            if (mounted) nav.pushNamed('/sessions', arguments: child);
          } catch (_) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Could not open session.')),
              );
            }
          }
        }
        break;
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (_notifications.any((n) => n.isUnread))
            TextButton(
              onPressed: _loading ? null : _markAllAsRead,
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: _loading && _notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SelectableText(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      const SizedBox(height: 16),
                      FilledButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : _notifications.isEmpty
                  ? const Center(child: Text('No notifications'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          final n = _notifications[index];
                          return _NotificationTile(
                            notification: n,
                            onTap: () => _onNotificationTap(n),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationEntity notification;
  final VoidCallback onTap;

  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final unread = notification.isUnread;
    return Material(
      color: unread ? Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5) : null,
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: unread
              ? Theme.of(context).colorScheme.primaryContainer
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Icon(
            _iconForType(notification.type),
            color: Theme.of(context).colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight: unread ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (notification.body != null && notification.body!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  notification.body!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            const SizedBox(height: 2),
            Text(
              formatAppDateTime(notification.createdAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'signup_pending_approval':
        return Icons.person_add;
      case 'session_logged_for_parent':
        return Icons.event_note;
      case 'session_logged_by_admin':
        return Icons.admin_panel_settings;
      case 'parent_comment_on_session':
      case 'staff_comment_on_session':
        return Icons.comment;
      default:
        return Icons.notifications;
    }
  }
}
