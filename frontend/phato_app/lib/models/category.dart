/// Representa uma única categoria de notícia retornada pela API.
class Category {
  final String id;
  final String name;
  final int articleCount;

  Category({required this.id, required this.name, required this.articleCount});

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String? ?? 'unknown',
      name: json['name'] as String? ?? 'Categoria Desconhecida',
      articleCount: json['articleCount'] as int? ?? 0,
    );
  }
}
