import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  LogOut,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { GeneratedTest, Language, QuestionModel, TestResultModel } from '../../types';
import { resultsService } from '../../services/resultsService';
import { bookmarksService } from '../../services/bookmarksService';

export const TestEngineScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  // Task 4: default is now false — instant feedback must be explicitly enabled
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const raw = sessionStorage.getItem('active_test');
    if (!raw) {
      navigate('/tests');
      return;
    }
    try {
      const parsed: GeneratedTest = JSON.parse(raw);
      setTest(parsed);
      setSecondsRemaining(parsed.durationMinutes * 60);
      startTimeRef.current = Date.now();
    } catch {
      navigate('/tests');
    }
  }, [navigate]);

  // Timer countdown
  useEffect(() => {
    if (secondsRemaining <= 0 && test) {
      // Time is up -> Auto submit
      handleSubmitTest();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secondsRemaining, test]);

  if (!test || test.questions.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQ = test.questions[currentIndex];
  const selectedOptionIndex = answers[currentQ.id];
  const isFlagged = flagged.has(currentQ.id);
  const isAnswered = selectedOptionIndex !== undefined;

  // Localized texts for question
  const getQuestionText = (q: QuestionModel): string => {
    if (language === 'mr' && q.questionTextMr?.trim()) return q.questionTextMr.trim();
    if (language === 'hi' && q.questionTextHi?.trim()) return q.questionTextHi.trim();
    return q.questionText;
  };

  const getOptions = (q: QuestionModel): string[] => {
    const localized =
      language === 'mr' ? q.optionsMr : language === 'hi' ? q.optionsHi : null;
    if (localized && localized.length === q.options.length && localized.some((o) => o.trim().length > 0)) {
      return q.options.map((opt, i) => (localized[i]?.trim() ? localized[i].trim() : opt));
    }
    return q.options;
  };

  const getExplanation = (q: QuestionModel): string => {
    if (language === 'mr' && q.explanationMr?.trim()) return q.explanationMr.trim();
    if (language === 'hi' && q.explanationHi?.trim()) return q.explanationHi.trim();
    return q.explanation;
  };

  const currentOptions = getOptions(currentQ);
  const currentQText = getQuestionText(currentQ);
  const currentExplanation = getExplanation(currentQ);

  const handleSelectOption = (index: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: index,
    }));
  };

  const handleClearAnswer = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => {
      const copy = new Set(prev);
      if (copy.has(currentQ.id)) {
        copy.delete(currentQ.id);
      } else {
        copy.add(currentQ.id);
      }
      return copy;
    });
  };

  const handleToggleBookmark = () => {
    bookmarksService.toggleBookmark(currentQ.id);
  };

  const handleSubmitTest = async () => {
    if (!test) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    let correctCount = 0;
    let wrongCount = 0;
    const wrongQuestionIds: string[] = [];

    for (const q of test.questions) {
      const chosen = answers[q.id];
      if (chosen !== undefined) {
        if (chosen === q.correctOptionIndex) {
          correctCount++;
        } else {
          wrongCount++;
          wrongQuestionIds.push(q.id);
        }
      }
    }

    const clientEventId = `EVENT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const result: TestResultModel = {
      clientEventId,
      testId: test.testId,
      testMode: test.mode,
      subject: test.subject,
      topicCode: test.topicCode,
      questionBankVersion: test.questionBankVersion,
      blueprintVersion: test.blueprintVersion,
      totalQuestions: test.questions.length,
      correctCount,
      wrongCount,
      score: correctCount,
      wrongQuestionIds,
      completedAt: new Date().toISOString(),
      timeTakenSeconds,
      studentAnswers: answers,
      syncStatus: 'PENDING',
    };

    // Save locally
    await resultsService.saveResult(result);

    // Sync to backend immediately
    try {
      await resultsService.syncPendingResults();
    } catch {
      // Offline fallback: will be retried on next sync
    }

    // Save to session storage for immediate review
    sessionStorage.setItem('view_result', JSON.stringify(result));
    sessionStorage.removeItem('active_test');

    navigate(`/results/${clientEventId}`);
  };

  // Timer formatting
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerWarning = secondsRemaining < 300; // <5 min

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = test.questions.length - answeredCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Top Test Header Bar — Task 5: removed X button, kept only nav controls */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {test.subject || 'MS-CIT Test'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px]">
                {test.mode}
              </span>
              <span>•</span>
              <span>{t('question_progress', { current: currentIndex + 1, total: test.questions.length })}</span>
            </div>
          </div>
        </div>

        {/* Timer & Utilities */}
        <div className="flex items-center gap-3">
          {/* Language selector in test */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिंदी</option>
          </select>

          {/* Task 4: Practice Mode Instant Feedback Toggle — clearer label, visible on all sizes */}
          {test.mode === 'PRACTICE' && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={instantFeedback}
                onChange={(e) => setInstantFeedback(e.target.checked)}
                className="rounded accent-indigo-600 cursor-pointer"
              />
              <span className="hidden sm:inline">Show answers</span>
            </label>
          )}

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors ${
              timerWarning
                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Palette Toggle */}
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Palette ({answeredCount}/{test.questions.length})
          </button>
        </div>
      </div>

      {/* Main Test Body: Question Card + Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Question & Options */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Question Header & Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Question #{currentIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleBookmark}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    bookmarksService.isBookmarked(currentQ.id)
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Bookmark Question"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      bookmarksService.isBookmarked(currentQ.id) ? 'fill-current' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">Bookmark</span>
                </button>

                <button
                  onClick={handleToggleFlag}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isFlagged
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={t('mark_for_review')}
                >
                  <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{t('mark_for_review')}</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQText}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentOptions.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx;
                const letter = String.fromCharCode(65 + idx);

                // Practice mode instant feedback styling
                const showFeedback =
                  test.mode === 'PRACTICE' && instantFeedback && isAnswered;
                const isCorrectOption = idx === currentQ.correctOptionIndex;

                let optionClass =
                  'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200';

                if (isSelected) {
                  optionClass =
                    'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-semibold ring-2 ring-indigo-500/30';
                }

                if (showFeedback) {
                  if (isCorrectOption) {
                    optionClass =
                      'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30';
                  } else if (isSelected && !isCorrectOption) {
                    optionClass =
                      'border-rose-500 bg-rose-50/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/30';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-4 rounded-xl border text-left text-sm sm:text-base flex items-start gap-3.5 transition-all cursor-pointer ${optionClass}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-snug">{opt}</span>
                    {showFeedback && (
                      <span className="shrink-0 mt-1">
                        {isCorrectOption ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5 text-rose-600" />
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clear Selection */}
            <div className="flex items-center justify-between pt-2">
              {isAnswered && (
                <button
                  type="button"
                  onClick={handleClearAnswer}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear selection</span>
                </button>
              )}
            </div>

            {/* Instant Feedback Explanation (Practice mode) */}
            {test.mode === 'PRACTICE' && instantFeedback && isAnswered && (
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm space-y-1.5 animate-fade-in ${
                  selectedOptionIndex === currentQ.correctOptionIndex
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>
                    Official Answer: Option {String.fromCharCode(65 + currentQ.correctOptionIndex)}
                  </span>
                </div>
                <p className="leading-relaxed opacity-90">{currentExplanation}</p>
              </div>
            )}
          </div>

          {/* Navigation Controls Bar — Task 5: removed duplicate green Submit button */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="py-2.5 px-5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {t('btn_back')}
            </button>

            <div className="flex items-center gap-3">
              {currentIndex < test.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, test.questions.length - 1))}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  {t('btn_next')}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right 1 col: Question Palette (Sticky Grid) */}
        <div
          className={`${
            paletteOpen ? 'block' : 'hidden lg:block'
          } p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('questions_overview')}
            </h3>
            <span className="text-xs font-mono font-bold text-indigo-600">
              {answeredCount}/{test.questions.length}
            </span>
          </div>

          {/* Palette Legend */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>{t('legend_answered')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span>{t('legend_flagged')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <span>{t('legend_left')}</span>
            </div>
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {test.questions.map((q, idx) => {
              const qAns = answers[q.id] !== undefined;
              const qFlag = flagged.has(q.id);
              const isCurrent = idx === currentIndex;

              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
              if (qAns) {
                btnBg = 'bg-emerald-600 text-white font-bold';
              } else if (qFlag) {
                btnBg = 'bg-amber-400 text-slate-900 font-bold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setPaletteOpen(false);
                  }}
                  className={`w-full aspect-square rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${btnBg} ${
                    isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Task 5: Submit Test button (renamed from "Finish Test") + Quit Test button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Test
            </button>
            <button
              onClick={() => setShowQuitModal(true)}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Quit Test
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 mx-auto flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {t('dialog_submit_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dialog_submit_desc')}
              </p>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div>
                <span className="text-slate-500">Answered:</span>
                <span className="font-bold text-emerald-600 ml-1.5">{answeredCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Unanswered:</span>
                <span className="font-bold text-rose-500 ml-1.5">{unansweredCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>You have {unansweredCount} unanswered questions remaining.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('btn_keep_testing')}
              </button>
              <button
                type="button"
                onClick={handleSubmitTest}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {t('btn_confirm_submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Test Dialog */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('dialog_quit_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dialog_quit_desc')}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                {t('btn_stay')}
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('active_test');
                  navigate('/tests');
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {t('btn_quit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
