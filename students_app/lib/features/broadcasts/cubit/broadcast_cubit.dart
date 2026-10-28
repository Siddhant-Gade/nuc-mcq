import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/services/app_badge_service.dart';
import '../../../core/services/push_notification_service.dart';
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

  Future<void> load() async {
    emit(const BroadcastsLoading());
    try {
      await _repository.syncPendingReads();
      final broadcasts = await _repository.fetchPublished();
      final localUnreadCount = broadcasts.where((b) => !b.isRead).length;
      final unreadCount = await _repository.fetchUnreadCount().catchError((_) => localUnreadCount);
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

  Future<void> markAsRead(String id) async {
    final current = state;
    if (current is! BroadcastsLoaded) return;
    final index = current.broadcasts.indexWhere((b) => b.id == id);
    if (index == -1 || current.broadcasts[index].isRead) return;

    final updated = List<Broadcast>.from(current.broadcasts);
    updated[index] = updated[index].copyWith(
      isRead: true,
      readAt: DateTime.now(),
    );
    final unreadCount = updated.where((b) => !b.isRead).length;
    emit(BroadcastsLoaded(List.unmodifiable(updated), unreadCount: unreadCount));
    await AppBadgeService.instance.updateBadge(unreadCount);
    await PushNotificationService.instance.dismissNotification(id);

    try {
      await _repository.markRead(id);
    } catch (_) {
      final reverted = List<Broadcast>.from(updated);
      reverted[index] = reverted[index].copyWith(isRead: false, readAt: null);
      final revertedCount = reverted.where((b) => !b.isRead).length;
      emit(BroadcastsLoaded(List.unmodifiable(reverted), unreadCount: revertedCount));
      await AppBadgeService.instance.updateBadge(revertedCount);
    }
  }

  Future<void> markAllAsSeen() async {
    await markAllAsRead();
  }

  Future<void> markAllAsRead() async {
    final current = state;
    if (current is! BroadcastsLoaded) return;
    if (current.unreadCount == 0) return;

    final now = DateTime.now();
    final updated = current.broadcasts
        .map((b) => b.isRead ? b : b.copyWith(isRead: true, readAt: now))
        .toList(growable: false);

    emit(BroadcastsLoaded(List.unmodifiable(updated), unreadCount: 0));
    await AppBadgeService.instance.removeBadge();
    try {
      await PushNotificationService.instance.dismissAllNotifications();
    } catch (_) {}

    try {
      await _repository.markAllRead();
    } catch (_) {}
  }

  void reset() {
    emit(const BroadcastsLoading());
  }
}
