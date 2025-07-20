import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart'; // Importa o tema.


/// O cabeçalho principal e personalizado da aplicação.
/// É um widget stateless, pois apenas exibe informações e delega as ações
/// para callbacks (funções que serão passadas para ele no futuro).
class CustomAppHeader extends StatelessWidget implements ObstructingPreferredSizeWidget {
  const CustomAppHeader({super.key});

@override
  Widget build(BuildContext context) {
    return CupertinoNavigationBar(
      // CORRIGIDO: Usando o nome correto da cor de fundo.
      backgroundColor: AppTheme.phatoBlack,
      border: null,
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 8.0),
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              // TODO: Implementar navegação para a página de Perfil.
            },
            child: const Icon(CupertinoIcons.profile_circled, color: CupertinoColors.systemGrey),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              // TODO: Implementar navegação para a página de Notificações.
            },
            child: const Icon(CupertinoIcons.bell, color: CupertinoColors.systemGrey),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              // TODO: Implementar navegação para a página de Busca.
            },
            child: const Icon(CupertinoIcons.search, color: CupertinoColors.systemGrey),
          ),
        ],
      ),

      // Item central, o nosso logo.
      middle: Text(
        'Phato',
        style: AppTheme.logoStyle,
      ),
      // Item à direita da barra de navegação.
      trailing: CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () {
          // TODO: Implementar a funcionalidade futura (ex: Pato Feature).
        },
        // Como não há um ícone de pato no CupertinoIcons, usamos um emoji como fallback.
        child: const Text('🦆', style: TextStyle(fontSize: 28)),
      ),
    );
  }

  // Estes dois métodos são necessários para implementar ObstructingPreferredSizeWidget,
  // que garante que nosso cabeçalho se comporte corretamente com o layout do Cupertino.
  @override
  Size get preferredSize => const Size.fromHeight(44.0); // Altura padrão da nav bar do iOS.

  @override
  bool shouldFullyObstruct(BuildContext context) {
    return true;
  }
}