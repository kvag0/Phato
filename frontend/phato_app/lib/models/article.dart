/// Este arquivo contém os modelos de dados para o projeto Phato.
/// A estrutura reflete o esquema definido no back-end (models/Article.js).

// ignore: unused_import
import 'package:flutter/foundation.dart';

/// Representa a estrutura principal de um artigo de notícia.
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

  /// Factory constructor para criar uma instância de Article a partir de um JSON.
  factory Article.fromJson(Map<String, dynamic> json) {
    return Article(
      id: json['_id'], // MongoDB usa _id
      title: json['title'],
      url: json['url'],
      source: Source.fromJson(json['source']),
      author: json['author'],
      publishedAt: DateTime.parse(json['publishedAt']),
      category: json['category'],
      content: json['content'],
      description: json['description'],
      imageUrl: json['imageUrl'],
      analysis: json['analysis'] != null
          ? Analysis.fromJson(json['analysis'])
          : null,
      fetchedAt: DateTime.parse(json['fetchedAt']),
      tags: List<String>.from(json['tags']),
      language: json['language'],
      createdAt: DateTime.parse(
        json['createdAt'],
      ), // Mongoose adiciona 'createdAt'
      updatedAt: DateTime.parse(
        json['updatedAt'],
      ), // Mongoose adiciona 'updatedAt'
    );
  }
}

/// Representa a fonte da notícia.
class Source {
  final String? id;
  final String name;
  final String? url;

  Source({this.id, required this.name, this.url});

  factory Source.fromJson(Map<String, dynamic> json) {
    return Source(id: json['id'], name: json['name'], url: json['url']);
  }
}

/// Contém os resultados da análise de IA.
class Analysis {
  final Facts facts;
  final List<Narrative> narratives;
  final DateTime analyzedAt;
  final String geminiVersion;

  Analysis({
    required this.facts,
    required this.narratives,
    required this.analyzedAt,
    required this.geminiVersion,
  });

  factory Analysis.fromJson(Map<String, dynamic> json) {
    var narrativeList = json['narratives'] as List;
    List<Narrative> narratives = narrativeList
        .map((i) => Narrative.fromJson(i))
        .toList();

    return Analysis(
      facts: Facts.fromJson(json['facts']),
      narratives: narratives,
      analyzedAt: DateTime.parse(json['analyzedAt']),
      geminiVersion: json['geminiVersion'],
    );
  }
}

/// Contém os fatos extraídos da notícia.
class Facts {
  final List<String> who;
  final String what;
  final String when;
  final List<String> where;
  final String why;
  final String summary;

  Facts({
    required this.who,
    required this.what,
    required this.when,
    required this.where,
    required this.why,
    required this.summary,
  });

  factory Facts.fromJson(Map<String, dynamic> json) {
    return Facts(
      who: List<String>.from(json['who']),
      what: json['what'],
      when: json['when'],
      where: List<String>.from(json['where']),
      why: json['why'],
      summary: json['summary'],
    );
  }
}

/// Representa uma narrativa ou perspectiva identificada na notícia.
class Narrative {
  final String perspective;
  final String title;
  final String summary;
  final List<String> emphasis;
  final String interpretation;

  Narrative({
    required this.perspective,
    required this.title,
    required this.summary,
    required this.emphasis,
    required this.interpretation,
  });

  factory Narrative.fromJson(Map<String, dynamic> json) {
    return Narrative(
      perspective: json['perspective'],
      title: json['title'],
      summary: json['summary'],
      emphasis: List<String>.from(json['emphasis']),
      interpretation: json['interpretation'],
    );
  }
}
