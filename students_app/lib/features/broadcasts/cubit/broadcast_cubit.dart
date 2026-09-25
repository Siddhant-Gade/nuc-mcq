import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/services/app_badge_service.dart';
import '../models/broadcast.dart';
import '../repository/broadcast_repository.dart';

sealed class BroadcastState {
  const BroadcastState();
}

class BroadcastsLoading extends BroadcastState {
  const BroadcastsLoading();
}

class BroadcastsLoaded extends BroadcastState {
  const BroadcastsLoaded(
    this.broadcasts, {
    this.unreadCount = 0,
    bool? hasUnread,
  }) : hasUnread = hasUnread ?? (unreadCount > 0);

  final List<Broadcast> broadcasts;
  final int unreadCount;
  final bool hasUnread;
}

class BroadcastsError extends BroadcastState {
  const BroadcastsError(this.message);

  final String message;
}

class BroadcastCubit extends Cubit<BroadcastState> {
  BroadcastCubit(this._repository) : super(const BroadcastsLoading());

  final BroadcastRepository _repository;
  static const String _lastSeenKey = 'last_seen_broadcast_timestamp';

  Future<void> load() async {
    emit(const BroadcastsLoading());
    try {
      final broadcasts = await _repository.fetchPublished();
      final unreadCount = await _computeUnreadCount(broadcasts);
      await AppBadgeService.instance.updateBadge(unreadCount);
      emit(BroadcastsLoaded(
        List.unmodifiable(broadcasts),
        unreadCount: unreadCount,
      ));
    } on ApiException catch (error) {
      emit(BroadcastsError(error.message));
    } catch (_) {
      emit(const BroadcastsError('Something went wrong while loading broadcasts.'));
    }
  }

  Future<int> _computeUnreadCount(List<Broadcast> broadcasts) async {
    if (broadcasts.isEmpty) return 0;
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSeenIso = prefs.getString(_lastSeenKey);
      if (lastSeenIso == null) {
        return broadcasts.length;
      }
      final lastSeen = DateTime.tryParse(lastSeenIso);
      if (lastSeen == null) return broadcasts.length;

      return broadcasts.where((b) =>
          b.publishedAt != null && b.publishedAt!.isAfter(lastSeen)).length;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markAllAsSeen() async {
    final current = state;
    if (current is! BroadcastsLoaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_lastSeenKey, DateTime.now().toIso8601String());
      await AppBadgeService.instance.removeBadge();
      emit(BroadcastsLoaded(current.broadcasts, unreadCount: 0));
    } catch (_) {}
  }
}
