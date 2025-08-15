import 'package:flutter/cupertino.dart';
import '../components/custom_sliver_header.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/article_story_item.dart';

class FeedTabPage extends StatefulWidget {
  const FeedTabPage({super.key});

  @override
  State<FeedTabPage> createState() => _FeedTabPageState();
}

class _FeedTabPageState extends State<FeedTabPage> {
  final ApiService _apiService = ApiService();
  late final Future<List<Article>> _articlesFuture;

  @override
  void initState() {
    super.initState();
    _articlesFuture = _apiService.fetchArticles(); // Busca os artigos padrão
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          // O cabeçalho agora é chamado sem os parâmetros de categoria.
          SliverPersistentHeader(
            pinned: true,
            delegate: CustomSliverHeaderDelegate(
              minHeight: 60 + topPadding,
              maxHeight: 320 + topPadding,
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
                  return PageView.builder(
                    scrollDirection: Axis.vertical,
                    itemCount: articles.length,
                    itemBuilder: (context, index) {
                      final article = articles[index];
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
