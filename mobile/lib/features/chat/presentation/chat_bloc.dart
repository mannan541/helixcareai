import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../data/chat_repository.dart';

part 'chat_event.dart';
part 'chat_state.dart';

class ChatBloc extends Bloc<ChatEvent, ChatState> {
  final ChatRepository _repo;

  ChatBloc(this._repo) : super(const ChatState.initial()) {
    on<ChatLoadHistoryRequested>(_onLoadHistory);
    on<ChatSendMessageRequested>(_onSend);
  }

  Future<void> _onLoadHistory(ChatLoadHistoryRequested e, Emitter<ChatState> emit) async {
    if (e.childId.isEmpty) return;
    emit(const ChatState.loading());
    try {
      final messages = await _repo.getHistory(e.childId);
      emit(ChatState.loaded(messages));
    } catch (err) {
      emit(ChatState.failure(err is Exception ? err.toString() : 'Failed to load history'));
    }
  }

  Future<void> _onSend(ChatSendMessageRequested e, Emitter<ChatState> emit) async {
    final current = state;
    if (current.isLoading || current.error != null) return;
    if (e.question.trim().isEmpty) return;
    final previousMessages = current.messages;
    emit(ChatState.sending(previousMessages));
    try {
      final answer = await _repo.ask(e.childId, e.question.trim());
      final userMsg = ChatMessage(
        id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
        role: 'user',
        content: e.question.trim(),
        createdAt: DateTime.now(),
      );
      final assistantMsg = ChatMessage(
        id: 'temp-a-${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: answer,
        createdAt: DateTime.now(),
      );
      emit(ChatState.loaded([...previousMessages, userMsg, assistantMsg]));
    } catch (err) {
      emit(ChatState.failure(err is Exception ? err.toString() : 'Send failed'));
    }
  }
}
