import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/frosted_card.dart';
import '../../../core/widgets/scale_press.dart';
import '../cubit/broadcast_cubit.dart';
import '../models/broadcast.dart';

/// Lists published announcements for the signed-in student (Google style).
class BroadcastsScreen extends StatelessWidget {
  const BroadcastsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Institute Notices'),
      ),
      body: BlocBuilder<BroadcastCubit, BroadcastState>(
        builder: (context, state) {
          if (state is BroadcastsLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BroadcastsError) {
            return _ErrorOrFallbackView(message: state.message);
          }
          final broadcasts = state is BroadcastsLoaded ? state.broadcasts : const <Broadcast>[];
          if (broadcasts.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => context.read<BroadcastCubit>().load(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 80),
                  Icon(
                    Icons.campaign_outlined,
                    size: 48,
                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'No active announcements',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'All institute notices are up to date.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => context.read<BroadcastCubit>().load(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
              itemCount: broadcasts.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) => _BroadcastCard(broadcasts[index]),
            ),
          );
        },
      ),
    );
  }
}

class _ErrorOrFallbackView extends StatelessWidget {
  const _ErrorOrFallbackView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: () => context.read<BroadcastCubit>().load(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        children: [
          const SizedBox(height: 60),
          Icon(
            Icons.cloud_off_rounded,
            size: 44,
            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Unable to load notices',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Center(
            child: TextButton.icon(
              onPressed: () => context.read<BroadcastCubit>().load(),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BroadcastCard extends StatelessWidget {
  const _BroadcastCard(this.broadcast);

  final Broadcast broadcast;

  String get _publishedLabel {
    final publishedAt = broadcast.publishedAt;
    if (publishedAt == null) return '';
    final local = publishedAt.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    return '$day/$month/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ScalePress(
      child: FrostedCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        elevation: 1,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkBlueSurface : AppColors.googleBlueSurface,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    Icons.campaign_outlined,
                    color: isDark ? AppColors.darkBluePrimary : AppColors.googleBlue,
                    size: 18,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm + 2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        broadcast.title,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                        ),
                      ),
                      if (_publishedLabel.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Posted $_publishedLabel',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm + 2),
            Text(
              broadcast.message,
              style: GoogleFonts.inter(
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w400,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
