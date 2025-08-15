import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../components/chat_input_field.dart'; // Importe o seu novo componente
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import 'chatbot_page.dart'; // Importe a página de chatbot

// 1. Convertido para StatefulWidget para gerir o estado de visibilidade do chat.
class ArticleDetailPage extends StatefulWidget {
  final Article article;

  const ArticleDetailPage({super.key, required this.article});

  @override
  State<ArticleDetailPage> createState() => _ArticleDetailPageState();
}

class _ArticleDetailPageState extends State<ArticleDetailPage> {
  // Variável de estado para controlar a visibilidade.
  bool _isChatInputVisible = false;

  void _onSendMessage(String message) {
    setState(() {
      _isChatInputVisible = false;
    });

    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(
        builder: (context) => ChatbotPage(
          initialQuestion: message,
          articleContext: widget.article,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(
          widget.article.source.name,
          style: AppTheme.secondaryTextStyle.copyWith(fontSize: 16),
        ),
        leading: CupertinoNavigationBarBackButton(
          onPressed: () {
            Navigator.of(context).popUntil((route) => route.isFirst);
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
              onPressed: () {},
            ),
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Icon(
                CupertinoIcons.share,
                color: AppTheme.phatoTextGray,
              ),
              onPressed: () {},
            ),
          ],
        ),
      ),
      // 2. O child principal é agora um Stack para permitir sobreposições.
      child: Stack(
        children: [
          // CAMADA 1: O conteúdo original da página.
          SafeArea(
            child: ListView(
              // Adicionamos um padding na parte de baixo para garantir que o último
              // item não fica escondido atrás do ícone de chat.
              padding: const EdgeInsets.only(bottom: 30.0),
              children: [
                if (widget.article.imageUrl != null &&
                    widget.article.imageUrl!.isNotEmpty)
                  Image.network(
                    widget.article.imageUrl!,
                    height: 250,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.article.title, style: AppTheme.headlineStyle),
                      const SizedBox(height: 8),
                      Text(
                        'Por ${widget.article.author ?? widget.article.source.name} - ${widget.article.publishedAt.day}/${widget.article.publishedAt.month}/${widget.article.publishedAt.year}',
                        style: AppTheme.secondaryTextStyle.copyWith(
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (widget.article.analysis != null)
                        _buildAnalysisSection(widget.article.analysis!),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // CAMADA 2: O ícone de chat flutuante (só visível se o campo de texto estiver escondido).
          if (!_isChatInputVisible)
            Positioned(
              // A ALTERAÇÃO É AQUI: Aumentamos a distância da parte inferior.
              bottom: 100,
              right: 32,
              child: CupertinoButton(
                color: AppTheme.phatoYellow,
                padding: const EdgeInsets.all(8.0),
                borderRadius: BorderRadius.circular(28),
                child: const Icon(
                  CupertinoIcons.chat_bubble_2_fill,
                  color: AppTheme.phatoBlack,
                  size: 28,
                ),
                onPressed: () {
                  setState(() {
                    _isChatInputVisible = true;
                  });
                },
              ),
            ),

          // CAMADA 3: O campo de texto animado que desliza para cima.
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            bottom: _isChatInputVisible
                ? 0
                : -100, // -100 esconde-o por baixo do ecrã.
            left: 0,
            right: 0,
            child: ChatInputField(onSendMessage: _onSendMessage),
          ),
        ],
      ),
    );
  }

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
