import 'dart:async';
import 'dart:convert';
import 'dart:io'; // Necessário para a exceção de SocketException
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/category.dart';
import '../models/article.dart';

/// ApiService é responsável por toda a comunicação com a API do backend Phato.
class ApiService {
  final String _baseUrl =
      dotenv.env['API_BASE_URL'] ?? 'http://api.padrao.falhou.com';

  /// Busca a lista de artigos reais da API do backend.
  ///
  /// Retorna uma Future<List<Article>> em caso de sucesso.
  /// Lança uma Exception com uma mensagem amigável em caso de erro.
  Future<List<Article>> fetchArticles({String category = 'world'}) async {
    // Construímos a URL com o parâmetro da categoria.
    final url = Uri.parse('$_baseUrl/api/articles?category=$category');

    try {
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> articlesJson = jsonResponse['data'];
        return articlesJson.map((json) => Article.fromJson(json)).toList();
      } else {
        throw Exception(
          'Falha ao carregar os artigos. Status: ${response.statusCode}',
        );
      }
    } on SocketException {
      throw Exception('Falha na conexão. Por favor, verifique a sua internet.');
    } on TimeoutException {
      throw Exception('O servidor demorou muito para responder.');
    } catch (e) {
      throw Exception('Ocorreu um erro inesperado ao buscar artigos: $e');
    }
  }

  /// Busca a lista de categorias disponíveis da API.
  Future<List<Category>> fetchCategories() async {
    final url = Uri.parse('$_baseUrl/api/articles/categories');
    try {
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> categoriesJson = jsonResponse['data'];

        // Mapeia a lista JSON para a nossa lista de objetos Category.
        return categoriesJson.map((json) => Category.fromJson(json)).toList();
      } else {
        throw Exception(
          'Falha ao carregar as categorias. Status: ${response.statusCode}',
        );
      }
    } on SocketException {
      throw Exception('Falha na conexão. Por favor, verifique a sua internet.');
    } on TimeoutException {
      throw Exception('O servidor demorou muito para responder.');
    } catch (e) {
      throw Exception('Ocorreu um erro inesperado ao buscar categorias: $e');
    }
  }

  Future<String> getChatbotResponse({
    required String question,
    required String articleId,
  }) async {
    final url = Uri.parse('$_baseUrl/api/chatbot/ask');
    try {
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'question': question, 'articleId': articleId}),
          )
          .timeout(
            const Duration(seconds: 30),
          ); // Aumentamos o timeout para a IA

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return jsonResponse['data']['answer'] ??
            'Não foi possível obter uma resposta.';
      } else {
        throw Exception(
          'Falha ao comunicar com o PhatoBot. Status: ${response.statusCode}',
        );
      }
    } on SocketException {
      throw Exception('Falha na conexão. Por favor, verifique a sua internet.');
    } on TimeoutException {
      throw Exception('O PhatoBot demorou muito para responder.');
    } catch (e) {
      throw Exception('Ocorreu um erro inesperado: $e');
    }
  }
}
