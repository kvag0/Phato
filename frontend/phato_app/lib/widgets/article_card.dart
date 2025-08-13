import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../pages/article_detail_page.dart';

/// O widget que exibe um único artigo de notícia no feed.
class ArticleCard extends StatelessWidget {
  final Article article;

  const ArticleCard({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () {
        Navigator.of(context).push(
          // Usamos CupertinoPageRoute para ter a animação de transição nativa do iOS.
          CupertinoPageRoute(
            builder: (context) => ArticleDetailPage(article: article),
          ),
        );
      },
      child: Padding(
        // O resto do código do card continua exatamente igual.
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Container(
          // Usamos ClipRRect para garantir que a imagem dentro do container
          // também tenha as bordas arredondadas.
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: AppTheme.phatoCardGray,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- IMAGEM DO ARTIGO ---
              // Programação defensiva: verificamos se a URL da imagem existe.
              if (article.imageUrl != null && article.imageUrl!.isNotEmpty)
                Image.network(
                  article.imageUrl!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  // Mostra um indicador de carregamento enquanto a imagem baixa.
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      height: 200,
                      color: AppTheme.phatoBlack,
                      child: const Center(child: CupertinoActivityIndicator()),
                    );
                  },
                  // Mostra um ícone de erro se a imagem não conseguir ser carregada.
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 200,
                      color: AppTheme.phatoBlack,
                      child: const Icon(
                        CupertinoIcons.photo,
                        color: AppTheme.phatoTextGray,
                        size: 40,
                      ),
                    );
                  },
                )
              else
                // Placeholder para quando não há imagem.
                Container(
                  height: 200,
                  color: AppTheme.phatoBlack,
                  child: const Icon(
                    CupertinoIcons.photo,
                    color: AppTheme.phatoTextGray,
                    size: 40,
                  ),
                ),

              // --- CONTEÚDO DO CARD (TÍTULO, CATEGORIA, AÇÕES) ---
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- TÍTULO ---
                    Text(
                      article.title,
                      style: AppTheme.headlineStyle.copyWith(fontSize: 18),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),

                    // --- PÍLULA DA CATEGORIA ---
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.phatoYellow.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        article.category,
                        style: AppTheme.bodyTextStyle.copyWith(
                          color: AppTheme.phatoYellow,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // --- BOTÕES DE AÇÃO ---
                    Row(
                      children: [
                        // O Expanded empurra os botões para o canto direito.
                        const Expanded(child: SizedBox()),
                        CupertinoButton(
                          child: const Icon(
                            CupertinoIcons.bookmark,
                            color: AppTheme.phatoTextGray,
                          ),
                          onPressed: () {
                            // TODO: Implementar a lógica de "Salvar para ler depois".
                          },
                        ),
                        CupertinoButton(
                          child: const Icon(
                            CupertinoIcons.share,
                            color: AppTheme.phatoTextGray,
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
            ],
          ),
        ),
      ),
    );
  }
}
