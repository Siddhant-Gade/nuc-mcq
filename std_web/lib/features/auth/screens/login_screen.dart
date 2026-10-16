import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../cubit/auth_cubit.dart';
import '../repository/auth_repository.dart';

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
                                const SizedBox(height: 16),

                                // ── Divider ──
                                Row(
                                  children: [
                                    Expanded(
                                      child: Divider(
                                        color: isDark
                                            ? const Color(0xFF334155)
                                            : const Color(0xFFE2E8F0),
                                        height: 1,
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      child: Text(
                                        'OR',
                                        style: GoogleFonts.inter(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 0.5,
                                          color: isDark
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF94A3B8),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: Divider(
                                        color: isDark
                                            ? const Color(0xFF334155)
                                            : const Color(0xFFE2E8F0),
                                        height: 1,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // ── Request Student Access Button ──
                                SizedBox(
                                  height: 44,
                                  child: OutlinedButton.icon(
                                    onPressed: busy
                                        ? null
                                        : () => _openRequestAccessSheet(context),
                                    icon: const Icon(Icons.how_to_reg_outlined, size: 18),
                                    label: const Text('Request Student Access'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: isDark
                                          ? AppColors.darkBluePrimary
                                          : AppColors.googleBlue,
                                      side: BorderSide(
                                        color: isDark
                                            ? AppColors.darkBluePrimary.withOpacity(0.5)
                                            : AppColors.googleBlue.withOpacity(0.4),
                                        width: 1.2,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      textStyle: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
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
                                'Need access? ',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: isDark
                                      ? const Color(0xFF94A3B8)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _openRequestAccessSheet(context),
                                child: Text(
                                  'Submit Authorization Request',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isDark
                                        ? AppColors.darkBluePrimary
                                        : AppColors.googleBlue,
                                  ),
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

  void _openRequestAccessSheet(BuildContext context) {
    final authRepo = context.read<AuthCubit>().repository;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RequestAccessBottomSheet(authRepository: authRepo),
    );
  }
}

class _RequestAccessBottomSheet extends StatefulWidget {
  const _RequestAccessBottomSheet({required this.authRepository});

  final AuthRepository authRepository;

  @override
  State<_RequestAccessBottomSheet> createState() => _RequestAccessBottomSheetState();
}

class _RequestAccessBottomSheetState extends State<_RequestAccessBottomSheet> {
  int _tabIndex = 0; // 0 = Google / Gmail, 1 = Institute PRN
  final _prnController = TextEditingController();
  final _emailController = TextEditingController();
  Timer? _debounceTimer;

  bool _isResolving = false;
  Map<String, dynamic>? _resolvedStudent;
  bool _resolvedNotFound = false;

  bool _isSubmitting = false;
  String? _errorMessage;
  String? _successMessage;
  bool _isAlreadyPending = false;
  bool _isAlreadyActive = false;

  @override
  void initState() {
    super.initState();
    _prnController.addListener(_onPrnChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _prnController.removeListener(_onPrnChanged);
    _prnController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onPrnChanged() {
    _debounceTimer?.cancel();
    final prn = _prnController.text.trim();
    if (prn.isEmpty) {
      if (mounted) {
        setState(() {
          _resolvedStudent = null;
          _resolvedNotFound = false;
          _isResolving = false;
          _errorMessage = null;
        });
      }
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() {
        _isResolving = true;
        _errorMessage = null;
      });
      try {
        final info = await widget.authRepository.resolveStudent(prn);
        if (!mounted) return;
        if (_prnController.text.trim() == prn) {
          setState(() {
            _isResolving = false;
            _resolvedStudent = info;
            _resolvedNotFound = info == null;
          });
        }
      } catch (_) {
        if (mounted && _prnController.text.trim() == prn) {
          setState(() {
            _isResolving = false;
            _resolvedStudent = null;
            _resolvedNotFound = false;
          });
        }
      }
    });
  }

  Future<void> _handlePickGoogle() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _isAlreadyActive = false;
      _isAlreadyPending = false;
    });

    try {
      final account = await widget.authRepository.pickGoogleAccount();
      if (!mounted) return;
      if (account == null) {
        setState(() => _isSubmitting = false);
        return;
      }
      await _handleSubmitEmail(account.email, account.displayName);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Could not select Google account. Please try again or enter manually.';
      });
    }
  }

  Future<void> _handleSubmitEmail([String? prefilledEmail, String? name]) async {
    final email = (prefilledEmail ?? _emailController.text).trim().toLowerCase();
    if (email.isEmpty) {
      setState(() => _errorMessage = 'Please enter your Gmail / email address.');
      return;
    }

    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!emailRegex.hasMatch(email)) {
      setState(() => _errorMessage = 'Please enter a valid Gmail / email address.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _isAlreadyActive = false;
      _isAlreadyPending = false;
    });

    try {
      final res = await widget.authRepository.submitPublicAuthorizationRequest(
        email: email,
        name: name,
      );
      if (!mounted) return;
      final isPending = res['alreadyPending'] == true;
      setState(() {
        _isSubmitting = false;
        _isAlreadyPending = isPending;
        _successMessage = res['message']?.toString() ??
            (isPending
                ? 'Your authorization request is already pending administrator approval.'
                : 'Authorization request submitted successfully!');
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        if (e.code == 'ALREADY_ACTIVE' || e.code == 'CONFLICT') {
          _isAlreadyActive = true;
          _errorMessage = e.message;
        } else {
          _errorMessage = e.message;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Unable to connect to server. Please verify your connection.';
      });
    }
  }

  Future<void> _handleSubmitPrn() async {
    final prn = _prnController.text.trim();
    if (prn.isEmpty) {
      setState(() => _errorMessage = 'Please enter your Institute PRN / Roll Number.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _isAlreadyActive = false;
      _isAlreadyPending = false;
    });

    try {
      final res = await widget.authRepository.submitPublicAuthorizationRequest(prn: prn);
      if (!mounted) return;
      final isPending = res['alreadyPending'] == true;
      setState(() {
        _isSubmitting = false;
        _isAlreadyPending = isPending;
        _successMessage = res['message']?.toString() ??
            (isPending
                ? 'Your authorization request is already pending administrator approval.'
                : 'Authorization request submitted successfully!');
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        if (e.code == 'ALREADY_ACTIVE' || e.code == 'CONFLICT') {
          _isAlreadyActive = true;
          _errorMessage = e.message;
        } else {
          _errorMessage = e.message;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Unable to connect to server. Please verify your connection.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.how_to_reg_rounded,
                      color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Request Student Access',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'MS-CIT Institute Authorization Portal',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (_successMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _isAlreadyPending
                        ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                        : (isDark ? const Color(0xFF132F20) : const Color(0xFFE6F4EA)),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _isAlreadyPending
                          ? (isDark ? const Color(0xFF2563EB) : const Color(0xFF3B82F6))
                          : (isDark ? const Color(0xFF1E6B38) : const Color(0xFF34A853)),
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        _isAlreadyPending ? Icons.hourglass_top_rounded : Icons.check_circle_rounded,
                        color: _isAlreadyPending ? AppColors.googleBlue : AppColors.googleGreen,
                        size: 36,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _isAlreadyPending ? 'Request Already Pending' : 'Request Submitted!',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _successMessage!,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          height: 1.4,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 42,
                        child: ElevatedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          child: const Text('Done'),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Dual Mode Segmented Toggle
                Container(
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.all(3),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            if (_isSubmitting) return;
                            setState(() {
                              _tabIndex = 0;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: _tabIndex == 0
                                  ? (isDark ? const Color(0xFF1E293B) : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: _tabIndex == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        blurRadius: 3,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.mail_outline_rounded,
                                  size: 16,
                                  color: _tabIndex == 0
                                      ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                      : (isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B)),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Google / Gmail',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: _tabIndex == 0 ? FontWeight.w600 : FontWeight.w500,
                                    color: _tabIndex == 0
                                        ? (isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A))
                                        : (isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            if (_isSubmitting) return;
                            setState(() {
                              _tabIndex = 1;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: _tabIndex == 1
                                  ? (isDark ? const Color(0xFF1E293B) : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: _tabIndex == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        blurRadius: 3,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.badge_outlined,
                                  size: 16,
                                  color: _tabIndex == 1
                                      ? (isDark ? AppColors.darkBluePrimary : AppColors.googleBlue)
                                      : (isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B)),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Institute PRN',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: _tabIndex == 1 ? FontWeight.w600 : FontWeight.w500,
                                    color: _tabIndex == 1
                                        ? (isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A))
                                        : (isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // TAB 0: Google Account Picker & Manual Gmail
                if (_tabIndex == 0) ...[
                  Text(
                    'New students without an Institute PRN can request access directly using Google or Gmail.',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      height: 1.4,
                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Option 1: Select Google Account (Native Account Picker)
                  SizedBox(
                    height: 46,
                    child: OutlinedButton(
                      onPressed: _isSubmitting ? null : _handlePickGoogle,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const _GoogleLogo(size: 18),
                          const SizedBox(width: 10),
                          Text(
                            'Select Google Account',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Divider(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text(
                          'OR ENTER GMAIL MANUALLY',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                            color: isDark ? AppColors.darkTextSecondary : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Option 2: Enter Gmail Manually
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.done,
                    enabled: !_isSubmitting,
                    onFieldSubmitted: (_) => _handleSubmitEmail(),
                    decoration: InputDecoration(
                      labelText: 'Gmail / Email Address',
                      hintText: 'e.g. yourname@gmail.com',
                      prefixIcon: const Icon(Icons.email_outlined, size: 20),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 14,
                          color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Entering an email manually requests authorization. Your administrator will verify and approve your account.',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: _isAlreadyActive
                            ? (isDark ? const Color(0xFF132F20) : const Color(0xFFE6F4EA))
                            : (isDark ? const Color(0xFF3C1816) : const Color(0xFFFCE8E6)),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _isAlreadyActive
                              ? (isDark ? const Color(0xFF1E6B38) : const Color(0xFF34A853))
                              : (isDark ? const Color(0xFF6E2824) : const Color(0xFFF28B82)),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _isAlreadyActive ? Icons.check_circle_outline : Icons.error_outline_rounded,
                            size: 16,
                            color: _isAlreadyActive ? AppColors.googleGreen : AppColors.googleRed,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: _isAlreadyActive
                                    ? (isDark ? const Color(0xFF81C995) : const Color(0xFF137333))
                                    : (isDark ? const Color(0xFFF28B82) : const Color(0xFFC5221F)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),
                  SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : () => _handleSubmitEmail(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Submit Request',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ] else ...[
                  // TAB 1: Institute PRN
                  Text(
                    'Enter the PRN / Roll Number provided upon institute admission to request portal access.',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      height: 1.4,
                      color: isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _prnController,
                    autofocus: true,
                    textInputAction: TextInputAction.done,
                    enabled: !_isSubmitting,
                    onFieldSubmitted: (_) => _handleSubmitPrn(),
                    decoration: InputDecoration(
                      labelText: 'Institute PRN / Roll Number',
                      hintText: 'e.g. 2024001 or PRN-2024-001',
                      prefixIcon: const Icon(Icons.badge_outlined, size: 20),
                      suffixIcon: _isResolving
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : null,
                      filled: true,
                      fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                        ),
                      ),
                    ),
                  ),
                  if (_resolvedStudent != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF132F20) : const Color(0xFFE6F4EA),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isDark ? const Color(0xFF1E6B38) : const Color(0xFF34A853),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.verified_user_rounded,
                            size: 18,
                            color: AppColors.googleGreen,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${_resolvedStudent!['name'] ?? 'Enrolled Student'}',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFF81C995) : const Color(0xFF137333),
                                  ),
                                ),
                                if (_resolvedStudent!['batchName'] != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    'Batch: ${_resolvedStudent!['batchName']}',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w400,
                                      color: isDark ? const Color(0xFF81C995) : const Color(0xFF137333),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else if (_resolvedNotFound && _prnController.text.trim().length >= 3) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C1F06) : const Color(0xFFFFF8E1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isDark ? const Color(0xFF785412) : const Color(0xFFFFC107),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.info_outline_rounded,
                            size: 16,
                            color: Color(0xFFF9A825),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'PRN not yet pre-matched. You can still submit for admin review.',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: isDark ? const Color(0xFFFFD54F) : const Color(0xFFB78103),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: _isAlreadyActive
                            ? (isDark ? const Color(0xFF132F20) : const Color(0xFFE6F4EA))
                            : (isDark ? const Color(0xFF3C1816) : const Color(0xFFFCE8E6)),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _isAlreadyActive
                              ? (isDark ? const Color(0xFF1E6B38) : const Color(0xFF34A853))
                              : (isDark ? const Color(0xFF6E2824) : const Color(0xFFF28B82)),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _isAlreadyActive ? Icons.check_circle_outline : Icons.error_outline_rounded,
                            size: 16,
                            color: _isAlreadyActive ? AppColors.googleGreen : AppColors.googleRed,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: _isAlreadyActive
                                    ? (isDark ? const Color(0xFF81C995) : const Color(0xFF137333))
                                    : (isDark ? const Color(0xFFF28B82) : const Color(0xFFC5221F)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 18),
                  SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleSubmitPrn,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Submit Request',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ],
            ],
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
