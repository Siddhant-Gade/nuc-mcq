import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../cubit/auth_cubit.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : const Color(0xFFF1F5F9),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: BlocConsumer<AuthCubit, AuthState>(
                listener: (context, state) {
                  final error =
                      state is AuthUnauthenticated ? state.error : null;
                  if (error != null) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(
                          content: Text(
                            error,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          backgroundColor: AppColors.googleRed,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      );
                  }
                },
                builder: (context, state) {
                  final busy = state is AuthSigningIn || state is AuthChecking;

                  return FadeTransition(
                    opacity: _fadeAnimation,
                    child: SlideTransition(
                      position: _slideAnimation,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // ── Institute Logo Header ──
                          Container(
                            width: 76,
                            height: 76,
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0xFF334155)
                                    : const Color(0xFFE2E8F0),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.asset(
                                'assets/icon/logo.jpeg',
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) => Icon(
                                  Icons.school_outlined,
                                  size: 38,
                                  color: isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // ── Institute Titles ──
                          Text(
                            'New Unique Computers',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 21,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.4,
                              color: isDark
                                  ? AppColors.darkTextPrimary
                                  : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'MS-CIT Student Exam Portal',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isDark
                                  ? AppColors.darkTextSecondary
                                  : const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // ── Card Container with 2px Ring & Large Spread Shadow ──
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF1E293B)
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0xFF334155)
                                    : const Color(0xFFCBD5E1),
                                width: 1.5,
                              ),
                              boxShadow: [
                                // 2px outer border-ring
                                BoxShadow(
                                  color: isDark
                                      ? const Color(0xFF475569)
                                      : const Color(0xFFCBD5E1),
                                  spreadRadius: 2,
                                  blurRadius: 0,
                                  offset: Offset.zero,
                                ),
                                // Soft, wide spread ambient elevation
                                BoxShadow(
                                  color: isDark
                                      ? Colors.black.withOpacity(0.55)
                                      : const Color(0xFF64748B).withOpacity(0.20),
                                  spreadRadius: 10,
                                  blurRadius: 36,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'STUDENT AUTHENTICATION',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.2,
                                    color: isDark
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 20),

                                // ── Sign In with Google Button ──
                                SizedBox(
                                  height: 50,
                                  child: ElevatedButton(
                                    onPressed: busy
                                        ? null
                                        : () => context
                                            .read<AuthCubit>()
                                            .signInWithGoogle(),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isDark
                                          ? const Color(0xFF0F172A)
                                          : Colors.white,
                                      foregroundColor: isDark
                                          ? Colors.white
                                          : const Color(0xFF1E293B),
                                      elevation: 0,
                                      side: BorderSide(
                                        color: isDark
                                            ? const Color(0xFF475569)
                                            : const Color(0xFFCBD5E1),
                                        width: 1.5,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                    ),
                                    child: busy
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                            ),
                                          )
                                        : FittedBox(
                                            fit: BoxFit.scaleDown,
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                                const _GoogleLogo(size: 20),
                                                const SizedBox(width: 12),
                                                Text(
                                                  'Sign in with Google',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 15,
                                                    fontWeight: FontWeight.w700,
                                                    letterSpacing: -0.2,
                                                    color: isDark
                                                        ? Colors.white
                                                        : const Color(0xFF0F172A),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(height: 16),

                                // ── Guidance Footnote ──
                                Text(
                                  'Sign in with the Gmail address registered during your institute admission.',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w400,
                                    height: 1.45,
                                    color: isDark
                                        ? const Color(0xFF94A3B8)
                                        : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 22),

                          // ── Support / Admin Contact ──
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'New Admission? ',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: isDark
                                      ? const Color(0xFF94A3B8)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                              Text(
                                'Contact Institute Admin',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: isDark
                                      ? AppColors.darkBluePrimary
                                      : AppColors.googleBlue,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Official 4-color Google 'G' icon rendered natively via Canvas
class _GoogleLogo extends StatelessWidget {
  const _GoogleLogo({this.size = 20});
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final center = Offset(w / 2, h / 2);
    final radius = w / 2;
    final strokeWidth = w * 0.22;

    final rect = Rect.fromCircle(
      center: center,
      radius: radius - strokeWidth / 2,
    );

    final paintBlue = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintGreen = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintYellow = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintRed = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    // Blue arc (right side)
    canvas.drawArc(rect, -0.78, 1.57, false, paintBlue);

    // Blue horizontal bar
    final barPaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.square;
    canvas.drawLine(
      Offset(center.dx, center.dy),
      Offset(w - strokeWidth / 2, center.dy),
      barPaint,
    );

    // Green arc (bottom)
    canvas.drawArc(rect, 0.79, 1.57, false, paintGreen);

    // Yellow arc (left-bottom)
    canvas.drawArc(rect, 2.36, 1.25, false, paintYellow);

    // Red arc (top)
    canvas.drawArc(rect, 3.61, 1.96, false, paintRed);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
