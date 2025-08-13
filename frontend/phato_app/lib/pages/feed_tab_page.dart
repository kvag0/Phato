import 'package:flutter/cupertino.dart';
import '../components/custom_app_header.dart';
import '../components/feed_filter_pills.dart';
import '../components/welcome_header.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/category_highlights_bar.dart';
import '../widgets/article_card.dart';

// 1. Convertemos para StatefulWidget para gerir o ciclo de vida da chamada à API.
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
    return CupertinoPageScaffold(
      navigationBar: const CustomAppHeader(),
      child: SafeArea(
        child: FutureBuilder<List<Article>>(
          future: _articlesFuture,
          builder: (context, snapshot) {
            // Os estados de 'loading' e 'error' continuam iguais.
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CupertinoActivityIndicator());
            } else if (snapshot.hasError) {
              return Center(child: Text('Erro: ${snapshot.error}'));
            } else if (snapshot.hasData) {
              final articles = snapshot.data!;
              if (articles.isEmpty) {
                return const Center(child: Text('Nenhum artigo encontrado.'));
              }
              return ListView(
                children: [
                  // Os nossos widgets de "cabeçalho de conteúdo" são agora
                  // os primeiros itens da nossa lista rolável.
                  WelcomeHeader(),
                  const CategoryHighlightsBar(),
                  const FeedFilterPills(),
                  ...articles
                      .map((article) => ArticleCard(article: article))
                      .toList(),
                ],
              );
            }
            return const Center(child: Text('Algo correu mal.'));
          },
        ),
      ),
    );
  }
}
