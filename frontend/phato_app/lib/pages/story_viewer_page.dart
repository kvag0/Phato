import 'dart:async';
import 'package:flutter/cupertino.dart';
import '../core/theme/app_theme.dart';
import '../models/article.dart';
import '../widgets/article_story_item.dart';
import '../widgets/story_progress_indicator.dart';
import 'article_detail_page.dart';

class StoryViewerPage extends StatefulWidget {
  final List<Article> articles;
  const StoryViewerPage({super.key, required this.articles});

  @override
  State<StoryViewerPage> createState() => _StoryViewerPageState();
}

class _StoryViewerPageState extends State<StoryViewerPage>
    with TickerProviderStateMixin {
  late final PageController _pageController;
  late final AnimationController _animationController;
  int _currentIndex = 0;
  bool _showHint = true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _animationController = AnimationController(vsync: this);

    Timer(const Duration(seconds: 4), () {
      if (mounted) setState(() => _showHint = false);
    });

    _playStory();
    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _nextStory();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _playStory() {
    _animationController.stop();
    _animationController.reset();
    _animationController.duration = const Duration(seconds: 7);
    _animationController.forward();
  }

  void _nextStory() {
    if (_currentIndex < widget.articles.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeIn,
      );
    } else {
      // CORREÇÃO #1: Usamos o navegador raiz para fechar.
      Navigator.of(context, rootNavigator: true).pop();
    }
  }

  void _previousStory() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeIn,
      );
    }
  }

  void _onTap(TapDownDetails details) {
    final screenWidth = MediaQuery.of(context).size.width;
    if (details.globalPosition.dx < screenWidth / 3) {
      _previousStory();
    } else {
      _nextStory();
    }
  }

  void _handleVerticalDrag(DragEndDetails details) {
    if (details.primaryVelocity != null && details.primaryVelocity! < -500) {
      Navigator.of(context).push(
        CupertinoPageRoute(
          builder: (context) =>
              ArticleDetailPage(article: widget.articles[_currentIndex]),
        ),
      );
    }
    if (details.primaryVelocity != null && details.primaryVelocity! > 500) {
      // CORREÇÃO #2: Usamos o navegador raiz para fechar.
      Navigator.of(context, rootNavigator: true).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTap,
      onVerticalDragEnd: _handleVerticalDrag,
      child: CupertinoPageScaffold(
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.articles.length,
              onPageChanged: (index) {
                setState(() {
                  _currentIndex = index;
                  _playStory(); // Reinicia o temporizador para a nova story
                });
              },
              itemBuilder: (context, index) {
                return ArticleStoryItem(article: widget.articles[index]);
              },
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 8.0,
              left: 8.0,
              right: 8.0,
              child: AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return StoryProgressIndicator(
                    storyCount: widget.articles.length,
                    currentStoryIndex: _currentIndex,
                    progress: _animationController.value,
                  );
                },
              ),
            ),
            if (_showHint)
              Positioned(
                bottom: MediaQuery.of(context).padding.bottom + 90,
                left: 0,
                right: 0,
                child: _buildSwipeUpHint(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwipeUpHint() {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 1.0, end: 0.0),
      duration: const Duration(seconds: 4),
      builder: (context, opacity, child) {
        return Opacity(
          opacity: opacity,
          child: Column(
            children: [
              const Icon(
                CupertinoIcons.chevron_up,
                color: CupertinoColors.white,
              ),
              const SizedBox(height: 4),
              Text(
                'Saiba mais',
                style: AppTheme.secondaryTextStyle.copyWith(
                  color: CupertinoColors.white,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
