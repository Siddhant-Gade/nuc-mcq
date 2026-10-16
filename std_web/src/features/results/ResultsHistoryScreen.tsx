import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  CloudOff,
  Clock,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { TestMode, TestResultModel } from '../../types';
import { resultsService } from '../../services/resultsService';

export const ResultsHistoryScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [results, setResults] = useState<TestResultModel[]>([]);
  const [filter, setFilter] = useState<'ALL' | TestMode>('ALL');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // 1. Load cached results immediately
    void resultsService.getAllResults().then((list) => setResults(list));

    // 2. Subscribe to any background or cross-page updates
    const unsubscribe = resultsService.subscribe((updatedList) => {
      setResults(updatedList);
    });

    // 3. Trigger cloud sync automatically on screen mount
    setSyncing(true);
    resultsService
      .syncFromBackend()
      .catch(() => {})
      .finally(() => setSyncing(false));

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const updated = await resultsService.syncFromBackend(true);
      setResults(updated);
    } catch {
      // Ignore
    } finally {
      setSyncing(false);
    }
  };

  const filtered =
    filter === 'ALL' ? results : results.filter((r) => r.testMode === filter);

  const totalTests = results.length;
  const passCount = results.filter((r) => r.totalQuestions > 0 && r.score / r.totalQuestions >= 0.5).length;
  const passRate = totalTests > 0 ? (passCount / totalTests) * 100 : 0;
  const totalScore = results.reduce(
    (sum, r) => sum + (r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0),
    0
  );
  const avgScore = totalTests > 0 ? totalScore / totalTests : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('tab_results')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete archive of your MS-CIT tests with cloud synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : t('btn_sync_now')}</span>
          </button>

          <button
            onClick={() => navigate('/results/summary')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('analytics_title')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('tests_completed')}</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalTests}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('average_score')}</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {avgScore.toFixed(1)}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('pass_rate')}</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {passRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit text-xs font-semibold">
        <button
          onClick={() => setFilter('ALL')}
          className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All ({results.length})
        </button>
        <button
          onClick={() => setFilter('EXAM')}
          className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
            filter === 'EXAM'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Official Exams ({results.filter((r) => r.testMode === 'EXAM').length})
        </button>
        <button
          onClick={() => setFilter('PRACTICE')}
          className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
            filter === 'PRACTICE'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Practice Tests ({results.filter((r) => r.testMode === 'PRACTICE').length})
        </button>
      </div>

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No test records found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't completed any tests matching this filter yet.
          </p>
          <button
            onClick={() => navigate('/tests')}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            Take a Test Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const pct = r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0;
            const isPass = pct >= 50;
            const subject = resultsService.getDisplaySubject(r, language);

            return (
              <div
                key={r.clientEventId}
                onClick={() => {
                  sessionStorage.setItem('view_result', JSON.stringify(r));
                  navigate(`/results/${r.clientEventId}`);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isPass
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {isPass ? 'PASSED' : 'NEEDS PRACTICE'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {r.testMode}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>
                      {r.score}/{r.totalQuestions} Questions Correct
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                    </span>
                    <span>•</span>
                    <span>{new Date(r.completedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  {/* Sync status icon */}
                  <div title={r.syncStatus} className="text-xs">
                    {r.syncStatus === 'SYNCED' ? (
                      <Cloud className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <CloudOff className="w-4 h-4 text-amber-500" />
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xl font-black ${
                        isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline flex items-center gap-1 justify-end">
                      Review <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
