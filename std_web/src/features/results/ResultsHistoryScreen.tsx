import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  RefreshCw,
  TrendingUp,
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#fde8d7]">
            {t('tab_results')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#d9b89f] mt-1">
            Complete archive of your MS-CIT tests with cloud synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#443224] bg-white dark:bg-[#221810] text-slate-700 dark:text-[#d9b89f] hover:bg-slate-50 dark:hover:bg-[#2c2016] font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : t('btn_sync_now')}</span>
          </button>

          <button
            onClick={() => navigate('/results/summary')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-peach-600 hover:bg-peach-700 text-white font-bold text-xs shadow-md shadow-peach-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('analytics_title')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-[#a8876e] font-medium">{t('tests_completed')}</span>
          <div className="text-2xl font-black text-slate-900 dark:text-[#fde8d7] mt-1">
            {totalTests}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-[#a8876e] font-medium">{t('average_score')}</span>
          <div className="text-2xl font-black text-peach-600 dark:text-peach-400 mt-1">
            {avgScore.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-[#a8876e] font-medium">{t('pass_rate')}</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {passRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filter Tabs (Horizontal touch scroll on mobile) */}
      <div className="w-full overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#2c2016] w-fit text-xs font-semibold border border-slate-200/50 dark:border-[#443224]">
          <button
            onClick={() => setFilter('ALL')}
            className={`py-1.5 px-3 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white dark:bg-[#19120c] text-peach-700 dark:text-[#fde8d7] shadow-xs'
                : 'text-slate-600 dark:text-[#a8876e] hover:text-slate-900 dark:hover:text-[#fde8d7]'
            }`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => setFilter('EXAM')}
            className={`py-1.5 px-3 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === 'EXAM'
                ? 'bg-white dark:bg-[#19120c] text-peach-700 dark:text-[#fde8d7] shadow-xs'
                : 'text-slate-600 dark:text-[#a8876e] hover:text-slate-900 dark:hover:text-[#fde8d7]'
            }`}
          >
            Official Exams ({results.filter((r) => r.testMode === 'EXAM').length})
          </button>
          <button
            onClick={() => setFilter('PRACTICE')}
            className={`py-1.5 px-3 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === 'PRACTICE'
                ? 'bg-white dark:bg-[#19120c] text-peach-700 dark:text-[#fde8d7] shadow-xs'
                : 'text-slate-600 dark:text-[#a8876e] hover:text-slate-900 dark:hover:text-[#fde8d7]'
            }`}
          >
            Practice Tests ({results.filter((r) => r.testMode === 'PRACTICE').length})
          </button>
        </div>
      </div>

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] text-center space-y-3">
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-[#443224] mx-auto" />
          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-[#fde8d7]">
            No test records found
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#a8876e] max-w-sm mx-auto">
            You haven't completed any tests matching this filter yet.
          </p>
          <button
            onClick={() => navigate('/tests')}
            className="px-4 py-2 rounded-xl bg-peach-600 hover:bg-peach-700 text-white font-bold text-xs transition-colors cursor-pointer"
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
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] hover:border-peach-400 dark:hover:border-peach-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer group shadow-xs active:scale-[0.99] touch-manipulation"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#fde8d7] group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors truncate">
                      {subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        isPass
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-[#18291c] dark:text-emerald-400 border-emerald-200 dark:border-[#27442d]'
                          : 'bg-rose-50 text-rose-700 dark:bg-[#2d171a] dark:text-rose-400 border-rose-200 dark:border-[#4d2328]'
                      }`}
                    >
                      {isPass ? 'PASSED' : 'PRACTICE'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-[#2c2016] text-slate-600 dark:text-[#d9b89f] uppercase border border-slate-200/50 dark:border-[#443224]">
                      {r.testMode}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 dark:text-[#a8876e] font-mono">
                    <span>
                      {r.score}/{r.totalQuestions} Correct
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

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#33251a]">
                  <span className="text-xs text-slate-400 dark:text-[#a8876e] sm:hidden font-medium">Final Score</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-lg sm:text-xl font-black ${
                        isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {Math.round(pct)}%
                    </div>
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
