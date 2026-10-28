import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  TrendingUp,
  Bell,
  FileText,
  Calendar,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  StudentStats,
  TestResultModel,
  Broadcast,
  LeaderboardEntry,
} from '../../types';
import { resultsService } from '../../services/resultsService';
import { analyticsService } from '../../services/analyticsService';
import { broadcastsService } from '../../services/broadcastsService';
import { questionBankService } from '../../services/questionBankService';
import { testGeneratorService } from '../../services/testGeneratorService';

export const DashboardTab: React.FC = () => {
  const { identity } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // State
  const [allResults, setAllResults] = useState<TestResultModel[]>([]);
  const [stats, setStats] = useState<StudentStats>(() => resultsService.getStudentStats());
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [summaryMode, setSummaryMode] = useState<'overall' | 'recent'>('overall');
  const [rightTab, setRightTab] = useState<'notices' | 'leaderboard'>('notices');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // Load and subscribe to real data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await questionBankService.loadQuestions();
      const results = await resultsService.getAllResults();
      if (isMounted) {
        setAllResults(results);
        setStats(resultsService.getStudentStats());
      }

      // Sync backend in background
      resultsService.syncFromBackend().catch(() => {
        // Ignore offline sync errors
      });

      // Load announcements
      try {
        const published = await broadcastsService.fetchPublished();
        if (isMounted) setBroadcasts(published.slice(0, 4));
      } catch {
        // Ignore
      }

      // Load real student leaderboard from database
      try {
        setIsLeaderboardLoading(true);
        const lb = await resultsService.getLeaderboard();
        if (isMounted && Array.isArray(lb)) {
          setLeaderboard(lb);
        }
      } catch (err) {
        console.warn('Failed to load leaderboard', err);
      } finally {
        if (isMounted) {
          setIsLeaderboardLoading(false);
        }
      }
    };

    loadData();

    // Subscribe to reactive result updates
    const unsubscribe = resultsService.subscribe((updated) => {
      if (isMounted) {
        setAllResults(updated);
        setStats(resultsService.getStudentStats());
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    return analyticsService.computeAnalytics(allResults, language);
  }, [allResults, language]);

  // Last 5 test scores average
  const last5Average = useMemo(() => {
    if (allResults.length === 0) return 0;
    const recent = allResults.slice(0, 5);
    const sum = recent.reduce((acc, curr) => {
      const pct = curr.totalQuestions > 0 ? (curr.score / curr.totalQuestions) * 100 : 0;
      return acc + pct;
    }, 0);
    return Math.round(sum / recent.length);
  }, [allResults]);

  // Question Summary Data
  const questionSummary = useMemo(() => {
    const list = summaryMode === 'overall' ? allResults : allResults.slice(0, 5);

    let total = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    list.forEach((r) => {
      total += r.totalQuestions || 0;
      correct += r.score || 0;
      wrong += r.wrongCount || 0;
      const unattempted = Math.max(0, (r.totalQuestions || 0) - (r.correctCount || 0) - (r.wrongCount || 0));
      skipped += unattempted;
    });

    if (total === 0 && allResults.length === 0) {
      return {
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        correctPct: 0,
        wrongPct: 0,
        skippedPct: 0,
        pieData: [
          { name: 'No Data', value: 1, color: '#443224' },
        ],
      };
    }

    const calculatedWrong = total > correct ? Math.max(0, total - correct - skipped) : 0;
    const finalWrong = wrong > 0 ? wrong : calculatedWrong;

    const correctPct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const wrongPct = total > 0 ? Math.round((finalWrong / total) * 100) : 0;
    const skippedPct = total > 0 ? Math.round((skipped / total) * 100) : 0;

    return {
      total,
      correct,
      wrong: finalWrong,
      skipped,
      correctPct,
      wrongPct,
      skippedPct,
      pieData: [
        { name: 'Correct', value: correct > 0 ? correct : (total === 0 ? 1 : 0), color: '#f57e3d' },
        { name: 'Wrong', value: finalWrong, color: '#f87171' },
        { name: 'Skipped', value: skipped, color: '#a8876e' },
      ],
    };
  }, [allResults, summaryMode]);

  // Recent 4 Exams for the Table
  const recentExams = useMemo(() => {
    return allResults.slice(0, 4);
  }, [allResults]);

  // Real Top Performers
  const displayedLeaderboard = useMemo(() => {
    if (leaderboard.length > 0) {
      return leaderboard;
    }
    if (identity?.name) {
      const studentScore = stats.averageScore || 0;
      return [
        {
          rank: 1,
          badge: '🥇',
          studentProfileId: identity?.studentId || 'current',
          name: identity.name,
          studentId: identity?.studentId || '',
          initial: (identity.name || 'S').trim().charAt(0).toUpperCase(),
          score: Math.round(studentScore),
          accuracy: studentScore,
          totalTests: stats.totalTests || 0,
          batchName: identity?.batchName || '',
          isCurrent: true,
        },
      ];
    }
    return [];
  }, [leaderboard, identity, stats]);

  const handleStartMockExam = () => {
    const test = testGeneratorService.generateExamTest();
    sessionStorage.setItem('active_test', JSON.stringify(test));
    navigate('/test/active');
  };

  const studentName = identity?.name
    ? identity.name.trim().split(' ')[0]
    : identity?.email
    ? identity.email.split('@')[0]
    : 'Student';

  const welcomeGreeting =
    language === 'mr'
      ? `नमस्कार, ${studentName}`
      : language === 'hi'
      ? `नमस्ते, ${studentName}`
      : `Hi, ${studentName}`;

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade-in pb-4">
      {/* ========================================================= */}
      {/* 1. DASHBOARD HEADER AREA                                  */}
      {/* ========================================================= */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#fde8d7] tracking-tight flex items-center gap-2">
          <span>{welcomeGreeting}</span>
          <span className="text-2xl sm:text-3xl select-none">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#d9b89f]">
          {language === 'mr'
            ? 'तुमची प्रगती आणि एमएस-सीआयटी सराव चाचण्यांचा आढावा घ्या.'
            : language === 'hi'
            ? 'अपनी प्रगति और एमएस-सीआईटी अभ्यास परीक्षाओं का विवरण देखें।'
            : 'Welcome back! Track your progress and practice tests.'}
        </p>
      </div>

      {/* ========================================================= */}
      {/* 2. TOP METRICS STRIP                                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Featured Assessment Action (Peach Primary Accent) */}
        <div className="rounded-2xl bg-gradient-to-br from-peach-600 to-peach-700 text-white p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[145px] sm:min-h-[160px] border border-peach-500/80">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-peach-100">
              Exam Performance
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1.5 sm:mt-2">
              {last5Average > 0 ? `${last5Average}%` : stats.totalTests > 0 ? `${Math.round(stats.averageScore)}%` : '—'}
            </div>
            <p className="text-[11px] sm:text-xs text-peach-100/90 mt-1">
              {last5Average > 0
                ? 'Recent 5 exams average'
                : stats.totalTests > 0
                ? 'Average score to date'
                : 'No exam attempts recorded yet'}
            </p>
          </div>

          <div className="mt-3 sm:mt-4">
            <button
              onClick={handleStartMockExam}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-peach-800 text-xs font-bold hover:bg-peach-50 transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <span>Take Mock Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Overall Accuracy */}
        <div className="rounded-2xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] p-4 sm:p-5 flex flex-col justify-between shadow-xs min-h-[145px] sm:min-h-[160px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a8876e]">
              Overall Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-peach-50 dark:bg-[#2c2016] text-peach-600 dark:text-[#ffbc8c] flex items-center justify-center border border-peach-100 dark:border-[#443224]">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#fde8d7] tracking-tight my-1">
            {analytics.overallAccuracy > 0
              ? `${Math.round(analytics.overallAccuracy)}%`
              : '—'}
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-[#d9b89f] truncate">
            {analytics.weakestSubject ? (
              <span>Focus area: {analytics.weakestSubject.subjectName}</span>
            ) : analytics.strongestSubject ? (
              <span>Strongest: {analytics.strongestSubject.subjectName}</span>
            ) : (
              <span>Calculated across completed tests</span>
            )}
          </div>
        </div>

        {/* Card 3: Tests Completed */}
        <div className="rounded-2xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] p-4 sm:p-5 flex flex-col justify-between shadow-xs min-h-[145px] sm:min-h-[160px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a8876e]">
              Completed Tests
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-[#1a2e1d] text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#fde8d7] tracking-tight my-1">
            {stats.totalTests}
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-[#d9b89f] truncate">
            {stats.totalTests > 0
              ? `${stats.passCount} passed (${Math.round(stats.passRate)}% pass rate)`
              : 'Start tests to build your record'}
          </div>
        </div>

        {/* Card 4: Learning Continuity & Level */}
        <div className="rounded-2xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] p-4 sm:p-5 flex flex-col justify-between shadow-xs min-h-[145px] sm:min-h-[160px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a8876e]">
              Active Streak
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-[#2e2416] text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#fde8d7] tracking-tight my-1">
            {stats.currentStreak} <span className="text-sm sm:text-base font-normal text-slate-400 dark:text-[#a8876e]">days</span>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-[#d9b89f] truncate">
            Level {stats.level || 1} • {stats.levelTitle}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MIDDLE ROW: Recent Exams Result + Question Summary     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column: Recent Exams Result (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#fde8d7]">
              Recent Exams Result
            </h2>
            <button
              onClick={() => navigate('/results')}
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#443224] text-xs font-semibold text-slate-600 dark:text-[#d9b89f] hover:bg-slate-50 dark:hover:bg-[#2a1f16] transition-colors cursor-pointer"
            >
              See More
            </button>
          </div>

          {recentExams.length === 0 ? (
            <div className="text-center py-8 sm:py-10 px-4">
              <FileText className="w-10 h-10 text-slate-300 dark:text-[#443224] mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-[#d9b89f]">
                No exams completed yet
              </p>
              <p className="text-xs text-slate-500 dark:text-[#a8876e] max-w-sm mx-auto mt-1 mb-4">
                Take your first MS-CIT mock test to view detailed performance metrics.
              </p>
              <button
                onClick={handleStartMockExam}
                className="px-4 py-2 rounded-xl bg-peach-600 text-white text-xs font-bold hover:bg-peach-700 transition-colors cursor-pointer shadow-xs"
              >
                Start First Exam
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card List (Hidden on sm and larger) */}
              <div className="block sm:hidden space-y-2.5">
                {recentExams.map((result, idx) => {
                  const pct =
                    result.totalQuestions > 0
                      ? Math.round((result.score / result.totalQuestions) * 100)
                      : 0;
                  const isPass = pct >= 50;
                  const dateStr = result.completedAt
                    ? new Date(result.completedAt).toLocaleDateString('en-GB')
                    : 'N/A';
                  const displayName = resultsService.getDisplaySubject(result, language);
                  const resultKey = result.clientEventId || result.testId || `result-${idx}`;

                  return (
                    <div
                      key={resultKey}
                      onClick={() => {
                        sessionStorage.setItem('view_result', JSON.stringify(result));
                        navigate(`/results/${resultKey}`);
                      }}
                      className="p-3.5 rounded-xl border border-slate-200/70 dark:border-[#38281d] bg-slate-50/50 dark:bg-[#281d14] flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-[#fde8d7] truncate">
                          {displayName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPass
                              ? 'bg-emerald-50 dark:bg-[#18291c] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-[#27442d]'
                              : 'bg-rose-50 dark:bg-[#2a1719] text-rose-600 dark:text-rose-400 border-rose-200 dark:border-[#4d2328]'
                          }`}
                        >
                          {isPass ? 'Passed' : 'Practice'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#a8876e]">
                        <span>{dateStr} • {result.totalQuestions} Qs</span>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-[#fde8d7]">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Container (Hidden on mobile) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#33251a] text-xs font-bold text-slate-400 dark:text-[#a8876e] uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-semibold text-xs">Exam</th>
                      <th className="pb-3 px-3 font-semibold text-center text-xs">Questions</th>
                      <th className="pb-3 px-3 font-semibold text-center text-xs">Date Taken</th>
                      <th className="pb-3 px-3 font-semibold text-center text-xs">Status</th>
                      <th className="pb-3 px-3 font-semibold text-center text-xs">Duration</th>
                      <th className="pb-3 pl-4 font-semibold text-xs">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#33251a]/60 text-sm">
                    {recentExams.map((result, idx) => {
                      const pct =
                        result.totalQuestions > 0
                          ? Math.round((result.score / result.totalQuestions) * 100)
                          : 0;

                      const isPass = pct >= 50;

                      const dateStr = result.completedAt
                        ? new Date(result.completedAt).toLocaleDateString('en-GB')
                        : 'N/A';

                      const durationSec = result.timeTakenSeconds || 120;
                      const mins = Math.floor(durationSec / 60);
                      const secs = durationSec % 60;
                      const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                      const displayName = resultsService.getDisplaySubject(result, language);

                      const barColor =
                        pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

                      const resultKey = result.clientEventId || result.testId || `result-${idx}`;

                      return (
                        <tr
                          key={resultKey}
                          onClick={() => {
                            sessionStorage.setItem('view_result', JSON.stringify(result));
                            navigate(`/results/${resultKey}`);
                          }}
                          className="hover:bg-slate-50/80 dark:hover:bg-[#2b1e15] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 pr-4 font-semibold text-sm text-slate-900 dark:text-[#fde8d7] truncate max-w-[220px]">
                            {displayName}
                          </td>

                          <td className="py-3.5 px-3 text-center text-slate-600 dark:text-[#d9b89f] font-medium text-sm">
                            {result.totalQuestions}
                          </td>

                          <td className="py-3.5 px-3 text-center text-slate-500 dark:text-[#a8876e] font-medium text-sm">
                            {dateStr}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isPass
                                  ? 'bg-emerald-50 dark:bg-[#18291c] text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-[#27442d]'
                                  : 'bg-rose-50 dark:bg-[#2a1719] text-rose-700 dark:text-rose-400 border-rose-200 dark:border-[#4d2328]'
                              }`}
                            >
                              {isPass ? 'Passed' : 'Practice'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center text-slate-600 dark:text-[#d9b89f] font-medium text-sm">
                            {durationStr}
                          </td>

                          <td className="py-3.5 pl-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 sm:w-28 h-2.5 rounded-full bg-slate-100 dark:bg-[#19120c] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                  style={{ width: `${Math.max(pct, 4)}%` }}
                                />
                              </div>
                              <span className="font-bold text-sm text-slate-900 dark:text-[#fde8d7] min-w-[36px]">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Question Summary Donut Chart (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#fde8d7]">
              Question Summary
            </h2>

            {/* Overall / Recent Pill Toggle */}
            <div className="bg-slate-100 dark:bg-[#2c2016] p-0.5 rounded-full inline-flex border border-slate-200/60 dark:border-[#443224] text-xs">
              <button
                onClick={() => setSummaryMode('overall')}
                className={`px-2.5 sm:px-3 py-1 rounded-full font-semibold transition-all cursor-pointer text-[11px] sm:text-xs ${
                  summaryMode === 'overall'
                    ? 'bg-white dark:bg-[#19120c] text-slate-900 dark:text-[#fde8d7] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-[#fde8d7] dark:text-[#a8876e]'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setSummaryMode('recent')}
                className={`px-2.5 sm:px-3 py-1 rounded-full font-semibold transition-all cursor-pointer text-[11px] sm:text-xs ${
                  summaryMode === 'recent'
                    ? 'bg-white dark:bg-[#19120c] text-slate-900 dark:text-[#fde8d7] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-[#fde8d7] dark:text-[#a8876e]'
                }`}
              >
                Last 5
              </button>
            </div>
          </div>

          {/* Donut Chart with Center Total */}
          <div className="relative flex items-center justify-center h-44 sm:h-52 my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={questionSummary.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {questionSummary.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="rounded-xl bg-slate-900 dark:bg-[#19120c] border border-slate-700 dark:border-[#443224] text-white px-2.5 py-1.5 shadow-lg text-xs font-semibold">
                          {data.name}: {data.value}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#fde8d7] leading-tight">
                {questionSummary.total}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-[#a8876e] uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Legend Stats Breakdown */}
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-slate-100 dark:border-[#33251a] text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-peach-500 inline-block" />
                <span className="text-slate-600 dark:text-[#d9b89f] font-medium">Correct</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-[#fde8d7]">
                {questionSummary.correct}{' '}
                <span className="text-slate-400 dark:text-[#a8876e] font-normal">
                  ({questionSummary.correctPct}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                <span className="text-slate-600 dark:text-[#d9b89f] font-medium">Wrong</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-[#fde8d7]">
                {questionSummary.wrong}{' '}
                <span className="text-slate-400 dark:text-[#a8876e] font-normal">
                  ({questionSummary.wrongPct}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a8876e] inline-block" />
                <span className="text-slate-600 dark:text-[#d9b89f] font-medium">Skipped</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-[#fde8d7]">
                {questionSummary.skipped}{' '}
                <span className="text-slate-400 dark:text-[#a8876e] font-normal">
                  ({questionSummary.skippedPct}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. BOTTOM ROW: Notice Board & Announcements / Leaderboard  */}
      {/* ========================================================= */}
      <div className="w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200/80 dark:border-[#443224] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightTab('notices')}
                className={`text-sm sm:text-base font-bold pb-0.5 border-b-2 transition-colors cursor-pointer ${
                  rightTab === 'notices'
                    ? 'border-peach-500 text-slate-900 dark:text-[#fde8d7]'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-[#fde8d7] dark:text-[#a8876e]'
                }`}
              >
                Notice Board
              </button>
              <span className="text-slate-300 dark:text-[#443224]">|</span>
              <button
                onClick={() => setRightTab('leaderboard')}
                className={`text-sm sm:text-base font-bold pb-0.5 border-b-2 transition-colors cursor-pointer ${
                  rightTab === 'leaderboard'
                    ? 'border-peach-500 text-slate-900 dark:text-[#fde8d7]'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-[#fde8d7] dark:text-[#a8876e]'
                }`}
              >
                Top Performers
              </button>
            </div>

            <button
              onClick={() =>
                navigate(rightTab === 'notices' ? '/notices' : '/results')
              }
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#443224] text-xs font-semibold text-slate-600 dark:text-[#d9b89f] hover:bg-slate-50 dark:hover:bg-[#2a1f16] transition-colors cursor-pointer"
            >
              See More
            </button>
          </div>

          {/* TAB 1: Notice Board */}
          {rightTab === 'notices' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {broadcasts.length === 0 ? (
                <div className="col-span-full text-center py-6 sm:py-8 text-slate-400 dark:text-[#a8876e] text-xs">
                  <Bell className="w-8 h-8 text-slate-300 dark:text-[#443224] mx-auto mb-2" />
                  <span>No new announcements</span>
                </div>
              ) : (
                broadcasts.map((item) => {
                  const isUrgent = item.priority === 'URGENT';
                  const isHigh = item.priority === 'HIGH';
                  const dateStr = item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Today';

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate('/notices')}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-[#38281d] hover:border-peach-200 dark:hover:border-[#5a3f2d] bg-slate-50/50 dark:bg-[#281d14] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isUrgent
                              ? 'bg-red-100 text-red-600 dark:bg-[#3d171b] dark:text-red-300'
                              : isHigh
                              ? 'bg-amber-100 text-amber-600 dark:bg-[#3d2917] dark:text-amber-300'
                              : 'bg-peach-100 text-peach-700 dark:bg-[#3d2217] dark:text-peach-300'
                          }`}
                        >
                          {item.priority || 'NORMAL'}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-[#a8876e] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#fde8d7] line-clamp-1 group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#d9b89f] line-clamp-1 mt-0.5">
                        {item.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Top Performers */}
          {rightTab === 'leaderboard' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-[#a8876e] uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-[#33251a]">
                <span>Student</span>
                <span>Accuracy / Rank</span>
              </div>

              {isLeaderboardLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                  <div className="h-14 bg-slate-100 dark:bg-[#281d14] rounded-2xl animate-pulse" />
                  <div className="h-14 bg-slate-100 dark:bg-[#281d14] rounded-2xl animate-pulse" />
                </div>
              ) : displayedLeaderboard.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-slate-400 dark:text-[#a8876e] text-xs">
                  <Trophy className="w-8 h-8 text-slate-300 dark:text-[#443224] mx-auto mb-2" />
                  <span>No student rankings available yet</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedLeaderboard.map((student) => (
                    <div
                      key={student.studentProfileId || student.studentId || student.name}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${
                        student.isCurrent
                          ? 'bg-peach-50/70 dark:bg-[#2e1d13] border border-peach-200 dark:border-[#523321]'
                          : 'hover:bg-slate-50 dark:hover:bg-[#281d14]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{student.badge}</span>
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-[#382619] text-slate-700 dark:text-[#ffeedd] flex items-center justify-center font-bold text-sm">
                          {student.initial}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-[#fde8d7] flex items-center gap-1.5">
                            <span>{student.name}</span>
                            {student.isCurrent && (
                              <span className="text-[10px] font-semibold text-peach-700 dark:text-peach-300 bg-peach-100 dark:bg-[#472213] px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-[#a8876e] font-medium">
                            {student.score}% accuracy • {student.totalTests} {student.totalTests === 1 ? 'test' : 'tests'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-[#18291c] text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-[#27442d]">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{student.score > 0 ? `${student.score}%` : `#${student.rank}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#33251a] flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-[#a8876e]">
          <span>Institute Batch: {identity?.batchName || 'MS-CIT 2026'}</span>
          <span className="font-bold text-peach-600 dark:text-peach-400">
            {stats.levelTitle}
          </span>
        </div>
      </div>
    </div>
  );
};
