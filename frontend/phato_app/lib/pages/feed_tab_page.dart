import 'package:flutter/cupertino.dart';
import '../components/custom_sliver_header.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/article_page_item.dart';
import '../widgets/category_highlights_bar.dart';
import '../widgets/article_story_item.dart'; // Mude a importação de article_page_item para esta

class FeedTabPage extends StatefulWidget {
  const FeedTabPage({super.key});

  @override
  State<FeedTabPage> createState() => _FeedTabPageState();
}

class _FeedTabPageState extends State<FeedTabPage> {
  final ApiService _apiService = ApiService();

  // 1. A Future agora pode ser nula e não é mais 'final'.
  Future<List<Article>>? _articlesFuture;

  // 2. Adicionamos a variável de estado para a categoria selecionada.
  String _selectedCategory = 'world'; // Categoria inicial

  @override
  void initState() {
    super.initState();
    // 3. Carregamos os artigos para a categoria inicial.
    _loadArticles();
  }

  // 4. Criamos um método para (re)carregar os artigos.
  void _loadArticles() {
    setState(() {
      _articlesFuture = _apiService.fetchArticles(category: _selectedCategory);
    });
  }

  // 5. Esta é a nossa função de callback.
  void _onCategorySelected(String categoryId) {
    // Atualizamos o estado com a nova categoria e recarregamos os artigos.
    setState(() {
      _selectedCategory = categoryId;
      _articlesFuture = _apiService.fetchArticles(category: _selectedCategory);
    });
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          SliverPersistentHeader(
            pinned: true,
            delegate: CustomSliverHeaderDelegate(
              minHeight: 60 + topPadding,
              maxHeight: 320 + topPadding,
              // 3. Passamos o estado e o callback para o nosso cabeçalho.
              selectedCategory: _selectedCategory,
              onCategorySelected: _onCategorySelected,
            ),
          ),

          SliverFillRemaining(
            hasScrollBody: true,
            child: FutureBuilder<List<Article>>(
              future: _articlesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CupertinoActivityIndicator());
                } else if (snapshot.hasError) {
                  return Center(child: Text('Erro: ${snapshot.error}'));
                } else if (snapshot.hasData) {
                  final articles = snapshot.data!;
                  if (articles.isEmpty) {
                    return const Center(
                      child: Text('Nenhum artigo encontrado.'),
                    );
                  }

                  // PageView.builder é o widget que cria o efeito de "TikTok".
                  return PageView.builder(
                    scrollDirection: Axis.vertical,
                    itemCount: articles.length,
                    itemBuilder: (context, index) {
                      final article = articles[index];
                      // Mude o nome do widget para o novo que criámos
                      return ArticleStoryItem(article: article);
                    },
                  );
                }
                return const Center(child: Text('Algo correu mal.'));
              },
            ),
          ),
        ],
      ),
    );
  }
}
