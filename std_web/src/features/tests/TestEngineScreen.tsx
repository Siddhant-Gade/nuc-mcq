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
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
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

      const savedAnswers = sessionStorage.getItem(`active_test_answers_${parsed.testId}`);
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch {}
      }

      const savedSeconds = sessionStorage.getItem(`active_test_time_${parsed.testId}`);
      if (savedSeconds) {
        const sec = parseInt(savedSeconds, 10);
        if (!isNaN(sec) && sec > 0) {
          setSecondsRemaining(sec);
        } else {
          setSecondsRemaining(parsed.durationMinutes * 60);
        }
      } else {
        setSecondsRemaining(parsed.durationMinutes * 60);
      }

      startTimeRef.current = Date.now();
    } catch {
      navigate('/tests');
    }
  }, [navigate]);

  useEffect(() => {
    if (test?.testId && Object.keys(answers).length > 0) {
      sessionStorage.setItem(`active_test_answers_${test.testId}`, JSON.stringify(answers));
    }
  }, [answers, test?.testId]);

  useEffect(() => {
    if (test?.testId && secondsRemaining > 0) {
      sessionStorage.setItem(`active_test_time_${test.testId}`, secondsRemaining.toString());
    }
  }, [secondsRemaining, test?.testId]);

  useEffect(() => {
    if (secondsRemaining <= 0 && test) {
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
        <div className="w-8 h-8 border-4 border-peach-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQ = test.questions[currentIndex];
  const selectedOptionIndex = answers[currentQ.id];
  const isFlagged = flagged.has(currentQ.id);
  const isAnswered = selectedOptionIndex !== undefined;

  const getQuestionText = (q: QuestionModel): string => {
    if (language === 'mr' && q.questionTextMr) return q.questionTextMr;
    if (language === 'hi' && q.questionTextHi) return q.questionTextHi;
    return q.questionText;
  };

  const getOptions = (q: QuestionModel): string[] => {
    if (language === 'mr' && q.optionsMr && q.optionsMr.length === q.options.length) {
      return q.optionsMr;
    }
    if (language === 'hi' && q.optionsHi && q.optionsHi.length === q.options.length) {
      return q.optionsHi;
    }
    return q.options;
  };

  const getExplanation = (q: QuestionModel): string => {
    if (language === 'mr' && q.explanationMr) return q.explanationMr;
    if (language === 'hi' && q.explanationHi) return q.explanationHi;
    return q.explanation || 'No official explanation provided for this question.';
  };

  const currentQText = getQuestionText(currentQ);
  const currentOptions = getOptions(currentQ);
  const currentExplanation = getExplanation(currentQ);

  const handleSelectOption = (optIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIndex,
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

    await resultsService.saveResult(result);

    try {
      await resultsService.syncPendingResults();
    } catch {
      // Offline fallback
    }

    sessionStorage.setItem('view_result', JSON.stringify(result));
    sessionStorage.removeItem('active_test');
    if (test) {
      sessionStorage.removeItem(`active_test_answers_${test.testId}`);
      sessionStorage.removeItem(`active_test_time_${test.testId}`);
    }

    navigate(`/results/${clientEventId}`);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerWarning = secondsRemaining < 300;

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = test.questions.length - answeredCount;
  const isLastQuestion = currentIndex === test.questions.length - 1;

  // Render palette grid (reusable for both desktop sidebar and mobile sheet)
  const renderPaletteGrid = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-[#fde8d7]">
          {t('questions_overview')}
        </h3>
        <span className="text-xs font-mono font-bold text-peach-600 dark:text-peach-400">
          {answeredCount}/{test.questions.length} Answered
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-[#a8876e] font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{t('legend_answered')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
          <span className="truncate">{t('legend_flagged')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-[#382619] shrink-0" />
          <span className="truncate">{t('legend_left')}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 pt-1 max-h-[46vh] lg:max-h-none overflow-y-auto pr-1">
        {test.questions.map((q, idx) => {
          const qAns = answers[q.id] !== undefined;
          const qFlag = flagged.has(q.id);
          const isCurrent = idx === currentIndex;

          let btnBg = 'bg-slate-100 dark:bg-[#2c2016] text-slate-600 dark:text-[#d9b89f] border border-slate-200/50 dark:border-[#443224]';
          if (qAns) {
            btnBg = 'bg-emerald-600 text-white font-bold border border-emerald-500 shadow-xs';
          } else if (qFlag) {
            btnBg = 'bg-amber-400 text-slate-900 font-bold border border-amber-300';
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setPaletteOpen(false);
              }}
              className={`w-full aspect-square rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${btnBg} ${
                isCurrent ? 'ring-2 ring-peach-500 ring-offset-2 dark:ring-offset-[#19120c] scale-105' : ''
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-[#38281d] space-y-2">
        <button
          onClick={() => {
            setPaletteOpen(false);
            setShowSubmitModal(true);
          }}
          className="w-full py-2.5 rounded-xl bg-peach-600 hover:bg-peach-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit Test</span>
        </button>
        <button
          onClick={() => {
            setPaletteOpen(false);
            setShowQuitModal(true);
          }}
          className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-900/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Quit Test</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3.5 sm:space-y-6 max-w-5xl mx-auto animate-fade-in pb-20 sm:pb-16 min-w-0">
      {/* 1. TOP STICKY HEADER (Mobile First, zero dead space top-0) */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1f150e]/95 backdrop-blur-md px-3.5 py-2.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-[#443224] shadow-xs flex items-center justify-between gap-2 transition-colors">
        {/* Left: Test Subject & Progress */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs sm:text-base text-slate-900 dark:text-[#fde8d7] truncate">
              {test.subject || 'MS-CIT Assessment'}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-[#a8876e] font-medium">
              <span className="px-1.5 py-0.5 rounded bg-peach-50 dark:bg-[#332014] text-peach-700 dark:text-peach-300 font-bold uppercase text-[9px] sm:text-[10px] border border-peach-200/50 dark:border-[#523321]">
                {test.mode}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-700 dark:text-[#d9b89f]">
                Q {currentIndex + 1}/{test.questions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Practice Mode Answer Toggle */}
          {test.mode === 'PRACTICE' && (
            <label className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#d9b89f] font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={instantFeedback}
                onChange={(e) => setInstantFeedback(e.target.checked)}
                className="rounded accent-peach-600 cursor-pointer"
              />
              <span>Answers</span>
            </label>
          )}

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="Test language"
            className="text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-200 dark:border-[#443224] bg-white dark:bg-[#271b12] text-slate-700 dark:text-[#d9b89f] cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="mr">MR</option>
            <option value="hi">HI</option>
          </select>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-colors ${
              timerWarning
                ? 'bg-red-50 dark:bg-[#381518] text-red-600 dark:text-red-300 border-red-200 dark:border-red-900 animate-pulse'
                : 'bg-slate-100 dark:bg-[#2c2016] text-slate-800 dark:text-[#fde8d7] border-slate-200 dark:border-[#443224]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Mobile Palette Toggle Button */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-peach-50 dark:bg-[#2e1d13] text-peach-700 dark:text-peach-300 border border-peach-200 dark:border-[#4a3424] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
            aria-label="Open Question Palette"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden xs:inline text-[11px] font-mono">
              {answeredCount}/{test.questions.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TEST CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
        {/* Left 3 cols: Question Card */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 min-w-0">
          <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs space-y-4 sm:space-y-6">
            {/* Question Card Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-[#33251a]">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-[#a8876e] uppercase tracking-wider">
                Question #{currentIndex + 1}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleToggleBookmark}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    bookmarksService.isBookmarked(currentQ.id)
                      ? 'bg-amber-50 dark:bg-[#332514] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-[#523e20]'
                      : 'text-slate-400 dark:text-[#a8876e] hover:bg-slate-100 dark:hover:bg-[#2c2016]'
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
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isFlagged
                      ? 'bg-amber-50 dark:bg-[#332514] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-[#523e20]'
                      : 'text-slate-400 dark:text-[#a8876e] hover:bg-slate-100 dark:hover:bg-[#2c2016]'
                  }`}
                  title={t('mark_for_review')}
                >
                  <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{t('mark_for_review')}</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-[#fde8d7] leading-relaxed break-words">
              {currentQText}
            </div>

            {/* Options List (Mobile First Touch Targets) */}
            <div className="space-y-2.5 sm:space-y-3">
              {currentOptions.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx;
                const letter = String.fromCharCode(65 + idx);

                const showFeedback =
                  test.mode === 'PRACTICE' && instantFeedback && isAnswered;
                const isCorrectOption = idx === currentQ.correctOptionIndex;

                let optionClass =
                  'border-slate-200 dark:border-[#443224] hover:border-peach-400 dark:hover:border-peach-600 bg-white dark:bg-[#281d14] text-slate-800 dark:text-[#fde8d7]';

                if (isSelected) {
                  optionClass =
                    'border-peach-600 bg-peach-50/80 dark:bg-[#382014] text-peach-950 dark:text-[#ffeedd] font-semibold ring-2 ring-peach-500/30';
                }

                if (showFeedback) {
                  if (isCorrectOption) {
                    optionClass =
                      'border-emerald-600 bg-emerald-50 dark:bg-[#18291c] text-emerald-950 dark:text-emerald-200 font-semibold ring-2 ring-emerald-500/30';
                  } else if (isSelected) {
                    optionClass =
                      'border-rose-600 bg-rose-50 dark:bg-[#2d171a] text-rose-950 dark:text-rose-200 font-semibold ring-2 ring-rose-500/30';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full min-h-[50px] p-3 sm:p-4 rounded-xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer select-none active:scale-[0.99] touch-manipulation ${optionClass}`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-peach-600 text-white'
                            : 'bg-slate-100 dark:bg-[#332216] text-slate-600 dark:text-[#d9b89f]'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-relaxed break-words flex-1 pt-0.5">
                        {opt}
                      </span>
                    </div>

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

            {/* Clear Selection & Secondary Actions */}
            <div className="flex items-center justify-between pt-1">
              {isAnswered && (
                <button
                  type="button"
                  onClick={handleClearAnswer}
                  className="text-xs text-slate-400 dark:text-[#a8876e] hover:text-slate-600 dark:hover:text-[#fde8d7] flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear selection</span>
                </button>
              )}
            </div>

            {/* Instant Feedback Explanation */}
            {test.mode === 'PRACTICE' && instantFeedback && isAnswered && (
              <div
                className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm space-y-1.5 animate-fade-in ${
                  selectedOptionIndex === currentQ.correctOptionIndex
                    ? 'bg-emerald-50 dark:bg-[#18291c] border-emerald-200 dark:border-[#27442d] text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-[#2b2114] border-amber-200 dark:border-[#4d3a20] text-amber-900 dark:text-amber-200'
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

          {/* Desktop/Tablet In-Page Navigation Bar */}
          <div className="hidden sm:flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="py-2.5 px-5 rounded-xl border border-slate-300 dark:border-[#443224] disabled:opacity-40 text-xs font-bold text-slate-700 dark:text-[#d9b89f] hover:bg-slate-100 dark:hover:bg-[#2c2016] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {t('btn_back')}
            </button>

            <div className="flex items-center gap-3">
              {isLastQuestion ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Test</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, test.questions.length - 1))}
                  className="py-2.5 px-6 rounded-xl bg-peach-600 hover:bg-peach-700 text-white text-xs font-bold shadow-md shadow-peach-500/20 transition-all cursor-pointer active:scale-95"
                >
                  {t('btn_next')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 col: Question Palette (Desktop view) */}
        <div className="hidden lg:block p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs space-y-4 h-fit">
          {renderPaletteGrid()}
        </div>
      </div>

      {/* 3. MOBILE FIXED BOTTOM ACTION BAR (< sm screens) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a120b]/95 backdrop-blur-md p-2.5 border-t border-slate-200/80 dark:border-[#3d271d] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] safe-area-bottom">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-[#443224] disabled:opacity-30 text-xs font-bold text-slate-700 dark:text-[#d9b89f] bg-white dark:bg-[#221810] flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed touch-manipulation active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#2c2016] text-slate-700 dark:text-[#fde8d7] border border-slate-200 dark:border-[#443224] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
          >
            <Grid className="w-4 h-4 text-peach-600 dark:text-peach-400" />
            <span>{answeredCount}/{test.questions.length}</span>
          </button>

          {/* Next or Submit button */}
          {isLastQuestion ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Submit</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, test.questions.length - 1))}
              className="flex-1 py-2.5 px-3 rounded-xl bg-peach-600 hover:bg-peach-700 text-white text-xs font-bold shadow-md shadow-peach-500/20 flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MOBILE QUESTION PALETTE DRAWER / MODAL (< lg screens) */}
      {paletteOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setPaletteOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-h-[85vh] bg-white dark:bg-[#221810] rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 dark:border-[#443224] overflow-y-auto animate-fade-in safe-area-bottom">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-[#33251a]">
              <span className="text-sm font-bold text-slate-900 dark:text-[#fde8d7]">
                Question Navigator
              </span>
              <button
                onClick={() => setPaletteOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-[#a8876e] hover:bg-slate-100 dark:hover:bg-[#2c2016]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPaletteGrid()}
          </div>
        </div>
      )}

      {/* 5. SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#221810] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#443224] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-peach-50 dark:bg-[#332014] text-peach-600 dark:text-peach-400 mx-auto flex items-center justify-center border border-peach-200 dark:border-[#523321]">
              <Send className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-[#fde8d7]">
                {t('dialog_submit_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#d9b89f]">
                {t('dialog_submit_desc')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#281d14] border border-slate-200/50 dark:border-[#38281d] text-xs">
              <div>
                <span className="text-slate-500 dark:text-[#a8876e]">Answered:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">{answeredCount}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-[#a8876e]">Unanswered:</span>
                <span className="font-bold text-rose-500 dark:text-rose-400 ml-1.5">{unansweredCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-[#2d2114] border border-amber-200 dark:border-[#4d3a20] text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>You have {unansweredCount} unanswered questions remaining.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-[#443224] text-xs font-semibold text-slate-700 dark:text-[#d9b89f] hover:bg-slate-100 dark:hover:bg-[#2c2016] transition-colors cursor-pointer"
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

      {/* 6. QUIT TEST MODAL */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#221810] w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#443224] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-[#381518] text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-200 dark:border-[#542125]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#fde8d7]">
                {t('dialog_quit_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#d9b89f]">
                {t('dialog_quit_desc')}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-[#443224] text-xs font-semibold text-slate-700 dark:text-[#d9b89f] hover:bg-slate-100 dark:hover:bg-[#2c2016] cursor-pointer"
              >
                {t('btn_stay')}
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('active_test');
                  if (test) {
                    sessionStorage.removeItem(`active_test_answers_${test.testId}`);
                    sessionStorage.removeItem(`active_test_time_${test.testId}`);
                  }
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
