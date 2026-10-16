import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PerformanceAnalyticsData, TestResultModel } from '../../types';
import { resultsService } from '../../services/resultsService';
import { analyticsService } from '../../services/analyticsService';

export const PerformanceSummaryScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<PerformanceAnalyticsData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const updateAnalytics = (results: TestResultModel[]) => {
      if (isMounted) {
        setAnalytics(analyticsService.computeAnalytics(results, language));
      }
    };

    // 1. Compute immediately with cached records
    void resultsService.getAllResults().then((results) => updateAnalytics(results));

    // 2. Subscribe to reactive updates
    const unsubscribe = resultsService.subscribe((results) => {
      updateAnalytics(results);
    });

    // 3. Trigger cloud sync
    void resultsService.syncFromBackend();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [language]);

  if (!analytics || analytics.isEmpty) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12 text-center animate-fade-in">
        <button
          onClick={() => navigate('/results')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </button>

        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No Performance Data Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Take at least 1 mock exam or practice test to unlock your subject accuracy breakdown, score charts, and progress trends.
          </p>
          <button
            onClick={() => navigate('/tests')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            Start Your First Test
          </button>
        </div>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = analytics.chronologicalAttempts.map((r, i) => {
    const pct = r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0;
    return {
      attempt: `#${i + 1}`,
      score: Math.round(pct),
      subject: resultsService.getDisplaySubject(r, language),
      date: new Date(r.completedAt).toLocaleDateString(),
    };
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/results')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Results</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('analytics_title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('analytics_subtitle')}
          </p>
        </div>
      </div>

      {/* Improvement Trend Banner */}
      {analytics.trendDescription && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center gap-3 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm font-semibold shadow-sm">
          <Sparkles className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{analytics.trendDescription}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('tests_completed')}</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {analytics.totalTests}
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            {analytics.examCount} Exams • {analytics.practiceCount} Practice
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('average_score')}</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {analytics.averageScore.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            Best: {analytics.bestScore.toFixed(0)}%
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('pass_rate')}</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.passRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Passing Criteria: 50%</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">{t('accuracy')}</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {analytics.overallAccuracy.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            {analytics.totalCorrect}/{analytics.totalQuestionsAnswered} Correct
          </span>
        </div>
      </div>

      {/* Score Progression Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('trend_title')}
            </h3>
            <p className="text-xs text-slate-500">
              Chronological test scores over time
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            {chartData.length} Attempts Tracked
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="attempt" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 text-white text-xs shadow-xl space-y-1">
                        <div className="font-bold text-indigo-400">{data.subject}</div>
                        <div>Score: {data.score}%</div>
                        <div className="text-slate-400 text-[10px]">{data.date}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strongest & Weakest Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analytics.strongestSubject && (
          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {t('strongest_subject')}
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {analytics.strongestSubject.subjectName}
              </div>
              <div className="text-xs text-slate-500">
                {analytics.strongestSubject.accuracy.toFixed(0)}% Accuracy • {analytics.strongestSubject.testCount} Tests
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {analytics.strongestSubject.averageScore.toFixed(0)}%
            </div>
          </div>
        )}

        {analytics.weakestSubject && (
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t('weakest_subject')}
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {analytics.weakestSubject.subjectName}
              </div>
              <div className="text-xs text-slate-500">
                {analytics.weakestSubject.accuracy.toFixed(0)}% Accuracy • {analytics.weakestSubject.testCount} Tests
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {analytics.weakestSubject.averageScore.toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* Subject-wise Performance Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('subject_performance')}
        </h3>

        <div className="space-y-3">
          {analytics.subjectMetrics.map((metric) => (
            <div
              key={metric.subjectName}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {metric.subjectName}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {metric.testCount} Tests • {metric.correctCount}/{metric.answeredCount} Questions
                    Correct ({metric.accuracy.toFixed(1)}% Accuracy)
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      metric.isPassed
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    }`}
                  >
                    {metric.isPassed ? 'Pass' : 'Needs Practice'}
                  </span>
                  <div className="text-right min-w-[50px]">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {metric.averageScore.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metric.isPassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(metric.averageScore, 5), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
