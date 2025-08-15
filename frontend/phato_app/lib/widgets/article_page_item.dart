import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../pages/article_detail_page.dart';

class ArticlePageItem extends StatelessWidget {
  final Article article;

  const ArticlePageItem({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
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
                  // MUDANÇA #1: Garante que a imagem inteira seja visível.
                  fit: BoxFit.contain,
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
            // MUDANÇA #2: Envolvemos o texto da descrição com Expanded.
            Expanded(
              child: Text(
                article.description ?? 'Sem resumo.',
                style: AppTheme.bodyTextStyle.copyWith(
                  color: AppTheme.phatoTextGray.withOpacity(0.8),
                  fontSize: 16,
                  height: 1.4,
                ),
                // maxLines já não é necessário, pois o Expanded gere o espaço.
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.bookmark,
                    color: AppTheme.phatoYellow,
                  ),
                  onPressed: () {},
                ),
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.share,
                    color: AppTheme.phatoYellow,
                  ),
                  onPressed: () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
