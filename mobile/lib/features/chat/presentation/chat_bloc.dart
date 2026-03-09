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
    on<ChatTrimMessagesToIndex>(_onTrimMessagesToIndex);
    on<ChatRetryRequested>(_onRetry);
  }

  Future<void> _onLoadHistory(ChatLoadHistoryRequested e, Emitter<ChatState> emit) async {
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
    final userMsg = ChatMessage(
      id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: e.question.trim(),
      createdAt: DateTime.now(),
    );
    final messagesWithUser = [...previousMessages, userMsg];
    emit(ChatState.sending(messagesWithUser));
    try {
      final answer = await _repo.ask(e.childId, e.question.trim());
      final assistantMsg = ChatMessage(
        id: 'temp-a-${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: answer,
        createdAt: DateTime.now(),
      );
      emit(ChatState.loaded([...messagesWithUser, assistantMsg]));
    } catch (err) {
      final msg = err is Exception ? err.toString() : 'Send failed';
      emit(ChatState.sendFailed(messagesWithUser, msg));
    }
  }

  void _onTrimMessagesToIndex(ChatTrimMessagesToIndex e, Emitter<ChatState> emit) {
    final current = state;
    if (current.messages.isEmpty || e.index <= 0 || e.index > current.messages.length) return;
    emit(ChatState.loaded(current.messages.sublist(0, e.index)));
  }

  Future<void> _onRetry(ChatRetryRequested e, Emitter<ChatState> emit) async {
    final current = state;
    if (current.messages.isEmpty || current.isSending) return;
    final messages = current.messages;
    int userIndex;
    if (e.assistantMessageIndex != null) {
      final idx = e.assistantMessageIndex!;
      if (idx <= 0 || idx >= messages.length || messages[idx - 1].role != 'user') return;
      userIndex = idx - 1;
    } else {
      userIndex = -1;
      for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role == 'user') {
          userIndex = i;
          break;
        }
      }
      if (userIndex < 0) return;
    }
    final question = messages[userIndex].content;
    final trimmed = messages.sublist(0, userIndex);
    final userMsg = ChatMessage(
      id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: question,
      createdAt: DateTime.now(),
    );
    emit(ChatState.sending([...trimmed, userMsg]));
    try {
      final answer = await _repo.ask(e.childId, question);
      final assistantMsg = ChatMessage(
        id: 'temp-a-${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: answer,
        createdAt: DateTime.now(),
      );
      emit(ChatState.loaded([...trimmed, userMsg, assistantMsg]));
    } catch (err) {
      final msg = err is Exception ? err.toString() : 'Send failed';
      emit(ChatState.sendFailed([...trimmed, userMsg], msg));
    }
  }
}
