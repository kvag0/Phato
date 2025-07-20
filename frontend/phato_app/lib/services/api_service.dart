import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../models/article.dart';

/// ApiService é responsável por toda a comunicação com a API do backend Phato.
class ApiService {
  // A URL base da API é carregada de forma segura a partir das variáveis de ambiente.
  final String _baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://api.padrao.falhou.com';

  /// Busca uma lista de artigos da API.
  Future<List<Article>> fetchArticles() async {
    try {
    // O _baseUrl agora vai usar a URL real do servidor do Rafael!
    final url = Uri.parse('$_baseUrl/api/articles'); // Adicionamos o caminho do endpoint
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
  }
}

  // Futuramente, outros métodos podem ser adicionados aqui:
  // Future<Article> fetchArticleById(String id) async { ... }
  // Future<bool> postComment(String articleId, String comment) async { ... }
