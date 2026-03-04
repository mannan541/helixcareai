import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/errors/app_exception.dart';

class ChatMessage {
  final String id;
  final String role;
  final String content;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
  });
}

class ChatRepository {
  final ApiClient _api;

  ChatRepository(this._api);

  Future<List<ChatMessage>> getHistory(String childId, {int limit = 50}) async {
    try {
      final data = await _api.get<Map<String, dynamic>>(
        '/api/chat/history/$childId',
        queryParameters: {'limit': limit},
      );
      final list = data!['messages'] as List<dynamic>? ?? [];
      return list.map((e) {
        final m = e as Map<String, dynamic>;
        return ChatMessage(
          id: m['id'] as String,
          role: m['role'] as String,
          content: m['content'] as String,
          createdAt: DateTime.parse(m['createdAt'] as String),
        );
      }).toList();
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  Future<String> ask(String childId, String question) async {
    try {
      final data = await _api.post<Map<String, dynamic>>('/api/chat/ask', {
        'childId': childId,
        'question': question,
      });
      return data!['answer'] as String;
    } on DioException catch (e) {
      throw _handle(e);
    }
  }

  AppException _handle(DioException e) {
    final msg = (e.response?.data as Map<String, dynamic>?)?['error'] as String? ?? e.message ?? 'Request failed';
    final code = e.response?.statusCode;
    if (code == 401) return UnauthorizedException(msg);
    if (code == 403) return AppException(msg, 403);
    return AppException(msg, code);
  }
}
