import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Trash2, CheckCircle2, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QuestionModel, TOPIC_CONFIG } from '../../types';
import { questionBankService } from '../../services/questionBankService';
import { bookmarksService } from '../../services/bookmarksService';
import { testGeneratorService } from '../../services/testGeneratorService';

export const BookmarksScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<QuestionModel[]>([]);
  // Task 3 consistency: hide correct answer by default in bookmarks screen too
  const [shownAnswers, setShownAnswers] = useState<Record<string, boolean>>({});
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});

  const loadBookmarks = async () => {
    await questionBankService.loadQuestions();
    const ids = bookmarksService.getBookmarkedIds();
    const list: QuestionModel[] = [];
    for (const id of ids) {
      const q = questionBankService.getQuestionById(id);
      if (q) list.push(q);
    }
    setBookmarkedQuestions(list);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemoveBookmark = (id: string) => {
    bookmarksService.toggleBookmark(id);
    setBookmarkedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleStartPractice = () => {
    if (bookmarkedQuestions.length === 0) return;
    const test = testGeneratorService.generateCustomPracticeTest(bookmarkedQuestions);
    sessionStorage.setItem('active_test', JSON.stringify(test));
    navigate('/test/active');
  };

  const toggleShowAnswer = (id: string) => {
    setShownAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanation((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('tab_bookmarks')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Questions saved for revision and targeted practice.
          </p>
        </div>

        {bookmarkedQuestions.length > 0 && (
          <button
            onClick={handleStartPractice}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Practice Bookmarked ({bookmarkedQuestions.length}Q)</span>
          </button>
        )}
      </div>

      {/* Task 1: Inform user that bookmarks are saved on this device */}
      {bookmarkedQuestions.length > 0 && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 font-medium">
          📌 Bookmarks are saved on this device. They are not synced across other devices or the mobile app.
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarkedQuestions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No bookmarked questions yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You can bookmark any question while taking tests or exploring the question bank for later practice.
          </p>
          <button
            onClick={() => navigate('/question-bank')}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
          >
            Explore Question Bank
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarkedQuestions.map((q, idx) => {
            const topic = TOPIC_CONFIG[q.topic];
            const topicTitle =
              language === 'mr' ? topic.labelMr : language === 'hi' ? topic.labelHi : topic.label;

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

            const answerVisible = shownAnswers[q.id] === true;

            return (
              <div
                key={q.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      {topicTitle}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>
                  </div>

                  <button
                    onClick={() => handleRemoveBookmark(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove from bookmarks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                  {qText}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {options.map((opt, oIdx) => {
                    const isCorrect = oIdx === q.correctOptionIndex;
                    const highlightCorrect = answerVisible && isCorrect;
                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                          highlightCorrect
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center bg-black/5 dark:bg-white/10 shrink-0">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {highlightCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Show/Hide Answer toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => toggleShowAnswer(q.id)}
                    className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      answerVisible
                        ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                        : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                    }`}
                  >
                    {answerVisible ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Answer</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Answer</span>
                      </>
                    )}
                  </button>

                  {answerVisible && explanation && (
                    <button
                      onClick={() => toggleExplanation(q.id)}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>
                        {expandedExplanation[q.id] ? 'Hide Explanation' : 'View Explanation'}
                      </span>
                    </button>
                  )}
                </div>

                {expandedExplanation[q.id] && answerVisible && explanation && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1 animate-fade-in">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Explanation
                    </span>
                    <p className="leading-relaxed opacity-90">{explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
