import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';

/// Representa uma única página de notícia no nosso feed vertical.
class ArticlePageItem extends StatelessWidget {
  final Article article;

  const ArticlePageItem({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return Container(
      // A imagem de fundo do artigo.
      decoration: BoxDecoration(
        color: AppTheme.phatoBlack, // Cor de fallback caso a imagem falhe
        image: article.imageUrl != null && article.imageUrl!.isNotEmpty
            ? DecorationImage(
                image: NetworkImage(article.imageUrl!),
                fit: BoxFit.cover,
                // O ColorFilter aplica um gradiente escuro sobre a imagem
                // para garantir que o texto branco seja sempre legível.
                colorFilter: ColorFilter.mode(
                  AppTheme.phatoBlack.withOpacity(0.5),
                  BlendMode.darken,
                ),
              )
            : null,
      ),
      // Usamos um Padding para afastar o conteúdo das bordas do ecrã.
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          // Alinha todo o conteúdo na parte inferior.
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pílula da Categoria
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

            // Resumo/Descrição
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
            const SizedBox(height: 16),

            // Botões de Ação
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.bookmark,
                    color: AppTheme.phatoTextGray,
                    size: 28,
                  ),
                  onPressed: () {
                    // TODO: Implementar a lógica de "Salvar para ler depois".
                  },
                ),
                CupertinoButton(
                  child: const Icon(
                    CupertinoIcons.share,
                    color: AppTheme.phatoTextGray,
                    size: 28,
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
