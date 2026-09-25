import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/royal_button.dart';
import '../cubit/auth_cubit.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _prnController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSignUp = false;

  Timer? _debounceTimer;
  String? _resolvedStudentName;
  bool _isResolvingPrn = false;
  bool _prnNotFound = false;

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
    _prnController.addListener(_onPrnChanged);
  }

  void _onPrnChanged() {
    final prn = _prnController.text.trim();
    _debounceTimer?.cancel();

    if (prn.isEmpty || prn.length < 3) {
      if (_resolvedStudentName != null || _prnNotFound || _isResolvingPrn) {
        setState(() {
          _resolvedStudentName = null;
          _prnNotFound = false;
          _isResolvingPrn = false;
        });
      }
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() {
        _isResolvingPrn = true;
        _prnNotFound = false;
      });

      try {
        final authRepo = context.read<AuthCubit>().repository;
        final info = await authRepo.resolveStudent(prn);
        if (!mounted) return;
        if (_prnController.text.trim() == prn) {
          setState(() {
            _isResolvingPrn = false;
            _resolvedStudentName = info?['name']?.toString();
            _prnNotFound = info == null;
          });
        }
      } catch (_) {
        if (mounted && _prnController.text.trim() == prn) {
          setState(() {
            _isResolvingPrn = false;
            _resolvedStudentName = null;
            _prnNotFound = false;
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _debounceTimer?.cancel();
    _prnController.removeListener(_onPrnChanged);
    _prnController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _submit() {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }
    final prn = _prnController.text.trim();
    final password = _passwordController.text;

    if (_isSignUp) {
      context.read<AuthCubit>().signUp(prn, password);
    } else {
      context.read<AuthCubit>().signIn(prn, password);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.bgGrey,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: BlocConsumer<AuthCubit, AuthState>(
                listener: (context, state) {
                  final error = state is AuthUnauthenticated ? state.error : null;
                  if (error != null) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(
                          content: Text(error),
                          backgroundColor: AppColors.googleRed,
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
                      child: FrostedCard(
                        padding: const EdgeInsets.all(28),
                        borderRadius: AppRadius.lg,
                        elevation: 1,
                        child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Centered Brand Header
                          Center(
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.darkBlueSurface
                                    : AppColors.googleBlueSurface,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                              child: Icon(
                                Icons.school_outlined,
                                size: 24,
                                color: isDark
                                    ? AppColors.darkBluePrimary
                                    : AppColors.googleBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Center(
                            child: Column(
                              children: [
                                Text(
                                  'New Unique Computers',
                                  style: GoogleFonts.inter(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.3,
                                    color: isDark
                                        ? AppColors.darkTextPrimary
                                        : AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Student Portal',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: isDark
                                        ? AppColors.darkTextSecondary
                                        : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // Mode Selector Pill (Sign In / Sign Up)
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkSurfaceVariant : const Color(0xFFF1F3F4),
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: busy ? null : () => setState(() => _isSignUp = false),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: !_isSignUp
                                            ? (isDark ? AppColors.darkSurface : Colors.white)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(AppRadius.sm - 2),
                                        boxShadow: !_isSignUp
                                            ? [
                                                BoxShadow(
                                                  color: Colors.black.withOpacity(0.06),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 1),
                                                ),
                                              ]
                                            : null,
                                      ),
                                      child: Text(
                                        'Sign In',
                                        textAlign: TextAlign.center,
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: !_isSignUp ? FontWeight.w600 : FontWeight.w500,
                                          color: !_isSignUp
                                              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                              : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: busy ? null : () => setState(() => _isSignUp = true),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: _isSignUp
                                            ? (isDark ? AppColors.darkSurface : Colors.white)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(AppRadius.sm - 2),
                                        boxShadow: _isSignUp
                                            ? [
                                                BoxShadow(
                                                  color: Colors.black.withOpacity(0.06),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 1),
                                                ),
                                              ]
                                            : null,
                                      ),
                                      child: Text(
                                        'Create Account',
                                        textAlign: TextAlign.center,
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: _isSignUp ? FontWeight.w600 : FontWeight.w500,
                                          color: _isSignUp
                                              ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                              : (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // Heading
                          Text(
                            _isSignUp ? 'Create Account' : 'Sign in',
                            style: GoogleFonts.inter(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -0.3,
                              color: isDark
                                  ? AppColors.darkTextPrimary
                                  : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isSignUp
                                ? 'Enter the PRN provided by your institute'
                                : 'Enter your PRN and password to continue',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: isDark
                                  ? AppColors.darkTextSecondary
                                  : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // PRN Input
                          TextFormField(
                            controller: _prnController,
                            decoration: InputDecoration(
                              labelText: 'PRN / Student ID',
                              hintText: 'e.g. PRN2026945779',
                              prefixIcon: const Icon(Icons.badge_outlined, size: 20),
                              suffixIcon: _isResolvingPrn
                                  ? const Padding(
                                      padding: EdgeInsets.all(12),
                                      child: SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    )
                                  : (_resolvedStudentName != null
                                      ? const Icon(Icons.check_circle, color: AppColors.googleGreen, size: 20)
                                      : null),
                            ),
                            keyboardType: TextInputType.text,
                            autofillHints: const [AutofillHints.username],
                            textInputAction: TextInputAction.next,
                            enabled: !busy,
                            validator: (value) {
                              final prn = value?.trim() ?? '';
                              if (prn.isEmpty) {
                                return 'PRN / Student ID is required.';
                              }
                              return null;
                            },
                          ),

                          // Live Student Name Banner
                          if (_resolvedStudentName != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF132F20) : const Color(0xFFE6F4EA),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF1E6B38) : const Color(0xFF34A853),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.verified_user_rounded, size: 18, color: AppColors.googleGreen),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Student: $_resolvedStudentName',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? const Color(0xFF81C995) : const Color(0xFF137333),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (_prnNotFound) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF3C1816) : const Color(0xFFFCE8E6),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF6E2824) : const Color(0xFFF28B82),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, size: 18, color: AppColors.googleRed),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'No admitted student found with this PRN',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        color: isDark ? const Color(0xFFF28B82) : const Color(0xFFC5221F),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 14),

                          // Password Input
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: _isSignUp ? 'Set Password' : 'Password',
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined,
                                  size: 20,
                                ),
                                onPressed: () => setState(() {
                                  _obscurePassword = !_obscurePassword;
                                }),
                              ),
                            ),
                            obscureText: _obscurePassword,
                            autofillHints: const [AutofillHints.password],
                            textInputAction: _isSignUp ? TextInputAction.next : TextInputAction.done,
                            enabled: !busy,
                            onFieldSubmitted: (_) {
                              if (!_isSignUp) _submit();
                            },
                            validator: (value) {
                              if ((value ?? '').isEmpty) {
                                return 'Password is required.';
                              }
                              if (_isSignUp && (value?.length ?? 0) < 6) {
                                return 'Password must be at least 6 characters.';
                              }
                              return null;
                            },
                          ),

                          // Confirm Password (Sign Up Mode only)
                          if (_isSignUp) ...[
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _confirmPasswordController,
                              decoration: InputDecoration(
                                labelText: 'Confirm Password',
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureConfirmPassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    size: 20,
                                  ),
                                  onPressed: () => setState(() {
                                    _obscureConfirmPassword = !_obscureConfirmPassword;
                                  }),
                                ),
                              ),
                              obscureText: _obscureConfirmPassword,
                              textInputAction: TextInputAction.done,
                              enabled: !busy,
                              onFieldSubmitted: (_) => _submit(),
                              validator: (value) {
                                if (_isSignUp) {
                                  if ((value ?? '').isEmpty) {
                                    return 'Please confirm your password.';
                                  }
                                  if (value != _passwordController.text) {
                                    return 'Passwords do not match.';
                                  }
                                }
                                return null;
                              },
                            ),
                          ],
                          const SizedBox(height: 22),

                          // Action Button
                          RoyalButton(
                            text: _isSignUp ? 'Register & Sign In' : 'Sign In',
                            isLoading: busy,
                            width: double.infinity,
                            onPressed: busy ? null : _submit,
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Toggle text link
                          Center(
                            child: TextButton(
                              onPressed: busy ? null : () => setState(() => _isSignUp = !_isSignUp),
                              child: Text(
                                _isSignUp
                                    ? 'Already have an account? Sign In'
                                    : 'New student? Create Account',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          // ── "or" divider ──
                          Row(
                            children: [
                              Expanded(child: Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.borderLight)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  'or continue with',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w400,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              Expanded(child: Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.borderLight)),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          // ── Google Sign-In button ──
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : () => context.read<AuthCubit>().signInWithGoogle(),
                              icon: Text(
                                'G',
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: busy
                                      ? (isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)
                                      : const Color(0xFF4285F4),
                                ),
                              ),
                              label: Text(
                                'Sign in with Google',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.borderLight),
                          const SizedBox(height: AppSpacing.md),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.cloud_done_outlined,
                                size: 14,
                                color: isDark
                                    ? AppColors.darkBluePrimary
                                    : AppColors.googleBlue,
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  'Full offline practice enabled after login',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w400,
                                    color: isDark
                                        ? AppColors.darkTextSecondary
                                        : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
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
