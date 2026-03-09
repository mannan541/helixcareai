part of 'chat_bloc.dart';

sealed class ChatEvent extends Equatable {
  const ChatEvent();
  @override
  List<Object?> get props => [];
}

final class ChatLoadHistoryRequested extends ChatEvent {
  final String? childId;
  const ChatLoadHistoryRequested(this.childId);
  @override
  List<Object?> get props => [childId];
}

final class ChatSendMessageRequested extends ChatEvent {
  final String? childId;
  final String question;
  const ChatSendMessageRequested(this.childId, this.question);
  @override
  List<Object?> get props => [childId, question];
}

/// Trim messages to given index (exclusive). Used when editing a user message.
final class ChatTrimMessagesToIndex extends ChatEvent {
  final int index;
  const ChatTrimMessagesToIndex(this.index);
  @override
  List<Object?> get props => [index];
}

/// Retry: remove last exchange (user + assistant) and resend the user question.
/// If [assistantMessageIndex] is set, retry that specific assistant reply (trim to before its user message, then resend).
final class ChatRetryRequested extends ChatEvent {
  final String? childId;
  final int? assistantMessageIndex;
  const ChatRetryRequested(this.childId, [this.assistantMessageIndex]);
  @override
  List<Object?> get props => [childId, assistantMessageIndex];
}

