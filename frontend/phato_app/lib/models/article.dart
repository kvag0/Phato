import 'package:flutter/foundation.dart';

// Função auxiliar para fazer o parse de datas de forma segura.
DateTime _safeParseDateTime(dynamic input, {String debugLabel = ''}) {
  if (input == null) {
    if (kDebugMode) {
      print(
        '[DEBUG] safeParseDateTime: Input para "$debugLabel" é nulo. A usar data atual.',
      );
    }
    return DateTime.now();
  }
  if (input is String) {
    try {
      return DateTime.parse(input);
    } catch (e) {
      if (kDebugMode) {
        print(
          '[DEBUG] safeParseDateTime: Falha ao fazer parse da string de data "$input" para "$debugLabel". A usar data atual. Erro: $e',
        );
      }
      return DateTime.now();
    }
  }
  if (kDebugMode) {
    print(
      '[DEBUG] safeParseDateTime: Tipo de input inesperado para "$debugLabel": ${input.runtimeType}. A usar data atual.',
    );
  }
  return DateTime.now();
}

class Article {
  final String id;
  final String title;
  final String url;
  final Source source;
  final String? author;
  final DateTime publishedAt;
  final String category;
  final String? content;
  final String? description;
  final String? imageUrl;
  final Analysis? analysis;
  final DateTime fetchedAt;
  final List<String> tags;
  final String? language;
  final DateTime createdAt;
  final DateTime updatedAt;

  Article({
    required this.id,
    required this.title,
    required this.url,
    required this.source,
    this.author,
    required this.publishedAt,
    required this.category,
    this.content,
    this.description,
    this.imageUrl,
    this.analysis,
    required this.fetchedAt,
    required this.tags,
    this.language,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Article.fromJson(Map<String, dynamic> json) {
    return Article(
      id: json['_id'] as String? ?? 'id_indisponivel',
      title: json['title'] as String? ?? 'Título indisponível',
      url: json['url'] as String? ?? '',
      source: json['source'] != null
          ? Source.fromJson(json['source'])
          : Source(
              name: 'Fonte Desconhecida',
            ), // Valor padrão para o objeto Source
      author: json['author'] as String?,
      publishedAt: _safeParseDateTime(
        json['publishedAt'],
        debugLabel: 'publishedAt',
      ),
      category: json['category'] as String? ?? 'Geral',
      content: json['content'] as String?,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      analysis:
          json['analysis'] != null && json['analysis'] is Map<String, dynamic>
          ? Analysis.fromJson(json['analysis'])
          : null,
      fetchedAt: _safeParseDateTime(json['fetchedAt'], debugLabel: 'fetchedAt'),
      tags: json['tags'] != null ? List<String>.from(json['tags']) : [],
      language: json['language'] as String?,
      createdAt: _safeParseDateTime(json['createdAt'], debugLabel: 'createdAt'),
      updatedAt: _safeParseDateTime(json['updatedAt'], debugLabel: 'updatedAt'),
    );
  }
}

class Source {
  final String? id;
  final String name;
  final String? url;

  Source({this.id, required this.name, this.url});

  factory Source.fromJson(Map<String, dynamic> json) {
    return Source(
      id: json['id'] as String?,
      name: json['name'] as String? ?? 'Fonte Desconhecida',
      url: json['url'] as String?,
    );
  }
}
// --- O resto das classes (Analysis, Facts, Narrative) pode ser colado aqui ---
// Se o erro persistir, precisaremos de aplicar a mesma lógica defensiva a elas.
// Por agora, vamos focar-nos no Article e Source, que são as causas mais prováveis.

class Analysis {
  final Facts? facts;
  final List<Narrative> narratives;
  final DateTime? analyzedAt;
  final String? geminiVersion;

  Analysis({
    this.facts,
    required this.narratives,
    this.analyzedAt,
    this.geminiVersion,
  });

  factory Analysis.fromJson(Map<String, dynamic> json) {
    return Analysis(
      facts: json['facts'] != null ? Facts.fromJson(json['facts']) : null,
      narratives: json['narratives'] != null
          ? List<Narrative>.from(
              json['narratives'].map((x) => Narrative.fromJson(x)),
            )
          : [],
      analyzedAt: _safeParseDateTime(
        json['analyzedAt'],
        debugLabel: 'analyzedAt',
      ),
      geminiVersion: json['geminiVersion'] as String?,
    );
  }
}

class Facts {
  final List<String> who;
  final String? what;
  final String? when;
  final List<String> where;
  final String? why;
  final String? summary;

  Facts({
    required this.who,
    this.what,
    this.when,
    required this.where,
    this.why,
    this.summary,
  });

  factory Facts.fromJson(Map<String, dynamic> json) {
    return Facts(
      who: json['who'] != null ? List<String>.from(json['who']) : [],
      what: json['what'] as String?,
      when: json['when'] as String?,
      where: json['where'] != null ? List<String>.from(json['where']) : [],
      why: json['why'] as String?,
      summary: json['summary'] as String?,
    );
  }
}

class Narrative {
  final String? perspective;
  final String? title;
  final String? summary;
  final List<String> emphasis;
  final String? interpretation;

  Narrative({
    this.perspective,
    this.title,
    this.summary,
    required this.emphasis,
    this.interpretation,
  });

  factory Narrative.fromJson(Map<String, dynamic> json) {
    return Narrative(
      perspective: json['perspective'] as String?,
      title: json['title'] as String?,
      summary: json['summary'] as String?,
      emphasis: json['emphasis'] != null
          ? List<String>.from(json['emphasis'])
          : [],
      interpretation: json['interpretation'] as String?,
    );
  }
}
