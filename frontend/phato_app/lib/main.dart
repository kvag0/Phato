import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

// Importamos os nossos modelos e serviços que criámos nos passos anteriores.
import 'models/article.dart';
import 'services/api_service.dart';

// Ponto de entrada da aplicação.
Future<void> main() async {
  // Garante que os widgets do Flutter estão prontos antes de carregar o .env.
  WidgetsFlutterBinding.ensureInitialized();
  // Carrega as variáveis de ambiente do ficheiro .env.
  await dotenv.load(fileName: ".env");
  runApp(const PhatoApp());
}

class PhatoApp extends StatelessWidget {
  const PhatoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Phato App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      // A nossa tela inicial agora é a HomePage.
      home: const HomePage(),
      debugShowCheckedModeBanner: false, // Remove a faixa de "Debug"
    );
  }
}

// HomePage é a nossa tela principal.
// Usamos um StatefulWidget porque o conteúdo da tela vai mudar (estado).
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Instância do nosso ApiService para fazer as chamadas de rede.
  final ApiService _apiService = ApiService();

  // Variáveis de estado para controlar a UI.
  bool _isLoading = false; // Controla se o indicador de carregamento é exibido.
  List<Article> _articles = []; // Armazena a lista de artigos recebidos da API.
  String? _error; // Armazena uma mensagem de erro, se houver.

  // Método para buscar os artigos.
  Future<void> _fetchArticles() async {
    // 1. Atualiza o estado para mostrar o indicador de carregamento.
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // 2. Chama o método do nosso serviço.
      final articles = await _apiService.fetchArticles();
      // 3. Se a chamada for bem-sucedida, atualiza o estado com os novos artigos.
      setState(() {
        _isLoading = false;
        _articles = articles;
      });
    } catch (e) {
      // 4. Se ocorrer um erro, atualiza o estado com a mensagem de erro.
      setState(() {
        _isLoading = false;
        _error = 'Ocorreu um erro ao buscar as notícias: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phato - Notícias'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      // O corpo da tela muda dependendo do estado.
      body: Center(
        child: _buildBody(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _fetchArticles, // O botão chama o nosso método.
        tooltip: 'Carregar Notícias',
        child: const Icon(Icons.refresh),
      ),
    );
  }

  // Widget auxiliar para construir o corpo da tela de forma organizada.
  Widget _buildBody() {
    if (_isLoading) {
      // Se está a carregar, mostra um indicador de progresso.
      return const CircularProgressIndicator();
    } else if (_error != null) {
      // Se há um erro, mostra a mensagem de erro.
      return Text(
        _error!,
        style: const TextStyle(color: Colors.red, fontSize: 16),
        textAlign: TextAlign.center,
      );
    } else if (_articles.isEmpty) {
      // Se não há artigos, mostra uma mensagem inicial.
      return const Text('Pressione o botão para carregar as notícias.');
    } else {
      // Se temos artigos, mostra a lista.
      return ListView.builder(
        itemCount: _articles.length,
        itemBuilder: (context, index) {
          final article = _articles[index];
          return ListTile(
            title: Text(article.title),
            subtitle: Text(article.source.name),
            onTap: () {
              // Ação futura: navegar para a tela de detalhes do artigo.
            },
          );
        },
      );
    }
  }
}