import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Spacing tokens — consistent 4px grid.
class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
}

/// Border radius tokens — sharp, crisp box edges.
class AppRadius {
  AppRadius._();
  static const double sm = 4;
  static const double md = 6;
  static const double lg = 8;
  static const double full = 999;
}

/// Animation duration tokens.
class AppAnim {
  AppAnim._();
  static const Duration fast = Duration(milliseconds: 100);
  static const Duration normal = Duration(milliseconds: 200);
  static const Duration slow = Duration(milliseconds: 300);
}

/// Design tokens for both High-Contrast Light Mode and Dark Mode.
class AppColors {
  AppColors._();

  // Core Brand & Action Palette
  static const Color primeBlue = Color(0xFF0284C7);       // Crisp Action Cyan-Blue
  static const Color primeBlueDark = Color(0xFF0369A1);   // Deep Action Blue
  static const Color primeBlueLight = Color(0xFF38C5F8);  // Electric Glow Blue
  static const Color primeBlueSurface = Color(0xFFE0F2FE);// Light Cyan Surface Tint
  static const Color primeBlueBorder = Color(0xFF7DD3FC); // Crisp Blue Border

  // Badges & Gamification Gold/Amber
  static const Color primeGold = Color(0xFFD97706);       // High-contrast Trophy Amber
  static const Color primeGoldLight = Color(0xFFFFC043);  // Bright Gold Glow
  static const Color primeGoldSurface = Color(0xFFFEF3C7);// Light Gold Tint Surface
  static const Color primeAmber = Color(0xFFD97706);      // Brand Amber

  // Vibrant Gamification Accents
  static const Color primeEmerald = Color(0xFF15803D);    // High-contrast Success Green
  static const Color primeEmeraldSurface = Color(0xFFDCFCE7);
  static const Color primeRuby = Color(0xFFDC2626);       // High-contrast Alert Red
  static const Color primeRubySurface = Color(0xFFFEE2E2);

  // Dark Surfaces
  static const Color primeObsidian = Color(0xFF121214);   // Midnight Background
  static const Color primeCard = Color(0xFF18181B);       // Dark Card Surface
  static const Color primeCardElevated = Color(0xFF222226);// Dark Elevated Card
  static const Color primeCardHover = Color(0xFF2A2A30);  // Interactive Card Glow
  static const Color primeBorder = Color(0xFF2E2E33);     // Dark Divider / Outline

  // Light Mode Text & Surface Hierarchy (High-Contrast & Clearly Visible)
  static const Color textPrimary = Color(0xFF0F172A);     // Deep Slate Black
  static const Color textSecondary = Color(0xFF334155);   // Dark Slate
  static const Color textTertiary = Color(0xFF475569);    // Medium-Dark Slate
  static const Color surfaceWhite = Color(0xFFFFFFFF);    // Pure White Card Surface
  static const Color bgGrey = Color(0xFFF1F5F9);          // Clean Light Slate Background
  static const Color borderLight = Color(0xFFCBD5E1);     // Crisp Visible Box Border
  static const Color dividerLight = Color(0xFFE2E8F0);    // Clean Light Divider

  // Surface Tints & Glows
  static const Color surfaceTintLight = Color(0x1A0284C7);
  static const Color surfaceTintDark = Color(0x3300A8E1);

  // Shadows
  static const Color shadowLight = Color(0x180F172A);     // Crisp Light Shadow
  static const Color shadowDark = Color(0x80000000);      // 50% Deep Black

  // Dark Mode Palette
  static const Color darkBg = Color(0xFF121214);
  static const Color darkSurface = Color(0xFF18181B);
  static const Color darkSurfaceVariant = Color(0xFF222226);
  static const Color darkBorder = Color(0xFF2E2E33);
  static const Color darkTextPrimary = Color(0xFFF4F4F5);
  static const Color darkTextSecondary = Color(0xFFA1A1AA);
  static const Color darkBluePrimary = Color(0xFF38BDF8);
  static const Color darkBlueSurface = Color(0xFF1E293B);

  // Semantic Aliases
  static const Color googleBlue = Color(0xFF0284C7);
  static const Color googleBlueDark = Color(0xFF0369A1);
  static const Color googleBlueLight = Color(0xFF38BDF8);
  static const Color googleBlueSurface = Color(0xFFE0F2FE);
  static const Color googleBlueBorder = Color(0xFF7DD3FC);
  static const Color googleGreen = Color(0xFF15803D);
  static const Color googleGreenSurface = Color(0xFFDCFCE7);
  static const Color googleYellow = Color(0xFFD97706);
  static const Color googleYellowSurface = Color(0xFFFEF3C7);
  static const Color googleRed = Color(0xFFDC2626);
  static const Color googleRedSurface = Color(0xFFFEE2E2);
}

class AppTheme {
  AppTheme._();

  /// Google Minimalist Light Theme
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.googleBlue,
      primary: AppColors.googleBlue,
      onPrimary: Colors.white,
      primaryContainer: AppColors.googleBlueSurface,
      onPrimaryContainer: AppColors.googleBlueDark,
      secondary: AppColors.googleBlue,
      onSecondary: Colors.white,
      surface: AppColors.surfaceWhite,
      onSurface: AppColors.textPrimary,
      error: AppColors.googleRed,
      onError: Colors.white,
      brightness: Brightness.light,
    );

    final textTheme = GoogleFonts.interTextTheme(
      const TextTheme(
        displayLarge: TextStyle(fontSize: 57, fontWeight: FontWeight.w400, letterSpacing: -0.25, color: AppColors.textPrimary),
        displayMedium: TextStyle(fontSize: 45, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.textPrimary),
        displaySmall: TextStyle(fontSize: 36, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.textPrimary),
        headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w500, letterSpacing: -0.3, color: AppColors.textPrimary),
        headlineMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.textPrimary),
        headlineSmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.textPrimary),
        titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.textPrimary),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, letterSpacing: -0.1, color: AppColors.textPrimary),
        titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.textPrimary),
        bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, letterSpacing: -0.1, color: AppColors.textPrimary),
        bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.textPrimary),
        bodySmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, letterSpacing: 0.1, color: AppColors.textSecondary),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.textPrimary),
        labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.textSecondary),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.textTertiary),
      ),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: AppColors.bgGrey,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 1.0,
        shadowColor: AppColors.shadowLight,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w500,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          side: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
        margin: EdgeInsets.zero,
        shadowColor: AppColors.shadowLight,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.googleBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.googleBlue,
          side: const BorderSide(color: AppColors.borderLight, width: 1),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.googleBlue,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: AppColors.textTertiary,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.googleBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.googleRed, width: 1),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: AppColors.googleBlueSurface,
        elevation: 0,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.googleBlue,
            );
          }
          return GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.textSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.googleBlue, size: 24);
          }
          return const IconThemeData(color: AppColors.textSecondary, size: 24);
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        contentTextStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: Colors.white),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        titleTextStyle: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
        contentTextStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
      ),
    );
  }

  /// Google Minimalist Dark Theme
  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.darkBluePrimary,
      primary: AppColors.darkBluePrimary,
      onPrimary: AppColors.darkBg,
      primaryContainer: AppColors.darkBlueSurface,
      onPrimaryContainer: Colors.white,
      secondary: AppColors.darkBluePrimary,
      onSecondary: AppColors.darkBg,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkTextPrimary,
      error: AppColors.googleRed,
      onError: Colors.white,
      brightness: Brightness.dark,
    );

    final textTheme = GoogleFonts.interTextTheme(
      ThemeData(brightness: Brightness.dark).textTheme,
    ).copyWith(
      displayLarge: const TextStyle(fontSize: 57, fontWeight: FontWeight.w400, letterSpacing: -0.25, color: AppColors.darkTextPrimary),
      displayMedium: const TextStyle(fontSize: 45, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.darkTextPrimary),
      displaySmall: const TextStyle(fontSize: 36, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.darkTextPrimary),
      headlineLarge: const TextStyle(fontSize: 32, fontWeight: FontWeight.w500, letterSpacing: -0.3, color: AppColors.darkTextPrimary),
      headlineMedium: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.darkTextPrimary),
      headlineSmall: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.darkTextPrimary),
      titleLarge: const TextStyle(fontSize: 22, fontWeight: FontWeight.w500, letterSpacing: -0.2, color: AppColors.darkTextPrimary),
      titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, letterSpacing: -0.1, color: AppColors.darkTextPrimary),
      titleSmall: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.darkTextPrimary),
      bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, letterSpacing: -0.1, color: AppColors.darkTextPrimary),
      bodyMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, letterSpacing: 0, color: AppColors.darkTextPrimary),
      bodySmall: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, letterSpacing: 0.1, color: AppColors.darkTextSecondary),
      labelLarge: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.darkTextPrimary),
      labelMedium: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.darkTextSecondary),
      labelSmall: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.1, color: AppColors.darkTextSecondary),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: AppColors.darkBg,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkTextPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 1.0,
        shadowColor: AppColors.shadowDark,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w500,
          color: AppColors.darkTextPrimary,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          side: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
        margin: EdgeInsets.zero,
        shadowColor: AppColors.shadowDark,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.darkBluePrimary,
          foregroundColor: AppColors.darkBg,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.darkBluePrimary,
          side: const BorderSide(color: AppColors.darkBorder, width: 1),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.darkBluePrimary,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: AppColors.darkTextSecondary,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.darkBluePrimary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          borderSide: const BorderSide(color: AppColors.googleRed, width: 1),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.darkSurface,
        indicatorColor: AppColors.darkBlueSurface,
        elevation: 0,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.darkBluePrimary,
            );
          }
          return GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.darkTextSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.darkBluePrimary, size: 24);
          }
          return const IconThemeData(color: AppColors.darkTextSecondary, size: 24);
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        contentTextStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: Colors.white),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        titleTextStyle: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w500, color: AppColors.darkTextPrimary),
        contentTextStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.darkTextSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
      ),
    );
  }
}
