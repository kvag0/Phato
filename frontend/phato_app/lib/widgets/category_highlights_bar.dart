import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

// Uma pequena classe para modelar os nossos dados de highlight.
// Isto torna o nosso código mais limpo do que usar Mapas genéricos.
class CategoryHighlight {
  final String title;
  final bool isSelected;

  const CategoryHighlight({required this.title, this.isSelected = false});
}

class CategoryHighlightsBar extends StatelessWidget {
  const CategoryHighlightsBar({super.key});

  // --- DADOS MOCKADOS (FAKE) ---
  // No futuro, estes dados virão de uma fonte real (API ou base de dados local).
  // TODO: Substituir pela lógica de busca de categorias do utilizador.
  final List<CategoryHighlight> _highlights = const [
    CategoryHighlight(title: 'Economia', isSelected: true),
    CategoryHighlight(title: 'Política',isSelected: true),
    CategoryHighlight(title: 'Meio Amb.', isSelected: true),
    CategoryHighlight(title: 'Tecnologia', isSelected: true),
    CategoryHighlight(title: 'Esportes', isSelected: true),
    CategoryHighlight(title: 'Cultura', isSelected: true),
    CategoryHighlight(title: 'Ciência', isSelected: true),
  ];

  @override
  Widget build(BuildContext context) {
    // Usamos um Container para definir uma altura fixa para a barra de highlights.
    return Container(
      height: 110, // Altura total (círculo + texto + espaçamento).
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: ListView.builder(
        // Isto torna a nossa lista horizontal.
        scrollDirection: Axis.horizontal,
        // O número de itens é a nossa lista de categorias + 1 (para o botão "Adicionar").
        itemCount: _highlights.length + 1,
        // Adiciona um espaçamento no início da lista.
        padding: const EdgeInsets.only(left: 16.0),
        itemBuilder: (context, index) {
          // --- LÓGICA CONDICIONAL PARA CONSTRUIR CADA ITEM ---

          // Se for o primeiro item (index 0), construímos o botão "Adicionar".
          if (index == 0) {
            return _buildAddItem();
          }

          // Para os outros itens, pegamos a categoria da nossa lista.
          // Subtraímos 1 do index porque a nossa lista de dados não tem o item "Adicionar".
          final highlight = _highlights[index - 1];
          return _buildHighlightItem(highlight);
        },
      ),
    );
  }

  // Método auxiliar para construir o botão "Adicionar".
  Widget _buildAddItem() {
    return _buildBaseHighlight(
      title: 'Adicionar',
      // A CORREÇÃO É AQUI:
      child: const Icon(CupertinoIcons.add, color: AppTheme.phatoTextGray, size: 32),
      onTap: () {
        // TODO: Implementar lógica para abrir a tela de adicionar/editar categorias.
      },
    );
  }

  // Método auxiliar para construir um item de categoria normal.
  Widget _buildHighlightItem(CategoryHighlight highlight) {
    return _buildBaseHighlight(
      title: highlight.title,
      // O círculo da categoria, com borda se estiver selecionado.
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          // Lógica para adicionar a borda dourada se `isSelected` for true.
          border: highlight.isSelected
              ? Border.all(color: AppTheme.phatoYellow, width: 2.5)
              : null,
        ),
      ),
      onTap: () {
        // TODO: Implementar lógica para selecionar/desselecionar e filtrar o feed.
      },
    );
  }
  
  // Widget base para evitar repetição de código.
  Widget _buildBaseHighlight({required String title, required Widget child, required VoidCallback onTap}) {
    const double circleSize = 70.0;
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      onPressed: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // O círculo (seja com o ícone '+' ou apenas a borda).
          SizedBox(
            width: circleSize,
            height: circleSize,
            child: child,
          ),
          
          // --- A CORREÇÃO É AQUI ---
          // Reduzimos o espaçamento para evitar o overflow.
          const SizedBox(height: 6), 

          // O texto do título.
          Text(
            title,
            style: AppTheme.secondaryTextStyle.copyWith(fontSize: 14),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}