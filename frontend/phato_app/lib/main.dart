import 'package:flutter/cupertino.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'core/theme/app_theme.dart'; // 1. Importamos o nosso ficheiro de tema.
import 'pages/home_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const PhatoApp());
}

class PhatoApp extends StatelessWidget {
  const PhatoApp({super.key});

  @override
  Widget build(BuildContext context) {
    // REMOVA O 'const' DAQUI:
    return CupertinoApp(
      title: 'Phato App',
      theme: AppTheme.mainTheme,
      home: const HomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}