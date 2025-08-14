import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';

class FeedFilterToggle extends StatelessWidget {
  const FeedFilterToggle({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: No futuro, este widget será stateful para controlar a seleção.
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CupertinoButton(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          onPressed: () {},
          child: Text(
            'Para Você',
            style: AppTheme.bodyTextStyle.copyWith(color: AppTheme.phatoYellow),
          ),
        ),

        Text('|', style: AppTheme.secondaryTextStyle),

        CupertinoButton(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          onPressed: () {},
          // A CORREÇÃO É AQUI: Remova o 'const'.
          child: Text('Seu Local', style: AppTheme.secondaryTextStyle),
        ),
      ],
    );
  }
}
