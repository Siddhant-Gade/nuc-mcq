import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// Google Minimalist Score Display with count-up animation.
/// Clean numbers, subtle progress indicator, and clean status chip.
class ScoreGauge extends StatefulWidget {
  const ScoreGauge({
    super.key,
    required this.score,
    required this.totalQuestions,
    this.animate = true,
  });

  final int score;
  final int totalQuestions;
  final bool animate;

  @override
  State<ScoreGauge> createState() => _ScoreGaugeState();
}

class _ScoreGaugeState extends State<ScoreGauge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scoreAnimation;
  late final Animation<double> _progressAnimation;

  double get percentage =>
      widget.totalQuestions > 0 ? (widget.score / widget.totalQuestions) : 0.0;
  bool get isPassed => percentage >= 0.5;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scoreAnimation = Tween<double>(
      begin: 0,
      end: widget.score.toDouble(),
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));
    _progressAnimation = Tween<double>(
      begin: 0,
      end: percentage.clamp(0.0, 1.0),
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    if (widget.animate) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(ScoreGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.score != widget.score ||
        oldWidget.totalQuestions != widget.totalQuestions) {
      _controller.reset();
      _scoreAnimation = Tween<double>(
        begin: 0,
        end: widget.score.toDouble(),
      ).animate(CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ));
      _progressAnimation = Tween<double>(
        begin: 0,
        end: percentage.clamp(0.0, 1.0),
      ).animate(CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ));
      if (widget.animate) {
        _controller.forward();
      } else {
        _controller.value = 1.0;
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = isPassed ? AppColors.googleGreen : AppColors.googleRed;
    final statusBg = isPassed
        ? (isDark ? const Color(0xFF13381B) : AppColors.googleGreenSurface)
        : (isDark ? const Color(0xFF3C1816) : AppColors.googleRedSurface);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            AnimatedBuilder(
              animation: _scoreAnimation,
              builder: (context, child) {
                return Text(
                  '${_scoreAnimation.value.toInt()}',
                  style: GoogleFonts.inter(
                    fontSize: 44,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                    letterSpacing: -1.0,
                  ),
                );
              },
            ),
            Text(
              ' / ${widget.totalQuestions}',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w400,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Score: ${(percentage * 100).toInt()}%',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: SizedBox(
            width: 220,
            height: 6,
            child: AnimatedBuilder(
              animation: _progressAnimation,
              builder: (context, child) {
                return LinearProgressIndicator(
                  value: _progressAnimation.value,
                  backgroundColor:
                      isDark ? const Color(0xFF3C4043) : const Color(0xFFE8EAED),
                  valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: statusBg,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(
              color: statusColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isPassed ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                size: 15,
                color: statusColor,
              ),
              const SizedBox(width: 6),
              Text(
                isPassed ? 'PASSED (>= 50%)' : 'NEEDS PRACTICE (< 50%)',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: statusColor,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
