import 'package:flutter/cupertino.dart';
import '../components/custom_sliver_header.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/article_page_item.dart';

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
    _articlesFuture = _apiService.fetchArticles();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return CupertinoPageScaffold(
      child: CustomScrollView(
        slivers: [
          // O nosso cabeçalho animado personalizado.
          SliverPersistentHeader(
            pinned: true,
            delegate: CustomSliverHeaderDelegate(
              minHeight: 60 + topPadding,
              maxHeight: 320 + topPadding,
            ),
          ),

          // O SliverFillRemaining garante que o nosso PageView ocupe
          // todo o espaço restante e visível no ecrã.
          SliverFillRemaining(
            // hasScrollBody: true é importante para dizer ao CustomScrollView
            // que o filho dele é o principal corpo rolável.
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
                      return ArticlePageItem(article: article);
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
