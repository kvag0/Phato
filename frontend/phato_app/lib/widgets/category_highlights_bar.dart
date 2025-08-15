import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../models/category.dart';
import '../pages/story_viewer_page.dart';
import '../services/api_service.dart';

class CategoryHighlightsBar extends StatefulWidget {
  // Os parâmetros que este widget recebia foram removidos,
  // pois agora ele gere o seu próprio estado e ações.
  const CategoryHighlightsBar({super.key});

  @override
  State<CategoryHighlightsBar> createState() => _CategoryHighlightsBarState();
}

class _CategoryHighlightsBarState extends State<CategoryHighlightsBar> {
  final ApiService _apiService = ApiService();
  late final Future<List<Category>> _categoriesFuture;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = _apiService.fetchCategories();
  }

  // ESTA É A NOVA FUNÇÃO QUE CONTÉM A LÓGICA PRINCIPAL
  Future<void> _navigateToStories(
    BuildContext context,
    Category category,
  ) async {
    showCupertinoModalPopup(
      context: context,
      builder: (BuildContext context) =>
          const Center(child: CupertinoActivityIndicator()),
    );

    try {
      final articles = await _apiService.fetchArticles(category: category.id);
      Navigator.of(context).pop(); // Fecha o loading
      if (!mounted) return;

      if (articles.isEmpty) {
        // ... (o alerta de "Sem Notícias" continua igual)
      } else {
        // A CORREÇÃO É AQUI: Usamos showCupertinoModalPopup para apresentar a página.
        showCupertinoModalPopup(
          context: context,
          // fullscreenDialog: true, // Descomente se quiser uma transição de baixo para cima
          builder: (context) => StoryViewerPage(articles: articles),
        );
      }
    } catch (e) {
      // Em caso de erro na busca, fecha o loading e mostra um alerta de erro.
      Navigator.of(context).pop();
      if (!mounted) return;
      showCupertinoDialog(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: const Text('Erro'),
          content: Text('Não foi possível carregar as notícias: $e'),
          actions: [
            CupertinoDialogAction(
              child: const Text('OK'),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 110,
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: FutureBuilder<List<Category>>(
        future: _categoriesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CupertinoActivityIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Erro ao carregar categorias',
                style: AppTheme.secondaryTextStyle,
              ),
            );
          }
          if (snapshot.hasData) {
            final categories = snapshot.data!;
            return ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: categories.length + 1,
              padding: const EdgeInsets.only(left: 16.0),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _buildAddItem();
                }
                final category = categories[index - 1];
                return _buildHighlightItem(
                  category.name,
                  onTap: () => _navigateToStories(
                    context,
                    category,
                  ), // LIGAÇÃO DA LÓGICA
                );
              },
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  // --- MÉTODOS AUXILIARES (BUILDERS) ---

  Widget _buildAddItem() {
    return _buildBaseHighlight(
      title: 'Adicionar',
      child: const Icon(
        CupertinoIcons.add,
        color: AppTheme.phatoTextGray,
        size: 32,
      ),
      onTap: () {},
    );
  }

  Widget _buildHighlightItem(String title, {required VoidCallback onTap}) {
    return _buildBaseHighlight(
      title: title,
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          // A borda de seleção já não é necessária aqui, pois a ação é a navegação.
          // Podemos reintroduzi-la mais tarde se quisermos mostrar a última categoria vista.
          border: Border.all(color: AppTheme.phatoYellow, width: 2.5),
        ),
      ),
      onTap: onTap, // Usamos o callback aqui.
    );
  }

  Widget _buildBaseHighlight({
    required String title,
    required Widget child,
    required VoidCallback onTap,
  }) {
    const double circleSize = 70.0;
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      onPressed: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(width: circleSize, height: circleSize, child: child),
          const SizedBox(height: 6),
          Text(
            title,
            style: AppTheme.secondaryTextStyle.copyWith(fontSize: 14),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
