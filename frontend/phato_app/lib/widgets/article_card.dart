import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../pages/article_detail_page.dart';

/// Um card compacto para exibir um artigo numa lista de resultados de busca.
class ArticleCard extends StatelessWidget {
  final Article article;

  const ArticleCard({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      onPressed: () {
        Navigator.of(context).push(
          CupertinoPageRoute(
            builder: (context) => ArticleDetailPage(article: article),
          ),
        );
      },
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: AppTheme.phatoCardGray,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            // Imagem à esquerda
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                article.imageUrl ?? '',
                width: 100,
                height: 100,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 100,
                    height: 100,
                    color: AppTheme.phatoBlack,
                    child: const Icon(
                      CupertinoIcons.photo,
                      color: AppTheme.phatoTextGray,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 16),
            // Título e fonte à direita
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    style: AppTheme.bodyTextStyle.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    article.source.name,
                    style: AppTheme.secondaryTextStyle.copyWith(fontSize: 14),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
