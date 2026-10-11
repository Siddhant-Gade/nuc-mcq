import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/test_result_model.dart';
import '../repository/results_repository.dart';

sealed class ResultsState {
  const ResultsState();
}

class ResultsInitial extends ResultsState {
  const ResultsInitial();
}

class ResultsLoading extends ResultsState {
  const ResultsLoading();
}

class ResultsLoaded extends ResultsState {
  const ResultsLoaded({
    required this.results,
    required this.stats,
    this.filterMode,
  });

  final List<TestResultModel> results;
  final StudentStats stats;
  final String? filterMode; // null = all, 'EXAM', 'PRACTICE'

  List<TestResultModel> get filteredResults {
    if (filterMode == null || filterMode == 'ALL') return results;
    return results.where((r) => r.testMode.code == filterMode).toList();
  }
}

class ResultsError extends ResultsState {
  const ResultsError(this.message);
  final String message;
}

class ResultsCubit extends Cubit<ResultsState> {
  ResultsCubit(this._repository) : super(const ResultsInitial());

  final ResultsRepository _repository;
  String _currentFilter = 'ALL';

  Future<void> loadResults({bool refreshFromCloud = true}) async {
    // 1. Immediately emit cached results if available for zero-latency UI
    List<TestResultModel> cachedResults = [];
    StudentStats? cachedStats;
    try {
      cachedResults = await _repository.getAllResults();
      cachedStats = await _repository.getStudentStats();
      if (cachedResults.isNotEmpty) {
        emit(ResultsLoaded(
          results: cachedResults,
          stats: cachedStats,
          filterMode: _currentFilter,
        ));
      } else {
        emit(const ResultsLoading());
      }
    } catch (_) {
      emit(const ResultsLoading());
    }

    // 2. Fetch fresh / historical results from backend
    if (refreshFromCloud) {
      try {
        final updatedResults = await _repository.syncFromBackend();
        final updatedStats = await _repository.getStudentStats();
        emit(ResultsLoaded(
          results: updatedResults,
          stats: updatedStats,
          filterMode: _currentFilter,
        ));
      } catch (e) {
        // Graceful fallback to local cache
        final currentResults = await _repository.getAllResults();
        final currentStats = await _repository.getStudentStats();
        emit(ResultsLoaded(
          results: currentResults,
          stats: currentStats,
          filterMode: _currentFilter,
        ));
      }
    }
  }

  void reset() {
    emit(const ResultsInitial());
  }

  void setFilter(String filter) {
    _currentFilter = filter;
    if (state is ResultsLoaded) {
      final current = state as ResultsLoaded;
      emit(ResultsLoaded(
        results: current.results,
        stats: current.stats,
        filterMode: filter,
      ));
    }
  }
}
