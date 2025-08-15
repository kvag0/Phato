import 'package:flutter/cupertino.dart';
import '../components/chat_bubble.dart';
import '../components/chat_input_field.dart';
import '../models/article.dart'; // Importamos o modelo Article
import '../models/chat_message.dart';
import '../services/api_service.dart';

class ChatbotPage extends StatefulWidget {
  final String? initialQuestion;
  // A ALTERAÇÃO ESTÁ AQUI: Trocamos o articleContextId pelo objeto Article completo.
  final Article? articleContext;

  const ChatbotPage({super.key, this.initialQuestion, this.articleContext});

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
    // Se a página for aberta com uma pergunta inicial e um contexto, processa-os.
    if (widget.initialQuestion != null && widget.articleContext != null) {
      _handleInitialQuestion();
    }
  }

  void _handleInitialQuestion() {
    final initialMessage = ChatMessage(
      text: widget.initialQuestion!,
      sender: ChatMessageSender.user,
      articleContext: widget.articleContext, // Adiciona o contexto do artigo
    );

    setState(() {
      _messages.add(initialMessage);
    });

    _getBotResponse(
      question: widget.initialQuestion!,
      articleId: widget.articleContext!.id,
    );
  }

  Future<void> _getBotResponse({
    required String question,
    String? articleId,
  }) async {
    setState(() {
      _isLoading = true;
    });
    try {
      final responseText = await _apiService.getChatbotResponse(
        question: question,
        articleId: articleId ?? widget.articleContext?.id ?? '',
      );
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
    _getBotResponse(question: message);
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
            // TODO: Navegar para a página de histórico de chats.
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
