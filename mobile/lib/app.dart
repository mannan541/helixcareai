import 'package:flutter/material.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/register_screen.dart';
import 'features/children/domain/child_entity.dart';
import 'features/children/presentation/children_list_screen.dart';
import 'features/children/presentation/child_detail_screen.dart';
import 'features/sessions/presentation/sessions_screen.dart';
import 'features/chat/presentation/chat_screen.dart';
import 'features/analytics/presentation/analytics_screen.dart';
import 'core/theme/app_theme.dart';

class HelixCareAIApp extends StatelessWidget {
  const HelixCareAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HelixCareAI',
      theme: AppTheme.light,
      initialRoute: '/login',
      routes: {
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/children': (_) => const ChildrenListScreen(),
        '/child_detail': (ctx) {
          final child = ModalRoute.of(ctx)!.settings.arguments as ChildEntity;
          return ChildDetailScreen(child: child);
        },
        '/sessions': (_) => const SessionsScreen(),
        '/chat': (_) => const ChatScreen(),
        '/analytics': (_) => const AnalyticsScreen(),
      },
    );
  }
}
