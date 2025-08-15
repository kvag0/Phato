import 'package:flutter/cupertino.dart';

class ChatbotPage extends StatelessWidget {
  final String? initialQuestion;
  final String? articleContextId;

  const ChatbotPage({super.key, this.initialQuestion, this.articleContextId});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('PhatoBot')),
      child: Center(
        child: Text(
          'Página do Chatbot.\nPergunta: ${initialQuestion ?? 'Nenhuma'}\nContexto: ${articleContextId ?? 'Nenhum'}',
        ),
      ),
    );
  }
}
