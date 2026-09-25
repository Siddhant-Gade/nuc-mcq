import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Google Material Minimalist Card.
/// Clean surface with subtle shadow for depth, consistent border-radius,
/// and optional press-to-scale animation.
class FrostedCard extends StatelessWidget {
  const FrostedCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.borderRadius = AppRadius.md,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.elevation = 0,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final int elevation;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final defaultBg = isDark ? AppColors.darkSurface : Colors.white;
    final defaultBorder = isDark ? AppColors.darkBorder : AppColors.borderLight;

    List<BoxShadow>? shadows;
    if (elevation == 1) {
      shadows = [
        BoxShadow(
          color: isDark ? AppColors.shadowDark : AppColors.shadowLight,
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];
    } else if (elevation == 2) {
      shadows = [
        BoxShadow(
          color: isDark ? AppColors.shadowDark : AppColors.shadowLight,
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ];
    }

    Widget card = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? defaultBg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: borderColor ?? defaultBorder,
          width: 1.0,
        ),
        boxShadow: shadows,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          hoverColor: isDark
              ? Colors.white.withOpacity(0.04)
              : AppColors.googleBlueSurface.withOpacity(0.4),
          splashColor: isDark
              ? Colors.white.withOpacity(0.08)
              : AppColors.googleBlueSurface.withOpacity(0.7),
          child: card,
        ),
      );
    }

    return card;
  }
}
