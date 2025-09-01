import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/article_card.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  Future<List<Article>>? _searchFuture;

  void _performSearch(String query) {
    setState(() {
      _searchFuture = _apiService.hybridSearch(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('Buscar', style: AppTheme.logoStyle),
        backgroundColor: AppTheme.phatoBlack,
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Campo de Busca
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: CupertinoSearchTextField(
                controller: _searchController,
                onSubmitted: _performSearch,
                style: AppTheme.bodyTextStyle,
              ),
            ),
            // Área de Resultados
            Expanded(child: _buildResults()),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    if (_searchFuture == null) {
      return const Center(
        child: Text('Procure por notícias, temas ou fontes.'),
      );
    }

    return FutureBuilder<List<Article>>(
      future: _searchFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CupertinoActivityIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Erro: ${snapshot.error}'));
        }
        if (snapshot.hasData) {
          final articles = snapshot.data!;
          if (articles.isEmpty) {
            return Center(
              child: Text(
                'Nenhum resultado encontrado para "${_searchController.text}".',
              ),
            );
          }
          return ListView.builder(
            itemCount: articles.length,
            itemBuilder: (context, index) {
              return ArticleCard(article: articles[index]);
            },
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
