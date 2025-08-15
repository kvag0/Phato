import 'package:flutter/cupertino.dart';
import 'package:phato_app/core/theme/app_theme.dart';
import 'package:phato_app/pages/chatbot_page.dart';
import 'feed_tab_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoTabScaffold(
      tabBuilder: (BuildContext context, int index) {
        switch (index) {
          case 0: // Aba "Feed"
            return CupertinoTabView(
              builder: (context) {
                return FeedTabPage();
              },
            );
          case 1: // Aba "PhatoBot"
            return CupertinoTabView(
              builder: (context) {
                return ChatbotPage();
              },
            );
          case 2: // Aba "Finanças"
            return CupertinoTabView(
              builder: (context) {
                return const CupertinoPageScaffold(
                  child: Center(child: Text('Tela de Finanças')),
                );
              },
            );
          default:
            return CupertinoTabView(
              builder: (context) {
                return FeedTabPage();
              },
            );
        }
      },
      tabBar: CupertinoTabBar(
        // Usamos as cores do nosso tema para consistência.
        activeColor: AppTheme.phatoYellow,
        inactiveColor: AppTheme.phatoTextGray,
        backgroundColor: AppTheme.phatoBlack.withOpacity(0.95),
        border: null,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            // A CORREÇÃO ESTÁ AQUI: Envolvemos o Ícone com Padding.
            icon: Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: const Icon(CupertinoIcons.home),
            ),
          ),
          BottomNavigationBarItem(
            // A CORREÇÃO ESTÁ AQUI: Envolvemos o Ícone com Padding.
            icon: Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: const Icon(CupertinoIcons.square_grid_2x2),
            ),
          ),
          BottomNavigationBarItem(
            // A CORREÇÃO ESTÁ AQUI: Envolvemos o Ícone com Padding.
            icon: Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: const Icon(CupertinoIcons.chart_bar_alt_fill),
            ),
          ),
        ],
      ),
    );
  }
}
