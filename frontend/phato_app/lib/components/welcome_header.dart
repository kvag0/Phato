import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

/// Um widget que exibe uma saudação de boas-vindas e a localização do utilizador.
class WelcomeHeader extends StatelessWidget {
  // CORREÇÃO: O construtor NÃO é const, porque o widget depende de DateTime.now().
  WelcomeHeader({super.key});

  // Função auxiliar para obter a saudação correta baseada na hora do dia.
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Bom dia';
    } else if (hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${_getGreeting()}, Caio!', style: AppTheme.greetingStyle),
          const SizedBox(height: 0),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {},
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  CupertinoIcons.location_solid,
                  color: AppTheme.phatoTextGray,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  'São José dos Campos, SP',
                  style: AppTheme.secondaryTextStyle,
                ),
                const SizedBox(width: 4),
                Icon(
                  CupertinoIcons.chevron_down,
                  color: AppTheme.phatoTextGray,
                  size: 16,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
