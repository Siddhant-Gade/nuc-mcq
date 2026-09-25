import 'package:flutter_bloc/flutter_bloc.dart';
import '../repository/sync_repository.dart';

sealed class SyncState {
  const SyncState();
}

class SyncIdle extends SyncState {
  const SyncIdle();
}

class SyncInProgress extends SyncState {
  const SyncInProgress();
}

class SyncCompleted extends SyncState {
  const SyncCompleted(this.summary);
  final SyncResultSummary summary;
}

class SyncFailed extends SyncState {
  const SyncFailed(this.message);
  final String message;
}

class SyncCubit extends Cubit<SyncState> {
  SyncCubit(this._repository) : super(const SyncIdle());

  final SyncRepository _repository;

  Future<void> syncNow() async {
    emit(const SyncInProgress());
    try {
      final summary = await _repository.syncPendingResults();
      emit(SyncCompleted(summary));
    } catch (e) {
      emit(SyncFailed(e.toString()));
    }
  }
}
