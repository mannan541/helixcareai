part of 'chat_bloc.dart';

sealed class ChatEvent extends Equatable {
  const ChatEvent();
  @override
  List<Object?> get props => [];
}

final class ChatLoadHistoryRequested extends ChatEvent {
  final String childId;
  const ChatLoadHistoryRequested(this.childId);
  @override
  List<Object?> get props => [childId];
}

final class ChatSendMessageRequested extends ChatEvent {
  final String childId;
  final String question;
  const ChatSendMessageRequested(this.childId, this.question);
  @override
  List<Object?> get props => [childId, question];
}
