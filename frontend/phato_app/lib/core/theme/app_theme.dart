import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

/// Classe central para todos os estilos e temas da aplicação Phato,
/// baseada no guia de estilos oficial.
class AppTheme {
  // --- PALETA DE CORES OFICIAL ---
  static const Color phatoYellow = Color(0xFFffbc59);
  static const Color phatoRed = Color(0xFFdc2727);
  static const Color phatoBlack = Color(0xFF0d0d0d);
  static const Color phatoCardGray = Color(0xFF3d3d3d);
  static const Color phatoTextGray = Color(0xFFE0E0E0);
  static const Color unselectedPillColor = phatoCardGray;


  // --- ESTILOS DE TEXTO COM GOOGLE FONTS ---

  /// Estilo para títulos e cabeçalhos principais (ex: Logo, Títulos de página).
  static final TextStyle headlineStyle = GoogleFonts.leagueSpartan(
    color: phatoTextGray,
    fontWeight: FontWeight.bold,
    fontSize: 28,
  );

  /// Estilo para o corpo do texto e textos gerais.
  static final TextStyle bodyTextStyle = GoogleFonts.quicksand(
    color: phatoTextGray,
    fontSize: 16,
  );
  
  /// Estilo específico para o logo, para fácil acesso.
  static final TextStyle logoStyle = GoogleFonts.leagueSpartan(
    color: phatoYellow,
    fontWeight: FontWeight.bold,
    fontSize: 22,
  );
  
  /// Estilo específico para a saudação.
  static final TextStyle greetingStyle = GoogleFonts.leagueSpartan(
    color: phatoYellow,
    fontSize: 28,
    fontWeight: FontWeight.bold,
  );
  
  /// Estilo específico para textos secundários, como a localização.
  static final TextStyle secondaryTextStyle = GoogleFonts.quicksand(
    color: phatoTextGray.withOpacity(0.8),
    fontSize: 16,
  );


  // --- TEMA GERAL DA APLICAÇÃO (CUPERTINO) ---
  static final CupertinoThemeData mainTheme = CupertinoThemeData(
    brightness: Brightness.dark,
    primaryColor: phatoYellow,
    scaffoldBackgroundColor: phatoBlack,
    barBackgroundColor: phatoBlack,
    textTheme: CupertinoTextThemeData(
      // Estilo de texto padrão para qualquer Text() que não tenha um estilo explícito.
      textStyle: bodyTextStyle,
      // Estilo padrão para os títulos na barra de navegação.
      navTitleTextStyle: logoStyle,
      // Estilo para links ou botões de texto.
      actionTextStyle: bodyTextStyle.copyWith(color: phatoYellow),
    ),
  );
}