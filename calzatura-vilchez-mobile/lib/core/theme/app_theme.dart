import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Paleta principal — igual que la web
  static const gold = Color(0xFFC9A227);
  static const goldDark = Color(0xFFA88920);
  static const goldLight = Color(0xFFD4B44A);
  static const black = Color(0xFF0D0D0D);
  static const beige = Color(0xFFF8F7F4);
  static const beigeCard = Color(0xFFFFFFFF);

  // Aliases semánticos
  static const primary = black;
  static const accent = gold;
  static const background = beige;
  static const cardLight = beigeCard;
  static const surface = Color(0xFF1A1A1A);

  static const textPrimary = Color(0xFF1A1A1A);
  static const textSecondary = Color(0xFF777777);
  static const textLight = Color(0xFFFFFFFF);

  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);

  static const shimmerBase = Color(0xFFE8E6E1);
  static const shimmerHighlight = Color(0xFFF5F3EE);

  // Compatibilidad con refs legacy
  static const secondary = surface;
  static const accentLight = goldLight;
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.gold,
        primary: AppColors.black,
        secondary: AppColors.gold,
        surface: AppColors.beigeCard,
        error: AppColors.error,
      ),
      scaffoldBackgroundColor: AppColors.beige,
      textTheme: GoogleFonts.poppinsTextTheme(base.textTheme),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.black,
        foregroundColor: AppColors.textLight,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.poppins(
          color: AppColors.textLight,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.black,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E0D8)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E0D8)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.gold, width: 2),
        ),
        labelStyle: GoogleFonts.poppins(color: AppColors.textSecondary),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: AppColors.beigeCard,
        surfaceTintColor: Colors.transparent,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.gold,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
