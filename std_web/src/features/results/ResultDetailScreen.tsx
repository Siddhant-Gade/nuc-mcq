import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  XCircle,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../context/LanguageContext';
import { QuestionModel, TestResultModel } from '../../types';
import { resultsService } from '../../services/resultsService';
import { questionBankService } from '../../services/questionBankService';
import { bookmarksService } from '../../services/bookmarksService';
import { testGeneratorService } from '../../services/testGeneratorService';

export const ResultDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [result, setResult] = useState<TestResultModel | null>(null);
  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong'>('all');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await questionBankService.loadQuestions();

      // Check session storage first
      const rawSession = sessionStorage.getItem('view_result');
      let found: TestResultModel | null = null;
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession);
          if (parsed.clientEventId === id || parsed.testId === id) {
            found = parsed;
          }
        } catch {
          // Ignore
        }
      }

      if (!found && id) {
        const all = await resultsService.getAllResults();
        found = all.find((r) => r.clientEventId === id || r.testId === id) || null;
      }

      if (isMounted && found) {
        setResult(found);
        // Load actual QuestionModels for review
        const qList: QuestionModel[] = [];
        const qIds = Object.keys(found.studentAnswers);
        for (const qId of qIds) {
          const q = questionBankService.getQuestionById(qId);
          if (q) qList.push(q);
        }
        setQuestions(qList);

        // If passed, celebrate!
        const pct = found.totalQuestions > 0 ? (found.score / found.totalQuestions) * 100 : 0;
        if (pct >= 50) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!result) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-slate-500">Test result not found.</p>
        <button
          onClick={() => navigate('/results')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
        >
          View Results History
        </button>
      </div>
    );
  }

  const pct = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
  const isPass = pct >= 50;
  const displaySubject = resultsService.getDisplaySubject(result, language);

  const filteredQuestions =
    filterMode === 'wrong'
      ? questions.filter((q) => result.wrongQuestionIds.includes(q.id))
      : questions;

  const handleRetake = () => {
    if (questions.length > 0) {
      const newTest = testGeneratorService.generateCustomPracticeTest(questions);
      sessionStorage.setItem('active_test', JSON.stringify(newTest));
      navigate('/test/active');
    } else {
      navigate('/tests');
    }
  };

  const minutes = Math.floor((result.timeTakenSeconds || 0) / 60);
  const seconds = (result.timeTakenSeconds || 0) % 60;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Back button */}
      <button
        onClick={() => navigate('/results')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Results</span>
      </button>

      {/* Score Hero Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden ${
          isPass
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : 'bg-gradient-to-r from-rose-600 to-amber-700'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase backdrop-blur-md">
              {isPass ? t('score_passed') : t('score_needs_practice')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">{displaySubject}</h1>
            <p className="text-white/80 text-xs sm:text-sm">
              Completed on {new Date(result.completedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-28 h-28 rounded-full border-4 border-white/40 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md shadow-inner">
              <span className="text-3xl font-black">{pct.toFixed(0)}%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Score
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-medium">{t('metric_correct')}</span>
          <div className="text-xl font-black text-emerald-600 mt-1">{result.correctCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-medium">{t('metric_wrong')}</span>
          <div className="text-xl font-black text-rose-500 mt-1">{result.wrongCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-medium">{t('metric_duration')}</span>
          <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {minutes}m {seconds}s
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-medium">XP Earned</span>
          <div className="text-xl font-black text-amber-500 mt-1">
            +{result.correctCount * 10 + (isPass ? 50 : 0)} XP
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('review_all_questions')} ({questions.length})
          </button>
          <button
            onClick={() => setFilterMode('wrong')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterMode === 'wrong'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('review_wrong_only')} ({result.wrongCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRetake}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('btn_retake')}</span>
          </button>

          <button
            onClick={() => navigate('/results/summary')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('analytics_title')}</span>
          </button>
        </div>
      </div>

      {/* Question Breakdown List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Question Review</h3>

        {filteredQuestions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-xs">
            {filterMode === 'wrong'
              ? 'Awesome! You got every question right on this test.'
              : 'Detailed question texts were stored offline.'}
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const studentChoice = result.studentAnswers[q.id];
            const isCorrect = studentChoice === q.correctOptionIndex;

            const qText =
              language === 'mr' && q.questionTextMr?.trim()
                ? q.questionTextMr.trim()
                : language === 'hi' && q.questionTextHi?.trim()
                ? q.questionTextHi.trim()
                : q.questionText;

            const options = (() => {
              const loc = language === 'mr' ? q.optionsMr : language === 'hi' ? q.optionsHi : null;
              if (loc && loc.length === q.options.length && loc.some((o) => o.trim().length > 0)) {
                return q.options.map((opt, i) => (loc[i]?.trim() ? loc[i].trim() : opt));
              }
              return q.options;
            })();

            const explanation =
              language === 'mr' && q.explanationMr?.trim()
                ? q.explanationMr.trim()
                : language === 'hi' && q.explanationHi?.trim()
                ? q.explanationHi.trim()
                : q.explanation;

            return (
              <div
                key={q.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-950/80'
                    : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-950/80'
                } shadow-sm space-y-4`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">Question #{idx + 1}</span>
                  </div>

                  <button
                    onClick={() => bookmarksService.toggleBookmark(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Bookmark"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        bookmarksService.isBookmarked(q.id) ? 'fill-current text-amber-500' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Question */}
                <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                  {qText}
                </p>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {options.map((opt, oIdx) => {
                    const isSelected = studentChoice === oIdx;
                    const isOfficialCorrect = q.correctOptionIndex === oIdx;

                    let optBg = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                    if (isOfficialCorrect) {
                      optBg = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                    } else if (isSelected && !isOfficialCorrect) {
                      optBg = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
                    }

                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 ${optBg}`}
                      >
                        <span className="w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center bg-black/5 dark:bg-white/10 shrink-0">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isOfficialCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isSelected && !isOfficialCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {explanation && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Explanation
                    </span>
                    <p className="leading-relaxed opacity-90">{explanation}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
