import 'package:flutter/cupertino.dart';
import 'feed_tab_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoTabScaffold(
      tabBuilder: (BuildContext context, int index) {
        switch (index) {
          case 0: // Aba "Feed"
            return CupertinoTabView(builder: (context) {
              // CORREÇÃO: FeedTabPage NÃO é const.
              return FeedTabPage();
            });
          case 1: // Aba "PhatoBot"
            return CupertinoTabView(builder: (context) {
              return const CupertinoPageScaffold(
                child: Center(child: Text('Tela do PhatoBot')),
              );
            });
          case 2: // Aba "Finanças"
            return CupertinoTabView(builder: (context) {
              return const CupertinoPageScaffold(
                child: Center(child: Text('Tela de Finanças')),
              );
            });
          default:
             return CupertinoTabView(builder: (context) {
              // CORREÇÃO: FeedTabPage NÃO é const.
              return FeedTabPage();
            });
        }
      },
      tabBar: CupertinoTabBar(
        activeColor: const Color(0xFFffbc59), // Temporário, usaremos o tema depois
        inactiveColor: CupertinoColors.systemGrey,
        backgroundColor: const Color(0xFF0d0d0d).withOpacity(0.95),
        border: null,
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.home),
            label: 'Feed',
          ),
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.square_grid_2x2),
            label: 'PhatoBot',
          ),
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.chart_bar_alt_fill),
            label: 'Finanças',
          ),
        ],
      ),
    );
  }
}