import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart'; // Usaremos alguns ícones do Material
import '../core/theme/app_theme.dart';
import '../models/article.dart';

class ArticleDetailPage extends StatelessWidget {
  final Article article;

  const ArticleDetailPage({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      // A ALTERAÇÃO ESTÁ AQUI:
      navigationBar: CupertinoNavigationBar(
        middle: Text(
          article.source.name,
          style: AppTheme.secondaryTextStyle.copyWith(fontSize: 16),
        ),
        // Adicionamos um botão de "voltar" personalizado.
        leading: CupertinoNavigationBarBackButton(
          // E damos-lhe uma ação personalizada.
          onPressed: () {
            // Este comando diz ao Navigator para fechar páginas até encontrar
            // a primeira rota na pilha de navegação do separador atual.
            Navigator.of(
              context,
              rootNavigator: true,
            ).popUntil((route) => route.isFirst);
          },
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Icon(
                CupertinoIcons.bookmark,
                color: AppTheme.phatoTextGray,
              ),
              onPressed: () {
                // TODO: Implementar lógica de salvar.
              },
            ),
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Icon(
                CupertinoIcons.share,
                color: AppTheme.phatoTextGray,
              ),
              onPressed: () {
                // TODO: Implementar lógica de partilhar.
              },
            ),
          ],
        ),
      ),
      child: SafeArea(
        // Usamos um ListView para que o conteúdo possa ser rolado.
        child: ListView(
          children: [
            // Imagem do Artigo
            if (article.imageUrl != null && article.imageUrl!.isNotEmpty)
              Image.network(
                article.imageUrl!,
                height: 250,
                width: double.infinity,
                fit: BoxFit.cover,
              ),

            // Padding para o conteúdo de texto
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Título
                  Text(article.title, style: AppTheme.headlineStyle),
                  const SizedBox(height: 8),

                  // Autor e Data
                  Text(
                    'Por ${article.author ?? article.source.name} - ${article.publishedAt.day}/${article.publishedAt.month}/${article.publishedAt.year}',
                    style: AppTheme.secondaryTextStyle.copyWith(fontSize: 14),
                  ),
                  const SizedBox(height: 24),

                  // Secção de Análise da IA
                  if (article.analysis != null)
                    _buildAnalysisSection(article.analysis!),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Widget auxiliar para construir a secção de análise de IA.
  Widget _buildAnalysisSection(Analysis analysis) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppTheme.phatoCardGray,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Análise Phato',
            style: AppTheme.headlineStyle.copyWith(fontSize: 20),
          ),
          const SizedBox(height: 16),
          if (analysis.facts != null) _buildFactsSection(analysis.facts!),
          const SizedBox(height: 20),
          Text(
            'Narrativas Identificadas',
            style: AppTheme.headlineStyle.copyWith(fontSize: 18),
          ),
          const SizedBox(height: 10),
          ...analysis.narratives.map(
            (narrative) => _buildNarrativeCard(narrative),
          ),
        ],
      ),
    );
  }

  // Widget para os Factos (5W1H)
  Widget _buildFactsSection(Facts facts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFactRow(Icons.people_outline, 'Quem:', facts.who.join(', ')),
        _buildFactRow(Icons.article_outlined, 'O quê:', facts.what),
        _buildFactRow(Icons.today_outlined, 'Quando:', facts.when),
        _buildFactRow(Icons.place_outlined, 'Onde:', facts.where.join(', ')),
      ],
    );
  }

  Widget _buildFactRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.phatoYellow, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(
                text: '$label ',
                style: AppTheme.bodyTextStyle.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                children: [
                  TextSpan(
                    text: value,
                    style: AppTheme.bodyTextStyle.copyWith(
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Widget para um card de Narrativa
  Widget _buildNarrativeCard(Narrative narrative) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            narrative.title ?? 'Título da Perspetiva',
            style: AppTheme.bodyTextStyle.copyWith(
              color: AppTheme.phatoYellow,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            narrative.summary ?? 'Sem resumo.',
            style: AppTheme.secondaryTextStyle,
          ),
        ],
      ),
    );
  }
}
