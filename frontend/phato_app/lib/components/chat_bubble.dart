import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../models/chat_message.dart';
import '../pages/article_detail_page.dart'; // Importamos para a navegação de "volta"

class ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const ChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    // A LÓGICA PRINCIPAL É AQUI:
    // Se a mensagem tiver um contexto de artigo, construímos o card especial.
    if (message.articleContext != null) {
      return _buildArticleContextMessage(
        context,
        message.articleContext!,
        message.text,
      );
    }
    // Caso contrário, construímos um balão de texto normal.
    else {
      return _buildStandardMessage(context);
    }
  }

  /// Constrói o card de contexto especial para a primeira mensagem do utilizador.
  Widget _buildArticleContextMessage(
    BuildContext context,
    Article article,
    String question,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Card de contexto do artigo, que é clicável.
        GestureDetector(
          onTap: () {
            // Navega de volta para a página do artigo.
            Navigator.of(context).push(
              CupertinoPageRoute(
                builder: (context) => ArticleDetailPage(article: article),
              ),
            );
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.phatoCardGray,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (article.imageUrl != null && article.imageUrl!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      article.imageUrl!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                    ),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    article.title,
                    style: AppTheme.secondaryTextStyle.copyWith(fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
        // O balão com a pergunta do utilizador.
        Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          margin: const EdgeInsets.symmetric(vertical: 4.0),
          padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
          decoration: BoxDecoration(
            color: AppTheme.phatoYellow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            question,
            style: AppTheme.bodyTextStyle.copyWith(color: AppTheme.phatoBlack),
          ),
        ),
      ],
    );
  }

  /// Constrói um balão de chat padrão para o utilizador ou para o bot.
  Widget _buildStandardMessage(BuildContext context) {
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
