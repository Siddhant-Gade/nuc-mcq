import 'dart:async';
import 'dart:math';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../question_bank/models/question_model.dart';
import '../../results/models/test_result_model.dart';
import '../../results/repository/results_repository.dart';
import '../services/test_generator.dart';

enum TestExecutionStatus { inProgress, submitting, completed, suspended }

class TestEngineState {
  const TestEngineState({
    required this.test,
    required this.currentIndex,
    required this.answers,
    required this.flaggedQuestionIds,
    required this.remainingSeconds,
    required this.totalDurationSeconds,
    required this.status,
    this.completedResult,
    this.eliminatedOptionIndices = const {},
    this.lifelinesRemaining = 3,
    this.currentStreak = 0,
    this.maxStreak = 0,
    this.earnedXp = 0,
    this.lastAnswerWasCorrect,
    this.suspensionReason,
  });

  final GeneratedTest test;
  final int currentIndex;
  final String? suspensionReason;
  final Map<String, int> answers; // questionId -> selectedOptionIndex
  final Set<String> flaggedQuestionIds;
  final int remainingSeconds;
  final int totalDurationSeconds;
  final TestExecutionStatus status;
  final TestResultModel? completedResult;

  // Gamification properties
  final Map<String, Set<int>> eliminatedOptionIndices; // questionId -> set of eliminated option indices (50:50)
  final int lifelinesRemaining;
  final int currentStreak;
  final int maxStreak;
  final int earnedXp;
  final bool? lastAnswerWasCorrect;

  QuestionModel get currentQuestion {
    if (test.questions.isEmpty) {
      return const QuestionModel(
        id: 'EMPTY',
        topic: QuestionTopic.computerFundamentals,
        questionText: 'No questions available',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        explanation: '',
      );
    }
    final safeIndex = (currentIndex >= 0 && currentIndex < test.questions.length) ? currentIndex : 0;
    return test.questions[safeIndex];
  }
  int get totalQuestions => test.questions.length;
  int get answeredCount => answers.length;
  int get unansweredCount => totalQuestions - answeredCount;
  int get flaggedCount => flaggedQuestionIds.length;

  bool isOptionSelected(int optionIndex) =>
      answers[currentQuestion.id] == optionIndex;

  bool isQuestionAnswered(String questionId) => answers.containsKey(questionId);

  bool isQuestionFlagged(String questionId) =>
      flaggedQuestionIds.contains(questionId);

  bool isOptionEliminated(int optionIndex) {
    final eliminated = eliminatedOptionIndices[currentQuestion.id];
    return eliminated != null && eliminated.contains(optionIndex);
  }

  bool get hasUsedLifelineForCurrentQuestion =>
      eliminatedOptionIndices.containsKey(currentQuestion.id);

  double get streakMultiplier {
    if (currentStreak >= 5) return 2.5;
    if (currentStreak >= 3) return 1.5;
    return 1.0;
  }

  TestEngineState copyWith({
    int? currentIndex,
    Map<String, int>? answers,
    Set<String>? flaggedQuestionIds,
    int? remainingSeconds,
    TestExecutionStatus? status,
    TestResultModel? completedResult,
    Map<String, Set<int>>? eliminatedOptionIndices,
    int? lifelinesRemaining,
    int? currentStreak,
    int? maxStreak,
    int? earnedXp,
    bool? lastAnswerWasCorrect,
    String? suspensionReason,
  }) {
    return TestEngineState(
      test: test,
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
      flaggedQuestionIds: flaggedQuestionIds ?? this.flaggedQuestionIds,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      totalDurationSeconds: totalDurationSeconds,
      status: status ?? this.status,
      completedResult: completedResult ?? this.completedResult,
      eliminatedOptionIndices: eliminatedOptionIndices ?? this.eliminatedOptionIndices,
      lifelinesRemaining: lifelinesRemaining ?? this.lifelinesRemaining,
      currentStreak: currentStreak ?? this.currentStreak,
      maxStreak: maxStreak ?? this.maxStreak,
      earnedXp: earnedXp ?? this.earnedXp,
      lastAnswerWasCorrect: lastAnswerWasCorrect ?? this.lastAnswerWasCorrect,
      suspensionReason: suspensionReason ?? this.suspensionReason,
    );
  }
}

/// Cubit managing live, client-side offline test execution.
/// Transient state per Section 4 & 5 of system_design.md with gamified features.
class TestEngineCubit extends Cubit<TestEngineState> {
  TestEngineCubit({
    required GeneratedTest test,
    required ResultsRepository resultsRepository,
  })  : _resultsRepository = resultsRepository,
        super(TestEngineState(
          test: test,
          currentIndex: 0,
          answers: {},
          flaggedQuestionIds: {},
          remainingSeconds: test.durationMinutes * 60,
          totalDurationSeconds: test.durationMinutes * 60,
          status: TestExecutionStatus.inProgress,
        )) {
    _startTimer();
  }

  final ResultsRepository _resultsRepository;
  Timer? _timer;

  void haltDueToSuspension(String reason) {
    _timer?.cancel();
    _timer = null;
    emit(state.copyWith(
      status: TestExecutionStatus.suspended,
      suspensionReason: reason,
    ));
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.status == TestExecutionStatus.completed) {
        timer.cancel();
        return;
      }

      if (state.remainingSeconds <= 1) {
        timer.cancel();
        submitTest(autoSubmitted: true);
      } else {
        emit(state.copyWith(remainingSeconds: state.remainingSeconds - 1));
      }
    });
  }

  /// Select an option. Gamified streak / XP are ONLY computed in Practice mode to preserve Exam integrity.
  void selectOption(int optionIndex) {
    if (state.status != TestExecutionStatus.inProgress) return;
    final currentQ = state.currentQuestion;
    final updated = Map<String, int>.from(state.answers);
    final previousSelection = updated[currentQ.id];
    updated[currentQ.id] = optionIndex;

    // Gamification feedback: Strictly only compute & reveal for Practice Mode
    final isPractice = state.test.mode == TestMode.practice;
    final isCorrect = optionIndex == currentQ.correctOptionIndex;
    int nextStreak = isPractice ? state.currentStreak : 0;
    int nextMaxStreak = isPractice ? state.maxStreak : 0;
    int addedXp = 0;

    if (isPractice && previousSelection == null) {
      if (isCorrect) {
        nextStreak += 1;
        nextMaxStreak = max(nextMaxStreak, nextStreak);
        final multiplier = nextStreak >= 5 ? 2.5 : (nextStreak >= 3 ? 1.5 : 1.0);
        addedXp = (10 * multiplier).round();
      } else {
        nextStreak = 0;
      }
    }

    emit(state.copyWith(
      answers: updated,
      currentStreak: nextStreak,
      maxStreak: nextMaxStreak,
      earnedXp: isPractice ? state.earnedXp + addedXp : 0,
      lastAnswerWasCorrect: isPractice ? isCorrect : null,
    ));
  }

  /// 50:50 Lifeline - Eliminates 2 incorrect options. Strictly disabled in Exam Mode.
  bool useFiftyFiftyLifeline() {
    if (state.test.mode != TestMode.practice) return false;
    if (state.lifelinesRemaining <= 0) return false;
    final q = state.currentQuestion;
    if (state.eliminatedOptionIndices.containsKey(q.id)) return false;

    final correctIdx = q.correctOptionIndex;
    final totalOpts = q.options.length;
    final wrongIndices = <int>[];
    for (int i = 0; i < totalOpts; i++) {
      if (i != correctIdx) wrongIndices.add(i);
    }
    if (wrongIndices.length < 2) return false;

    wrongIndices.shuffle(Random());
    final toEliminate = wrongIndices.take(2).toSet();

    final updatedElim = Map<String, Set<int>>.from(state.eliminatedOptionIndices);
    updatedElim[q.id] = toEliminate;

    emit(state.copyWith(
      eliminatedOptionIndices: updatedElim,
      lifelinesRemaining: state.lifelinesRemaining - 1,
    ));
    return true;
  }

  void clearSelection() {
    if (state.status != TestExecutionStatus.inProgress) return;
    final updated = Map<String, int>.from(state.answers);
    updated.remove(state.currentQuestion.id);
    emit(state.copyWith(answers: updated));
  }

  void toggleFlagReview() {
    final updated = Set<String>.from(state.flaggedQuestionIds);
    final id = state.currentQuestion.id;
    if (updated.contains(id)) {
      updated.remove(id);
    } else {
      updated.add(id);
    }
    emit(state.copyWith(flaggedQuestionIds: updated));
  }

  void goToQuestion(int index) {
    if (index >= 0 && index < state.totalQuestions) {
      emit(state.copyWith(currentIndex: index));
    }
  }

  void nextQuestion() {
    if (state.currentIndex < state.totalQuestions - 1) {
      emit(state.copyWith(currentIndex: state.currentIndex + 1));
    }
  }

  void previousQuestion() {
    if (state.currentIndex > 0) {
      emit(state.copyWith(currentIndex: state.currentIndex - 1));
    }
  }

  /// Calculates test score locally (Confirmed Section 12.5 trust boundary)
  /// and saves result durably into ResultsRepository.
  Future<TestResultModel> submitTest({bool autoSubmitted = false}) async {
    _timer?.cancel();
    emit(state.copyWith(status: TestExecutionStatus.submitting));

    int correctCount = 0;
    int wrongCount = 0;
    final List<String> wrongQuestionIds = [];

    for (final question in state.test.questions) {
      final selected = state.answers[question.id];
      if (selected != null) {
        if (selected == question.correctOptionIndex) {
          correctCount++;
        } else {
          wrongCount++;
          wrongQuestionIds.add(question.id);
        }
      }
      // Note: Unanswered questions (selected == null) are skipped by the student.
      // They are not counted as correct, and not added to wrongQuestionIds,
      // ensuring wrongQuestionIds.length == wrongCount exactly.
    }

    final total = state.totalQuestions;

    final result = TestResultModel(
      clientEventId: 'evt_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(99999)}',
      testId: state.test.testId,
      testMode: state.test.mode,
      subject: state.test.subject,
      topicCode: state.test.topicCode,
      totalQuestions: total,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: correctCount,
      wrongQuestionIds: wrongQuestionIds,
      completedAt: DateTime.now(),
      timeTakenSeconds: state.totalDurationSeconds - state.remainingSeconds,
      studentAnswers: state.answers,
      syncStatus: SyncStatus.pending,
      questionBankVersion: state.test.questionBankVersion,
      blueprintVersion: state.test.blueprintVersion,
    );

    await _resultsRepository.saveResult(result);

    emit(state.copyWith(
      status: TestExecutionStatus.completed,
      completedResult: result,
    ));

    return result;
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
