import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/chat_message.dart';

/// A simple bubble widget to display a single chat message.
/// It styles the message based on whether the sender is the user or the bot.
class ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const ChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    // Aligns the message to the right for the user, and to the left for the bot.
    final alignment = message.sender == ChatMessageSender.user
        ? CrossAxisAlignment.end
        : CrossAxisAlignment.start;

    final color = message.sender == ChatMessageSender.user
        ? AppTheme.phatoYellow
        : AppTheme.phatoCardGray;

    final textColor = message.sender == ChatMessageSender.user
        ? AppTheme.phatoBlack
        : AppTheme.phatoTextGray;

    return Column(
      crossAxisAlignment: alignment,
      children: [
        Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          margin: const EdgeInsets.symmetric(vertical: 4.0),
          padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            message.text,
            style: AppTheme.bodyTextStyle.copyWith(color: textColor),
          ),
        ),
      ],
    );
  }
}
