import 'article.dart';

enum ChatMessageSender { user, bot }

class ChatMessage {
  final String text;
  final ChatMessageSender sender;
  final Article? articleContext; // Para a primeira mensagem do utilizador

  ChatMessage({required this.text, required this.sender, this.articleContext});
}
