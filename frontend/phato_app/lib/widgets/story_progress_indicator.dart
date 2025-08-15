import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Exibe uma série de barras de progresso para a visualização de stories.
class StoryProgressIndicator extends StatelessWidget {
  final int storyCount;
  final int currentStoryIndex;
  // No futuro, esta variável controlará a animação da barra atual.
  final double progress;

  const StoryProgressIndicator({
    super.key,
    required this.storyCount,
    required this.currentStoryIndex,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(storyCount, (index) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2.0),
            child: LinearProgressIndicator(
              // Lógica para determinar o preenchimento da barra.
              // Barras passadas ficam 100% cheias.
              // A barra atual usa o valor de 'progress'.
              // Barras futuras ficam 0% cheias.
              value: index < currentStoryIndex
                  ? 1.0
                  : index == currentStoryIndex
                  ? progress
                  : 0.0,
              backgroundColor: CupertinoColors.white.withOpacity(0.5),
              valueColor: const AlwaysStoppedAnimation<Color>(
                CupertinoColors.white,
              ),
              minHeight: 2.5,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }
}
