import 'package:flutter/cupertino.dart';
import '../components/custom_app_header.dart';
import '../components/feed_filter_pills.dart';
import '../components/welcome_header.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import '../widgets/category_highlights_bar.dart';

// 1. Convertemos para StatefulWidget para gerir o ciclo de vida da chamada à API.
class FeedTabPage extends StatefulWidget {
  const FeedTabPage({super.key});

  @override
  State<FeedTabPage> createState() => _FeedTabPageState();
}

class _FeedTabPageState extends State<FeedTabPage> {
  // Criamos uma instância do nosso serviço.
  final ApiService _apiService = ApiService();

  // Criamos uma variável para guardar o nosso "Future".
  // `late final` significa que ela será inicializada uma vez e nunca mais mudará.
  late final Future<List<Article>> _articlesFuture;

  @override
  void initState() {
    super.initState();
    // Chamamos a função da API AQUI, no initState.
    // Isto garante que a chamada de rede é feita apenas uma vez, quando o widget é criado.
    _articlesFuture = _apiService.fetchArticles();
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CustomAppHeader(),
      child: SafeArea(
        child: Container(
          color: CupertinoTheme.of(context).scaffoldBackgroundColor,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              WelcomeHeader(),
              const CategoryHighlightsBar(),
              const FeedFilterPills(),

              // 2. Substituímos o placeholder pelo FutureBuilder.
              Expanded(
                child: FutureBuilder<List<Article>>(
                  // O FutureBuilder vai "ouvir" esta variável.
                  future: _articlesFuture,
                  builder: (context, snapshot) {
                    // 3. Verificamos o estado da conexão.
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      // Enquanto espera, mostra um indicador de carregamento do Cupertino.
                      return const Center(child: CupertinoActivityIndicator());
                    }
                    // 4. Se o Future terminou com um erro...
                    else if (snapshot.hasError) {
                      // Mostra a mensagem de erro que veio do nosso ApiService.
                      return Center(child: Text('Erro: ${snapshot.error}'));
                    }
                    // 5. Se o Future terminou com sucesso e tem dados...
                    else if (snapshot.hasData) {
                      final articles = snapshot.data!;

                      // Se a lista de artigos estiver vazia...
                      if (articles.isEmpty) {
                        return const Center(
                          child: Text('Nenhum artigo encontrado.'),
                        );
                      }

                      // Se temos artigos, construímos a lista!
                      return ListView.builder(
                        itemCount: articles.length,
                        itemBuilder: (context, index) {
                          final article = articles[index];

                          // TODO: Substituir este ListTile pelo nosso widget ArticleCard personalizado.
                          return CupertinoListTile(
                            title: Text(
                              article.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(article.source.name),
                          );
                        },
                      );
                    }

                    // Estado padrão (não deve acontecer com um Future, mas é bom ter).
                    return const Center(child: Text('Algo correu mal.'));
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
