import 'package:flutter/cupertino.dart';
import '../components/custom_app_header.dart';
import '../components/feed_filter_pills.dart';
import '../components/welcome_header.dart';
import '../widgets/category_highlights_bar.dart';

class FeedTabPage extends StatelessWidget {
  const FeedTabPage({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CustomAppHeader(),
      child: SafeArea(
        child: Container(
          color: CupertinoTheme.of(context).scaffoldBackgroundColor,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              WelcomeHeader(), 
              const CategoryHighlightsBar(),
              const FeedFilterPills(),
              const Expanded(
                child: Center(
                  child: Text('A lista de notícias aparecerá aqui.'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}