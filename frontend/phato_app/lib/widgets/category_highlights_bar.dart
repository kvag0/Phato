import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

class CategoryHighlightsBar extends StatelessWidget {
  const CategoryHighlightsBar({super.key});

  // Lista de categorias estática para fins de layout.
  final List<String> _highlightTitles = const [
    'Economia',
    'Política',
    'Meio Amb.',
    'Tecnologia',
    'Esportes',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 110,
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _highlightTitles.length + 1, // +1 para o botão "Adicionar"
        padding: const EdgeInsets.only(left: 16.0),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildAddItem();
          }
          final title = _highlightTitles[index - 1];
          // A borda está aqui apenas para fins visuais, sem lógica de seleção.
          return _buildHighlightItem(title, hasBorder: true);
        },
      ),
    );
  }

  Widget _buildAddItem() {
    return _buildBaseHighlight(
      title: 'Adicionar',
      child: const Icon(
        CupertinoIcons.add,
        color: AppTheme.phatoTextGray,
        size: 32,
      ),
      onTap: () {
        /* Sem ação por agora */
      },
    );
  }

  Widget _buildHighlightItem(String title, {bool hasBorder = false}) {
    return _buildBaseHighlight(
      title: title,
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: hasBorder
              ? Border.all(color: AppTheme.phatoYellow, width: 2.5)
              : null,
        ),
      ),
      onTap: () {
        /* Sem ação por agora */
      },
    );
  }

  Widget _buildBaseHighlight({
    required String title,
    required Widget child,
    required VoidCallback onTap,
  }) {
    const double circleSize = 70.0;
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      onPressed: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(width: circleSize, height: circleSize, child: child),
          const SizedBox(height: 6),
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
