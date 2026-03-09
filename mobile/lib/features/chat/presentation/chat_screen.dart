import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/date_format.dart';
import '../../children/domain/child_entity.dart';
import 'chat_bloc.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key, this.showAppBar = true});
  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    final child = ModalRoute.of(context)?.settings.arguments;
    if (child is! ChildEntity) {
      return Scaffold(
        appBar: showAppBar ? AppBar(title: const Text('Chat')) : null,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.chat_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Select a child from the Children list to start a chat.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  // If we are in MainScreen, we might want to switch tabs.
                  // For now, just a hint is fine or we can use a callback.
                },
                child: const Text('Go to Children'),
              ),
            ],
          ),
        ),
      );
    }
    return BlocProvider(
      create: (_) => ChatBloc(chatRepository)..add(ChatLoadHistoryRequested(child.id)),
      child: _ChatView(child: child, showAppBar: showAppBar),
    );
  }
}

class _ChatView extends StatefulWidget {
  const _ChatView({required this.child, required this.showAppBar});

  final ChildEntity child;
  final bool showAppBar;

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
      appBar: widget.showAppBar ? AppBar(title: Text('Chat — ${widget.child.fullName}')) : null,
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
              reverse: true,
              padding: const EdgeInsets.all(16),
              itemCount: state.messages.length,
              itemBuilder: (context, i) {
                final m = state.messages[state.messages.length - 1 - i];
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            SelectableText(
                              _formatTime(m.createdAt),
                              style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
                            ),
                            if (isUser)
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                onPressed: state.isSending
                                    ? null
                                    : () {
                                        context.read<ChatBloc>().add(ChatTrimMessagesToIndex(state.messages.length - 1 - i));
                                        WidgetsBinding.instance.addPostFrameCallback((_) {
                                          _controller.text = m.content;
                                          _controller.selection = TextSelection.collapsed(offset: m.content.length);
                                        });
                                      },
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Edit and resend',
                              )
                            else
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.copy, size: 18),
                                    onPressed: () {
                                      Clipboard.setData(ClipboardData(text: m.content));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Copied to clipboard')),
                                      );
                                    },
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    tooltip: 'Copy',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.thumb_up_outlined, size: 18),
                                    onPressed: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Thanks for your feedback')),
                                      );
                                    },
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    tooltip: 'Good response',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.thumb_down_outlined, size: 18),
                                    onPressed: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Thanks for your feedback')),
                                      );
                                    },
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    tooltip: 'Poor response',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.refresh, size: 18),
                                    onPressed: state.isSending
                                        ? null
                                        : () => context.read<ChatBloc>().add(ChatRetryRequested(widget.child.id, state.messages.length - 1 - i)),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    tooltip: 'Try again',
                                  ),
                                ],
                              ),
                          ],
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
                        decoration: const InputDecoration(
                          hintText: 'Ask about this child...',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 1,
                        textInputAction: TextInputAction.send,
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
