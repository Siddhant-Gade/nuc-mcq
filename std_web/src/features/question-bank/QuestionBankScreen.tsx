import React, { useState, useEffect } from 'react';
import {
  Search,
  Bookmark,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QuestionModel, QuestionTopicCode, TOPIC_CONFIG } from '../../types';
import { questionBankService } from '../../services/questionBankService';
import { bookmarksService } from '../../services/bookmarksService';

export const QuestionBankScreen: React.FC = () => {
  const { language, t } = useLanguage();

  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});
  // Task 3: track which questions have answer revealed (hidden by default)
  const [shownAnswers, setShownAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const all = await questionBankService.loadQuestions();
      if (isMounted) {
        setQuestions(all);
        setBookmarkedSet(bookmarksService.getBookmarkedIds());
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleBookmark = (id: string) => {
    bookmarksService.toggleBookmark(id);
    setBookmarkedSet(bookmarksService.getBookmarkedIds());
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanation((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleShowAnswer = (id: string) => {
    setShownAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const allTopicKeys = Object.keys(TOPIC_CONFIG) as QuestionTopicCode[];

  const filtered = questions.filter((q) => {
    if (selectedTopic !== 'ALL' && q.topic !== selectedTopic) {
      return false;
    }
    if (searchQuery.trim()) {
      const qText = q.questionText.toLowerCase();
      const query = searchQuery.toLowerCase();
      const inOptions = q.options.some((o) => o.toLowerCase().includes(query));
      return qText.includes(query) || inOptions;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('tab_question_bank')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore and search the complete repository of {questions.length} GCC-TBC MS-CIT questions.
        </p>
      </div>

      {/* Search Input & Topic Filter Pills */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by keyword or topic..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Topic Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedTopic('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedTopic === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            All Topics ({questions.length})
          </button>
          {allTopicKeys.map((key) => {
            const topic = TOPIC_CONFIG[key];
            const title =
              language === 'mr' ? topic.labelMr : language === 'hi' ? topic.labelHi : topic.label;
            const count = questions.filter((q) => q.topic === key).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedTopic(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTopic === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {title} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Counter */}
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Showing {filtered.length} Questions
      </div>

      {/* Questions List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No matching questions found
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or topic filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.slice(0, 100).map((q, idx) => {
            const isBookmarked = bookmarkedSet.has(q.id);
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

            // Task 3: whether the answer is currently visible for this question
            const answerVisible = shownAnswers[q.id] === true;

            return (
              <div
                key={q.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-label={`Question ${idx + 1}`}
                      className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-2 text-base font-black text-white shadow-sm"
                    >
                      {idx + 1}
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {topicTitle}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Question {idx + 1}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isBookmarked ? 'fill-current text-amber-500' : ''}`}
                    />
                  </button>
                </div>

                {/* Question */}
                <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                  {qText}
                </p>

                {/* Options List — correct answer highlighted only when answerVisible */}
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

                {/* Task 3: Show/Hide Answer toggle */}
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

                  {/* Explanation toggle — only accessible after revealing answer */}
                  {answerVisible && (
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

                {expandedExplanation[q.id] && answerVisible && (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 animate-fade-in leading-relaxed">
                    {explanation}
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
