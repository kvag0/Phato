import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../widgets/category_highlights_bar.dart';
import 'feed_filter_toggle.dart';
import 'welcome_header.dart';

class CustomSliverHeaderDelegate extends SliverPersistentHeaderDelegate {
  final double minHeight;
  final double maxHeight;

  // Parâmetros de categoria foram removidos.
  const CustomSliverHeaderDelegate({
    required this.minHeight,
    required this.maxHeight,
  });

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    // Calcula o progresso do scroll de 0.0 (totalmente expandido) a 1.0 (totalmente encolhido).
    final progress = (shrinkOffset / (maxHeight - minHeight)).clamp(0.0, 1.0);

    // Anima a opacidade do conteúdo que desaparece (saudação, highlights, etc.).
    // O fade-out é rápido, terminando a meio do scroll.
    final contentOpacity = (1.0 - (progress * 2)).clamp(0.0, 1.0);

    // Anima a opacidade dos filtros que aparecem no cabeçalho fixo.
    // Eles só começam a aparecer depois de o scroll ter avançado 50%.
    final headerFilterOpacity = ((progress - 0.5) * 2).clamp(0.0, 1.0);

    return Container(
      color: AppTheme.phatoBlack,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // --- CAMADA DE FUNDO (Conteúdo que desaparece com o scroll) ---
          Positioned(
            top:
                minHeight, // Começa a ser desenhado abaixo da área do cabeçalho fixo.
            left: 0,
            right: 0,
            child: Opacity(
              opacity: contentOpacity,
              // Usamos 'IgnorePointer' para que o utilizador não consiga tocar
              // nestes widgets quando eles estão invisíveis.
              child: IgnorePointer(
                ignoring: contentOpacity == 0.0,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    WelcomeHeader(),
                    const CategoryHighlightsBar(),
                    const FeedFilterToggle(),
                  ],
                ),
              ),
            ),
          ),

          // --- CAMADA DA FRENTE (Cabeçalho fixo e animado) ---
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              color: AppTheme.phatoBlack,
              height: minHeight,
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top,
                left: 16,
                right: 16,
              ),
              // Usamos um Stack para garantir o alinhamento simétrico.
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // CAMADA 1: Logo e Ícones nos cantos.
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Contentor do Logo (à esquerda) com largura fixa.
                      SizedBox(
                        width: 90,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Phato', style: AppTheme.logoStyle),
                        ),
                      ),
                      // Contentor dos Ícones (à direita) com a mesma largura.
                      SizedBox(
                        width: 90,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            CupertinoButton(
                              padding: const EdgeInsets.all(4.0),
                              onPressed: () {},
                              child: const Icon(
                                CupertinoIcons.search,
                                color: AppTheme.phatoTextGray,
                              ),
                            ),
                            CupertinoButton(
                              padding: const EdgeInsets.all(4.0),
                              onPressed: () {},
                              child: const Icon(
                                CupertinoIcons.person,
                                color: AppTheme.phatoTextGray,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // CAMADA 2: Filtros que aparecem no centro absoluto.
                  Opacity(
                    opacity: headerFilterOpacity,
                    child: const FeedFilterToggle(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // A altura máxima do nosso cabeçalho (quando está totalmente expandido).
  @override
  double get maxExtent => maxHeight;

  // A altura mínima do nosso cabeçalho (quando está totalmente encolhido).
  @override
  double get minExtent => minHeight;

  // Informa o Flutter para reconstruir o widget a cada frame do scroll
  // para que a nossa animação seja fluida.
  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) {
    return true;
  }
}
