import 'dart:async';
import 'dart:convert';
import 'dart:io'; // Necessário para a exceção de SocketException
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../models/article.dart';

/// ApiService é responsável por toda a comunicação com a API do backend Phato.
class ApiService {
  final String _baseUrl =
      dotenv.env['API_BASE_URL'] ?? 'http://api.padrao.falhou.com';

  /// Busca a lista de artigos reais da API do backend.
  ///
  /// Retorna uma Future<List<Article>> em caso de sucesso.
  /// Lança uma Exception com uma mensagem amigável em caso de erro.
  Future<List<Article>> fetchArticles() async {
    // Construímos a URL final para o endpoint que queremos aceder.
    final url = Uri.parse('$_baseUrl/api/articles');

    try {
      // Realizamos a chamada GET. Usamos .timeout() para evitar que a app
      // fique "presa" indefinidamente se a rede estiver muito lenta.
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      // Verificamos o código de status da resposta. 200 significa "OK".
      if (response.statusCode == 200) {
        // Decodificamos o corpo da resposta, que é uma String JSON, para um Mapa Dart.
        final Map<String, dynamic> jsonResponse = json.decode(response.body);

        // Acedemos à lista de artigos dentro da chave "data".
        final List<dynamic> articlesJson = jsonResponse['data'];

        // Mapeamos cada item da lista JSON para um objeto Article usando o nosso
        // construtor .fromJson e retornamos a lista final.
        return articlesJson.map((json) => Article.fromJson(json)).toList();
      } else {
        // Se o servidor respondeu, mas com um erro (404, 500, etc.),
        // lançamos uma exceção clara.
        throw Exception(
          'Falha ao carregar os artigos. Status: ${response.statusCode}',
        );
      }
    } on SocketException {
      // Este erro é específico para quando não há conexão com a internet
      // ou o servidor não é encontrado (DNS).
      throw Exception('Falha na conexão. Por favor, verifique a sua internet.');
    } on TimeoutException {
      // Este erro acontece se o servidor demorar mais de 10 segundos a responder.
      throw Exception(
        'O servidor demorou muito para responder. Tente novamente mais tarde.',
      );
    } catch (e) {
      // Uma captura genérica para qualquer outro erro inesperado.
      throw Exception('Ocorreu um erro inesperado: $e');
    }
  }
}
