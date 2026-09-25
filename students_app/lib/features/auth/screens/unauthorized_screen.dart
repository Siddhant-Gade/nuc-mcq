import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../cubit/auth_cubit.dart';
import '../models/student_identity.dart';

/// Shown when a Supabase session exists but the verified account has no STUDENT
/// role — i.e. the student is pending admin verification.
class UnauthorizedScreen extends StatefulWidget {
  const UnauthorizedScreen({super.key, required this.identity});

  final StudentIdentity identity;

  @override
  State<UnauthorizedScreen> createState() => _UnauthorizedScreenState();
}

class _UnauthorizedScreenState extends State<UnauthorizedScreen>
    with TickerProviderStateMixin {
  // ── request state ──────────────────────────────────────────────────────────
  bool _requestSent = false;
  bool _loading = false;
  Timer? _pollTimer;
  bool _isChecking = false;

  // ── celebration animation controllers ──────────────────────────────────────
  bool _isApproved = false;
  late final AnimationController _scaleCtrl;
  late final AnimationController _fadeCtrl;
  late final Animation<double> _scaleAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();

    // Celebration scale: 0 → 1.18 → 0.94 → 1.0 (bouncy pop)
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnim = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.18)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.18, end: 0.94)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 20,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.94, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 20,
      ),
    ]).animate(_scaleCtrl);

    // Fade in for text elements
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeIn);

    // Poll every 3.5 s — when admin approves, plays the pop-up celebration
    // animation and then transitions smoothly to HomeShell.
    _pollTimer = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      _pollApproval();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _scaleCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  // ── request helpers ────────────────────────────────────────────────────────

  Future<void> _pollApproval() async {
    if (_isApproved || _isChecking || !mounted) return;
    _isChecking = true;
    try {
      final identity = await context.read<AuthCubit>().checkApprovalStatus();
      if (identity != null && mounted) {
        await _triggerCelebration(identity);
      }
    } finally {
      if (mounted) _isChecking = false;
    }
  }


  Future<void> _handleRequestAccess() async {
    setState(() => _loading = true);
    final success = await context.read<AuthCubit>().requestAccess();
    if (!mounted) return;
    setState(() {
      _loading = false;
      _requestSent = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? 'Authorization request sent to Admin successfully!'
              : 'Request already pending — Admin will review it shortly.',
        ),
        backgroundColor: success ? AppColors.googleGreen : null,
      ),
    );
  }

  Future<void> _handleRefresh() async {
    setState(() => _loading = true);
    final identity = await context.read<AuthCubit>().checkApprovalStatus();
    if (!mounted) return;
    setState(() => _loading = false);
    if (identity != null) {
      await _triggerCelebration(identity);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access is still pending administrator review.'),
        ),
      );
    }
  }

  // ── celebration trigger ────────────────────────────────────────────────────

  Future<void> _triggerCelebration(StudentIdentity identity) async {
    if (_isApproved) return;
    _pollTimer?.cancel();
    setState(() => _isApproved = true);
    _scaleCtrl.forward();
    // Fade in text slightly after the pop
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _fadeCtrl.forward();
    });

    // Let the student see and enjoy the pop-up celebration animation for 2.2 seconds
    await Future.delayed(const Duration(milliseconds: 2200));
    if (mounted) {
      context.read<AuthCubit>().markAuthenticated(identity);
    }
  }

  // ── build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          // ── Waiting page ────────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: FrostedCard(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                    borderRadius: AppRadius.lg,
                    elevation: 1,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF3C1816)
                                : AppColors.googleRedSurface,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.lock_person_outlined,
                            size: 44,
                            color: AppColors.googleRed,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          'Access Pending Verification',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            letterSpacing: -0.2,
                            color: isDark
                                ? AppColors.darkTextPrimary
                                : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          widget.identity.name != null
                              ? 'Student ${widget.identity.name} is pending administrator verification.'
                              : (widget.identity.studentId != null
                                  ? 'PRN ${widget.identity.studentId} is pending administrator verification.'
                                  : 'Your account is pending administrator verification.'),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: isDark
                                ? AppColors.darkTextSecondary
                                : AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // Send Authorization Request Button / Waiting badge
                        if (!_requestSent)
                          RoyalButton(
                            text: _loading
                                ? 'Sending Request...'
                                : 'Send Access Request to Admin',
                            icon: Icons.send_rounded,
                            isLoading: _loading,
                            onPressed: _loading ? null : _handleRequestAccess,
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.googleGreenSurface,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                  color:
                                      AppColors.googleGreen.withOpacity(0.3)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.check_circle_rounded,
                                    color: AppColors.googleGreen, size: 20),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Request sent! Waiting for admin approval…',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.googleGreen,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: AppSpacing.md),

                        // Refresh button
                        RoyalButton(
                          text: 'Check Verification Status',
                          icon: Icons.refresh_rounded,
                          isSecondary: true,
                          isLoading: _loading,
                          onPressed: _loading ? null : _handleRefresh,
                        ),
                        const SizedBox(height: AppSpacing.sm),

                        // Sign out
                        TextButton.icon(
                          icon: const Icon(Icons.logout_rounded, size: 16),
                          label: const Text('Sign Out'),
                          style: TextButton.styleFrom(
                            foregroundColor: isDark
                                ? AppColors.darkTextSecondary
                                : AppColors.textSecondary,
                          ),
                          onPressed: () =>
                              context.read<AuthCubit>().signOut(),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

            // ── Celebration overlay (shown when admin approves) ──────────────
            if (_isApproved)
              _CelebrationOverlay(
                studentName: widget.identity.name,
                scaleAnim: _scaleAnim,
                fadeAnim: _fadeAnim,
                isDark: isDark,
              ),
          ],
        ),
      );
  }
}

// ── Celebration overlay widget ────────────────────────────────────────────────

class _CelebrationOverlay extends StatelessWidget {
  const _CelebrationOverlay({
    required this.studentName,
    required this.scaleAnim,
    required this.fadeAnim,
    required this.isDark,
  });

  final String? studentName;
  final Animation<double> scaleAnim;
  final Animation<double> fadeAnim;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: isDark
          ? Colors.black.withOpacity(0.82)
          : Colors.white.withOpacity(0.90),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Bouncing checkmark circle
            ScaleTransition(
              scale: scaleAnim,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.googleGreenSurface,
                  border: Border.all(
                      color: AppColors.googleGreen.withOpacity(0.35),
                      width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.googleGreen.withOpacity(0.28),
                      blurRadius: 40,
                      spreadRadius: 8,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 64,
                  color: AppColors.googleGreen,
                ),
              ),
            ),
            const SizedBox(height: 32),

            // "You're Authorized!" text
            FadeTransition(
              opacity: fadeAnim,
              child: Column(
                children: [
                  Text(
                    'You\'re Authorized! 🎉',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                      color: isDark
                          ? AppColors.darkTextPrimary
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    studentName != null
                        ? 'Welcome, $studentName!\nEntering the app…'
                        : 'Welcome!\nEntering the app…',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      color: isDark
                          ? AppColors.darkTextSecondary
                          : AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),
                  const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.googleGreen),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
