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

  Future<void> loadResults() async {
    emit(const ResultsLoading());
    try {
      final results = await _repository.getAllResults();
      final stats = await _repository.getStudentStats();
      emit(ResultsLoaded(
        results: results,
        stats: stats,
        filterMode: _currentFilter,
      ));
    } catch (e) {
      emit(ResultsError('Failed to load results: $e'));
    }
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
