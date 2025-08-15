import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:phato_app/pages/article_detail_page.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';

class ArticlePageItem extends StatelessWidget {
  final Article article;

  const ArticlePageItem({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // 3. Adicionamos a lógica de navegação aqui.
        Navigator.of(context).push(
          CupertinoPageRoute(
            builder: (context) => ArticleDetailPage(article: article),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 100.0),
        decoration: BoxDecoration(
          image: DecorationImage(
            image: NetworkImage(article.imageUrl ?? ''),
            fit: BoxFit.cover,
            colorFilter: ColorFilter.mode(
              Colors.black.withOpacity(0.4),
              BlendMode.darken,
            ),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.phatoYellow,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                article.category.toUpperCase(),
                style: AppTheme.bodyTextStyle.copyWith(
                  color: AppTheme.phatoBlack,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              article.title,
              style: AppTheme.headlineStyle.copyWith(
                fontSize: 24,
                color: Colors.white,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Text(
              article.description ?? 'Sem resumo.',
              style: AppTheme.bodyTextStyle.copyWith(color: Colors.white70),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.bookmark,
                    color: AppTheme.phatoYellow,
                  ),
                  onPressed: () {
                    // TODO: Implementar a lógica de "Salvar para ler depois".
                  },
                ),
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.share,
                    color: AppTheme.phatoYellow,
                  ),
                  onPressed: () {
                    // TODO: Implementar a lógica de "Partilhar".
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
