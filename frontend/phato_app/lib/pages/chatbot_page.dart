import 'package:flutter/cupertino.dart';
import '../components/chat_bubble.dart';
import '../components/chat_input_field.dart';
import '../models/chat_message.dart';
import '../services/api_service.dart';

/// A page for the global PhatoBot, using the RAG model.
class ChatbotPage extends StatefulWidget {
  const ChatbotPage({super.key});

  @override
  State<ChatbotPage> createState() => _ChatbotPageState();
}

class _ChatbotPageState extends State<ChatbotPage> {
  final ApiService _apiService = ApiService();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Add an initial greeting from the bot.
    _messages.add(
      ChatMessage(
        sender: ChatMessageSender.bot,
        text:
            'Olá! Sou o PhatoBot. Pergunte-me qualquer coisa sobre as notícias e eu farei o meu melhor para responder com base nos factos.',
      ),
    );
  }

  Future<void> _getBotResponse(String question) async {
    setState(() {
      _isLoading = true;
    });
    try {
      final responseText = await _apiService.getRAGResponse(question: question);
      final botMessage = ChatMessage(
        sender: ChatMessageSender.bot,
        text: responseText,
      );
      setState(() {
        _messages.add(botMessage);
      });
    } catch (e) {
      final errorMessage = ChatMessage(
        sender: ChatMessageSender.bot,
        text: 'Desculpe, ocorreu um erro: $e',
      );
      setState(() {
        _messages.add(errorMessage);
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _onSendMessage(String message) {
    final userMessage = ChatMessage(
      sender: ChatMessageSender.user,
      text: message,
    );
    setState(() {
      _messages.add(userMessage);
    });
    _getBotResponse(message);
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('PhatoBot'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.square_list),
          onPressed: () {
            // TODO: Navigate to chat history page.
          },
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: ListView.builder(
              reverse: true,
              padding: const EdgeInsets.all(16.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages.reversed.toList()[index];
                return ChatBubble(message: message);
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: CupertinoActivityIndicator(),
            ),
          ChatInputField(onSendMessage: _onSendMessage),
        ],
      ),
    );
  }
}
