import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../children/domain/child_entity.dart';
import 'chat_bloc.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)?.settings.arguments;
    if (child is! ChildEntity) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chat')),
        body: const Center(child: Text('Select a child from the list first.')),
      );
    }
    return BlocProvider(
      create: (_) => ChatBloc(chatRepository)..add(ChatLoadHistoryRequested(child.id)),
      child: _ChatView(child: child),
    );
  }
}

class _ChatView extends StatefulWidget {
  const _ChatView({required this.child});

  final ChildEntity child;

  @override
  State<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<_ChatView> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Chat — ${widget.child.fullName}')),
      body: BlocConsumer<ChatBloc, ChatState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: SelectableText(state.error!)));
          }
        },
        builder: (context, state) {
          Widget listContent;
          if (state.isLoading && state.messages.isEmpty) {
            listContent = const Center(child: CircularProgressIndicator());
          } else if (state.error != null && state.messages.isEmpty) {
            listContent = Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SelectableText(state.error!, textAlign: TextAlign.center),
                  TextButton(
                    onPressed: () => context.read<ChatBloc>().add(ChatLoadHistoryRequested(widget.child.id)),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (state.messages.isEmpty) {
            listContent = const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Ask anything about this child\'s sessions. Answers are grounded in their session notes.'),
              ),
            );
          } else {
            listContent = ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.messages.length,
              itemBuilder: (context, i) {
                final m = state.messages[i];
                final isUser = m.role == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser ? Theme.of(context).colorScheme.primaryContainer : Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SelectableText(m.content, style: const TextStyle(fontSize: 15)),
                        const SizedBox(height: 4),
                        SelectableText(
                          _formatTime(m.createdAt),
                          style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          }
          return Column(
            children: [
              Expanded(child: listContent),
              if (state.isSending)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(hintText: 'Ask about this child...'),
                        maxLines: 2,
                        onSubmitted: (_) => _send(context),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: state.isSending ? null : () => _send(context),
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _formatTime(DateTime d) {
    return formatAppDateTime(d);
  }

  void _send(BuildContext context) {
    final q = _controller.text.trim();
    if (q.isEmpty) return;
    _controller.clear();
    context.read<ChatBloc>().add(ChatSendMessageRequested(widget.child.id, q));
  }
}
