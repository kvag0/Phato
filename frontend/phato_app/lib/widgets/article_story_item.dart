import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../pages/article_detail_page.dart'; // 1. Importe a página de detalhes.

/// Representa uma única página de notícia no formato de story/ecrã inteiro.
class ArticleStoryItem extends StatelessWidget {
  final Article article;

  const ArticleStoryItem({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    // 2. Envolvemos o nosso Container com um GestureDetector.
    return GestureDetector(
      onTap: () {
        // 3. Adicionamos a lógica de navegação para a página de detalhes.
        Navigator.of(context).push(
          CupertinoPageRoute(
            builder: (context) => ArticleDetailPage(article: article),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 100.0),
        decoration: BoxDecoration(
          color: AppTheme.phatoBlack,
          image: article.imageUrl != null && article.imageUrl!.isNotEmpty
              ? DecorationImage(
                  image: NetworkImage(article.imageUrl!),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    AppTheme.phatoBlack.withOpacity(0.5),
                    BlendMode.darken,
                  ),
                )
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Categoria
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.phatoYellow.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.phatoYellow, width: 1),
              ),
              child: Text(
                article.category.toUpperCase(),
                style: AppTheme.bodyTextStyle.copyWith(
                  color: AppTheme.phatoYellow,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Título
            Text(
              article.title,
              style: AppTheme.headlineStyle.copyWith(
                fontSize: 26,
                color: AppTheme.phatoTextGray,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),

            // Descrição
            Text(
              article.description ?? 'Sem resumo disponível.',
              style: AppTheme.bodyTextStyle.copyWith(
                color: AppTheme.phatoTextGray.withOpacity(0.8),
                fontSize: 16,
                height: 1.4,
              ),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
