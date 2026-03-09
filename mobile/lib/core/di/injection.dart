import '../network/api_client.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/children/data/children_repository.dart';
import '../../features/sessions/data/sessions_repository.dart';
import '../../features/chat/data/chat_repository.dart';
import '../../features/analytics/data/analytics_repository.dart';
import '../../features/appointments/data/appointments_repository.dart';

final apiClient = ApiClient();

final authRepository = AuthRepository(apiClient);
final childrenRepository = ChildrenRepository(apiClient);
final sessionsRepository = SessionsRepository(apiClient);
final chatRepository = ChatRepository(apiClient);
final analyticsRepository = AnalyticsRepository(apiClient);
final appointmentsRepository = AppointmentsRepository(apiClient);
