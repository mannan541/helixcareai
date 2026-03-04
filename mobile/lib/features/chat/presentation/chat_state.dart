part of 'chat_bloc.dart';

class ChatState extends Equatable {
  final bool isLoading;
  final bool isSending;
  final List<ChatMessage> messages;
  final String? error;

  const ChatState({
    required this.isLoading,
    required this.isSending,
    required this.messages,
    this.error,
  });

  const ChatState.initial()
      : isLoading = false,
        isSending = false,
        messages = const [],
        error = null;

  const ChatState.loading()
      : isLoading = true,
        isSending = false,
        messages = const [],
        error = null;

  ChatState.loaded(List<ChatMessage> list)
      : isLoading = false,
        isSending = false,
        messages = list,
        error = null;

  ChatState.sending(List<ChatMessage> list)
      : isLoading = false,
        isSending = true,
        messages = list,
        error = null;

  ChatState.failure(String msg)
      : isLoading = false,
        isSending = false,
        messages = const [],
        error = msg;

  @override
  List<Object?> get props => [isLoading, isSending, messages, error];
}
