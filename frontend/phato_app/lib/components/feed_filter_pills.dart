import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

class FeedFilterPills extends StatelessWidget {
  const FeedFilterPills({super.key});

  @override
  Widget build(BuildContext context) {
    // Padding para dar um espaçamento geral à nossa linha de filtros.
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Row(
        children: [
          Expanded(
            child: _buildPillButton(text: 'Para Você', isSelected: true),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildPillButton(text: 'Sua Região', isSelected: false),
          ),
          const SizedBox(width: 12),
          _buildFilterButton(),
        ],
      ),
    );
  }

  /// Constrói um dos botões em formato de pílula ("Para Você", "Sua Região").
  Widget _buildPillButton({required String text, required bool isSelected}) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () {
        // TODO: Implementar a lógica de mudança de filtro.
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.phatoYellow : AppTheme.unselectedPillColor,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isSelected ? AppTheme.phatoBlack : AppTheme.phatoTextGray,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  /// Constrói o botão circular de filtro à direita.
  Widget _buildFilterButton() {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () {
        // TODO: Chamar o modal sheet de filtros que discutimos.
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: const BoxDecoration(
          color: AppTheme.unselectedPillColor,
          shape: BoxShape.circle,
        ),
        child: const Icon(
          CupertinoIcons.slider_horizontal_3, // Ícone de "filtros/controlos".
          color: AppTheme.phatoTextGray,
        ),
      ),
    );
  }
}