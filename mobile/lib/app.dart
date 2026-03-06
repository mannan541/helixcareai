import 'package:flutter/material.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/register_screen.dart';
import 'features/auth/presentation/edit_profile_screen.dart';
import 'features/children/presentation/child_detail_screen.dart';
import 'features/children/presentation/children_list_screen.dart';
import 'features/sessions/presentation/sessions_screen.dart';
import 'features/chat/presentation/chat_screen.dart';
import 'features/admin/presentation/add_user_screen.dart';
import 'features/analytics/presentation/analytics_screen.dart';
import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class HelixCareAIApp extends StatefulWidget {
  const HelixCareAIApp({super.key});

  @override
  State<HelixCareAIApp> createState() => _HelixCareAIAppState();
}

class _HelixCareAIAppState extends State<HelixCareAIApp> {
  @override
  void initState() {
    super.initState();
    apiClient.setOnUnauthorized(() {
      authRepository.setToken(null);
      navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (route) => false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'HelixCareAI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: '/login',
      routes: {
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/children': (_) => const ChildrenListScreen(),
        '/edit_profile': (_) => const EditProfileScreen(),
        '/add_user': (_) => const AddUserScreen(),
        '/child_detail': (ctx) {
          final args = ModalRoute.of(ctx)!.settings.arguments as ChildDetailArgs;
          return ChildDetailScreen(child: args.child, childrenBloc: args.childrenBloc);
        },
        '/sessions': (_) => const SessionsScreen(),
        '/chat': (_) => const ChatScreen(),
        '/analytics': (_) => const AnalyticsScreen(),
      },
    );
  }
}
