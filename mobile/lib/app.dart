import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'features/auth/domain/user_entity.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/register_screen.dart';
import 'features/auth/presentation/edit_profile_screen.dart';
import 'features/auth/presentation/splash_screen.dart';
import 'features/children/presentation/child_detail_screen.dart';
import 'features/children/presentation/children_list_screen.dart';
import 'features/sessions/presentation/sessions_screen.dart';
import 'features/sessions/presentation/session_detail_route_screen.dart';
import 'features/chat/presentation/chat_screen.dart';
import 'features/admin/presentation/add_user_screen.dart';
import 'features/admin/presentation/edit_user_screen.dart';
import 'features/admin/presentation/users_list_screen.dart';
import 'features/dashboard/presentation/dashboard_screen.dart';
import 'features/analytics/presentation/analytics_screen.dart';
import 'features/notifications/presentation/notifications_screen.dart';
import 'features/appointments/presentation/appointments_bloc.dart';
import 'features/appointments/presentation/appointment_booking_screen.dart';
import 'features/appointments/presentation/therapist_schedule_screen.dart';
import 'features/appointments/presentation/admin_appointment_screen.dart';
import 'features/appointments/presentation/admin_slot_management_screen.dart';
import 'features/appointments/presentation/parent_schedule_screen.dart';
import 'features/appointments/domain/appointment_entity.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';
import 'core/presentation/screens/main_screen.dart';

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
      locale: const Locale('en', 'US'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'US'),
      ],
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/dashboard': (_) => const MainScreen(),
        '/children': (_) => const ChildrenListScreen(),
        '/users': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          return UsersListScreen(roleFilter: args is String ? args : null, pendingOnly: false);
        },
        '/pending_users': (_) => const UsersListScreen(pendingOnly: true),
        '/edit_profile': (_) => const EditProfileScreen(),
        '/add_user': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          final therapistOnly = args == true || args == 'therapist';
          final initialRole = args == 'parent' ? 'parent' : null;
          return AddUserScreen(therapistOnly: therapistOnly, initialRole: initialRole);
        },
        '/user_edit': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          if (args is! UserEntity) {
            return Scaffold(
              appBar: AppBar(title: const Text('Error')),
              body: const Center(child: Text('Invalid navigation. Select a user from the list.')),
            );
          }
          return EditUserScreen(user: args);
        },
        '/child_detail': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          if (args is! ChildDetailArgs) {
            return Scaffold(
              appBar: AppBar(title: const Text('Error')),
              body: const Center(child: Text('Invalid navigation. Go back and select a child.')),
            );
          }
          return ChildDetailScreen(child: args.child, childrenBloc: args.childrenBloc);
        },
        '/sessions': (_) => const SessionsScreen(),
        '/session_detail': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          if (args is! Map || args['sessionId'] is! String || args['childId'] is! String) {
            return Scaffold(
              appBar: AppBar(title: const Text('Session')),
              body: const Center(child: Text('Invalid session link.')),
            );
          }
          return SessionDetailRouteScreen(
            sessionId: args['sessionId'] as String,
            childId: args['childId'] as String,
          );
        },
        '/chat': (_) => const ChatScreen(),
        '/analytics': (_) => const AnalyticsScreen(),
        '/notifications': (_) => const NotificationsScreen(),
        '/book_appointment': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          return BlocProvider(
            create: (_) => AppointmentsBloc(appointmentsRepository),
            child: AppointmentBookingScreen(appointmentToEdit: args is AppointmentEntity ? args : null),
          );
        },
        '/admin_book_appointment': (ctx) {
          final args = ModalRoute.of(ctx)?.settings.arguments;
          return BlocProvider(
            create: (_) => AppointmentsBloc(appointmentsRepository),
            child: AppointmentBookingScreen(adminMode: true, appointmentToEdit: args is AppointmentEntity ? args : null),
          );
        },
        '/manage_slots': (_) => const AdminSlotManagementScreen(),
        '/schedule': (_) => BlocProvider(
              create: (_) => AppointmentsBloc(appointmentsRepository),
              child: FutureBuilder<UserEntity?>(
                future: authRepository.me(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator()));
                  return TherapistScheduleScreen(therapistId: snapshot.data!.id);
                },
              ),
            ),
        '/admin_appointments': (_) => BlocProvider(
              create: (_) => AppointmentsBloc(appointmentsRepository),
              child: const AdminAppointmentApprovalScreen(),
            ),
        '/parent_schedule': (_) => BlocProvider(
              create: (_) => AppointmentsBloc(appointmentsRepository),
              child: const ParentScheduleScreen(),
            ),
      },
    );
  }
}
