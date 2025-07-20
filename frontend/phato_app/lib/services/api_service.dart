import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../models/article.dart';

/// ApiService é responsável por toda a comunicação com a API do backend Phato.
class ApiService {
  // A URL base da API é carregada de forma segura a partir das variáveis de ambiente.
  final String _baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://api.padrao.falhou.com';

  /// Busca uma lista de artigos da API.
  ///
  /// Por enquanto, este método SIMULA a chamada de rede para permitir o
  /// desenvolvimento do frontend em paralelo com o backend.
  Future<List<Article>> fetchArticles() async {
    // --- SIMULAÇÃO (USAR ENQUANTO O BACKEND NÃO ESTÁ PRONTO) ---

    // Simula um atraso de rede de 2 segundos.
    await Future.delayed(const Duration(seconds: 2));

    // Dados JSON falsos que imitam a resposta real da API.
    // A estrutura DEVE ser idêntica à do modelo Article.
    const String mockApiResponse = '''
      [
        {
          "_id": "60d5ecb4b3f8a5a4c4a3b3e2",
          "title": "Flutter 3.10 Lançado com Melhorias de Performance",
          "url": "https://news.flutter.dev/2025/07/20/flutter-3-10-released",
          "source": {
            "id": "flutter-dev-blog",
            "name": "Flutter Official Blog",
            "url": "https://news.flutter.dev"
          },
          "author": "Equipe Flutter",
          "publishedAt": "2025-07-20T10:00:00.000Z",
          "category": "Tecnologia",
          "content": "A nova versão do Flutter traz otimizações significativas no motor gráfico Impeller...",
          "description": "Descubra as novidades do Flutter 3.10, focado em performance e estabilidade.",
          "imageUrl": "https://flutter.dev/images/flutter-logo-sharing.png",
          "analysis": null,
          "fetchedAt": "2025-07-20T12:00:00.000Z",
          "tags": ["flutter", "mobile", "release"],
          "language": "pt-br",
          "createdAt": "2025-07-20T12:00:00.000Z",
          "updatedAt": "2025-07-20T12:00:00.000Z"
        },
        {
          "_id": "60d5ecb4b3f8a5a4c4a3b3e3",
          "title": "Inteligência Artificial Transforma a Indústria Criativa",
          "url": "https://tech.example.com/ai-creative-industry",
          "source": {
            "id": "tech-example",
            "name": "Tech Example News"
          },
          "author": "Jane Doe",
          "publishedAt": "2025-07-19T14:30:00.000Z",
          "category": "IA",
          "content": "Modelos de IA generativa estão a revolucionar a forma como criamos arte, música e texto...",
          "description": "Uma análise profunda sobre o impacto da IA nos setores criativos.",
          "imageUrl": "https://tech.example.com/images/ai-creative.png",
          "analysis": null,
          "fetchedAt": "2025-07-20T12:01:00.000Z",
          "tags": ["ia", "ai", "generative-ai"],
          "language": "pt-br",
          "createdAt": "2025-07-20T12:01:00.000Z",
          "updatedAt": "2025-07-20T12:01:00.000Z"
        }
      ]
    ''';

    final List<dynamic> jsonResponse = json.decode(mockApiResponse);
    return jsonResponse.map((json) => Article.fromJson(json)).toList();


    // --- CÓDIGO REAL (USAR QUANDO O BACKEND ESTIVER PRONTO) ---
    /*
    try {
      final url = Uri.parse('$_baseUrl/articles');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final List<dynamic> jsonResponse = json.decode(response.body);
        return jsonResponse.map((json) => Article.fromJson(json)).toList();
      } else {
        // Lidar com erros da API (ex: 404, 500)
        throw Exception('Falha ao carregar os artigos. Código: ${response.statusCode}');
      }
    } catch (e) {
      // Lidar com erros de conexão (sem internet, DNS, etc.)
      throw Exception('Erro de conexão: $e');
    }
    */
  }

  // Futuramente, outros métodos podem ser adicionados aqui:
  // Future<Article> fetchArticleById(String id) async { ... }
  // Future<bool> postComment(String articleId, String comment) async { ... }
}