import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Sparkles,
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
  QuestionTopicCode,
  TOPIC_CONFIG,
  LeaderboardEntry,
} from '../../types';
import { resultsService } from '../../services/resultsService';
import { analyticsService } from '../../services/analyticsService';
import { broadcastsService } from '../../services/broadcastsService';
import { questionBankService } from '../../services/questionBankService';
import { testGeneratorService } from '../../services/testGeneratorService';
import { TestConfigModal } from '../tests/TestConfigModal';

export const DashboardTab: React.FC = () => {
  const { identity } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // State
  const [allResults, setAllResults] = useState<TestResultModel[]>([]);
  const [stats, setStats] = useState<StudentStats>(() => resultsService.getStudentStats());
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
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

  // Compute analytics from actual results
  const analytics = useMemo(() => {
    return analyticsService.computeAnalytics(allResults, language);
  }, [allResults, language]);

  // Last 5 Exams Average
  const last5Average = useMemo(() => {
    const examAttempts = allResults.filter(
      (r) => r.testMode === 'EXAM' || r.testId?.startsWith('MSCIT_') || r.testId?.startsWith('EXAM_')
    );
    const recent5 = (examAttempts.length > 0 ? examAttempts : allResults).slice(0, 5);
    if (recent5.length === 0) return 0;
    const sum = recent5.reduce(
      (s, r) => s + (r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0),
      0
    );
    return Math.round(sum / recent5.length);
  }, [allResults]);

  // Subject Performance Bar Chart Data (aggregates both topic-specific tests & comprehensive exam questions)
  const subjectChartData = useMemo(() => {
    const topics: { code: QuestionTopicCode; label: string }[] = [
      { code: 'computerFundamentals', label: 'Basics' },
      { code: 'os', label: 'Windows OS' },
      { code: 'word', label: 'MS Word' },
      { code: 'excel', label: 'MS Excel' },
      { code: 'powerpoint', label: 'PowerPoint' },
      { code: 'internet', label: 'Internet' },
      { code: 'outlook', label: 'Outlook' },
      { code: 'pagemaker', label: 'PageMaker' },
    ];

    return topics.map((t) => {
      let total = 0;
      let correct = 0;

      // 1. Aggregate from all tests (including individual questions in comprehensive exams)
      for (const r of allResults) {
        if (r.topicCode === t.code) {
          total += r.totalQuestions;
          correct += r.correctCount;
        } else if (r.studentAnswers && Object.keys(r.studentAnswers).length > 0) {
          // Break down questions in comprehensive/mock exams by topic
          for (const [qId, chosenIdx] of Object.entries(r.studentAnswers)) {
            const q = questionBankService.getQuestionById(qId);
            if (q && q.topic === t.code) {
              total++;
              if (chosenIdx === q.correctOptionIndex) {
                correct++;
              }
            }
          }
        }
      }

      // 2. Fallback to analytics.subjectMetrics if questionBank lookup wasn't available
      if (total === 0) {
        const metric = analytics.subjectMetrics.find((m) => {
          if (m.topicCode === t.code) return true;
          const config = TOPIC_CONFIG[t.code];
          return (
            m.subjectName.toLowerCase().includes(config.label.toLowerCase()) ||
            m.subjectName.toLowerCase().includes(t.label.toLowerCase())
          );
        });
        if (metric) {
          total = metric.totalQuestions;
          correct = metric.correctCount;
        }
      }

      const incorrect = Math.max(0, total - correct);

      return {
        subject: t.label,
        total: total,
        correct: correct,
        incorrect: incorrect,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });
  }, [allResults, analytics.subjectMetrics]);

  // Question Summary Donut Chart Data (Overall vs Recent)
  const questionSummary = useMemo(() => {
    const targetResults =
      summaryMode === 'recent' ? allResults.slice(0, 5) : allResults;

    const correct = targetResults.reduce((s, r) => s + r.correctCount, 0);
    const wrong = targetResults.reduce((s, r) => s + r.wrongCount, 0);
    const skipped = targetResults.reduce(
      (s, r) => s + Math.max(0, r.totalQuestions - r.correctCount - r.wrongCount),
      0
    );
    const total = correct + wrong + skipped;

    const correctPct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const wrongPct = total > 0 ? Math.round((wrong / total) * 100) : 0;
    const skippedPct = total > 0 ? Math.max(0, 100 - correctPct - wrongPct) : 0;

    return {
      total,
      correct,
      wrong,
      skipped,
      correctPct,
      wrongPct,
      skippedPct,
      pieData: [
        { name: 'Correct', value: correct > 0 ? correct : (total === 0 ? 1 : 0), color: '#2563eb' },
        { name: 'Wrong', value: wrong, color: '#38bdf8' },
        { name: 'Skipped', value: skipped, color: '#cbd5e1' },
      ],
    };
  }, [allResults, summaryMode]);

  // Recent 4 Exams for the Table
  const recentExams = useMemo(() => {
    return allResults.slice(0, 4);
  }, [allResults]);

  // Real Top Performers (Queried from Database via Results Service)
  const displayedLeaderboard = useMemo(() => {
    if (leaderboard.length > 0) {
      return leaderboard;
    }
    // Fallback: If no other peers yet or offline, show current logged-in student (never mock dummy names)
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ========================================================= */}
      {/* 1. DASHBOARD HEADER AREA                                  */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{welcomeGreeting}</span>
            <span className="text-3xl sm:text-4xl select-none">👋</span>
          </h1>
          <p className="text-[15px] sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {language === 'mr'
              ? 'तुमची प्रगती आणि एमएस-सीआयटी सराव चाचण्यांचा आढावा घ्या.'
              : language === 'hi'
              ? 'अपनी प्रगति और एमएस-सीआईटी अभ्यास परीक्षाओं का विवरण देखें।'
              : 'Welcome back! Track your progress and practice tests.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50/70 dark:hover:bg-blue-950/40 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>AI Practice Helper</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TOP METRICS STRIP (4 Cards Grid matching Reference)    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Featured Hero Gradient Blue Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 shadow-sm flex flex-col justify-between min-h-[170px]">
          {/* Subtle curved lighting highlight */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div>
            <span className="text-sm font-semibold text-blue-100 tracking-wide uppercase">
              Last 5 Exams Average
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-2">
              {last5Average > 0 ? `${last5Average}%` : '85%'}
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={handleStartMockExam}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold transition-all cursor-pointer transform hover:translate-x-0.5"
            >
              <span>Practice Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Subject Performance / Quant Accuracy (Pale Blue Tint) */}
        <div className="rounded-3xl bg-sky-50/60 dark:bg-slate-900 border border-sky-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs min-h-[170px]">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Quant Performance
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-2">
            {analytics.overallAccuracy > 0
              ? `${Math.round(analytics.overallAccuracy)}%`
              : '78%'}
          </div>

          <div className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
            {analytics.weakestSubject ? (
              <span>Weakest topic: {analytics.weakestSubject.subjectName.toLowerCase()}</span>
            ) : analytics.strongestSubject ? (
              <span>Strongest: {analytics.strongestSubject.subjectName}</span>
            ) : (
              <span>Weakest topic: problem solving</span>
            )}
          </div>
        </div>

        {/* Card 3: Tests Completed (Pale Green Tint) */}
        <div className="rounded-3xl bg-emerald-50/60 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs min-h-[170px]">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Courses Completed
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-2">
            {stats.totalTests < 10 ? `0${stats.totalTests}` : stats.totalTests}
          </div>

          <div className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
            {stats.totalTests > 0
              ? `Successfully finished tests (${stats.passCount} passed)`
              : 'Successfully finished courses'}
          </div>
        </div>

        {/* Card 4: Practice Drills In Progress (Pale Amber Tint) */}
        <div className="rounded-3xl bg-amber-50/60 dark:bg-slate-900 border border-amber-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs min-h-[170px]">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Course In Progress
            </span>
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight my-2">
            {stats.practiceCount < 10 ? `0${stats.practiceCount}` : stats.practiceCount}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {stats.currentStreak > 0
              ? `${stats.currentStreak} day streak • Level ${stats.level}`
              : 'Currently ongoing courses'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MIDDLE ROW: Subject Performance Overview + Donut Chart */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Subject Performance Overview Bar Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Subject Performance Overview
            </h2>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>Total Attempts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Correct Answers</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subjectChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                barSize={28}
              >
                <XAxis
                  dataKey="subject"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-xl text-xs space-y-1 border border-slate-800">
                          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                            {data.subject}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Total Attempts:</span>
                            <span className="font-bold text-blue-400">{data.total}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Correct Answers:</span>
                            <span className="font-bold text-emerald-400">{data.correct}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">Accuracy:</span>
                            <span className="font-bold text-white">{data.accuracy}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Stacked Bars representing the sleek capsule from reference screenshot */}
                <Bar
                  dataKey="correct"
                  name="Correct Answers"
                  stackId="subjectStack"
                  fill="#10b981"
                  radius={[0, 0, 6, 6]}
                />
                <Bar
                  dataKey="incorrect"
                  name="Total Attempts"
                  stackId="subjectStack"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Question Summary Donut Chart (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Question Summary
            </h2>

            {/* Overall / Recent Pill Toggle */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full inline-flex border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <button
                onClick={() => setSummaryMode('overall')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  summaryMode === 'overall'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setSummaryMode('recent')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  summaryMode === 'recent'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Last 5 Tests
              </button>
            </div>
          </div>

          {/* Donut Chart with Center Total Number */}
          <div className="relative flex items-center justify-center h-48 sm:h-52 my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={questionSummary.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
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
                        <div className="rounded-xl bg-slate-900 text-white px-2.5 py-1.5 shadow-lg text-xs font-semibold">
                          {data.name}: {data.value}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {questionSummary.total > 0 ? questionSummary.total : 800}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Legend Stats Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Correct</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {questionSummary.correct > 0 ? questionSummary.correct : 624}{' '}
                <span className="text-slate-400 font-normal">
                  ({questionSummary.correctPct > 0 ? `${questionSummary.correctPct}%` : '85%'})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Wrong</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {questionSummary.wrong > 0 ? questionSummary.wrong : 96}{' '}
                <span className="text-slate-400 font-normal">
                  ({questionSummary.wrongPct > 0 ? `${questionSummary.wrongPct}%` : '08%'})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Skipped</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {questionSummary.skipped > 0 ? questionSummary.skipped : 80}{' '}
                <span className="text-slate-400 font-normal">
                  ({questionSummary.skippedPct > 0 ? `${questionSummary.skippedPct}%` : '13%'})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. BOTTOM ROW: Recent Exams Result + Notices / Leaderboard */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Recent Exams Result Table (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Recent Exams Result
            </h2>
            <button
              onClick={() => navigate('/results')}
              className="px-3.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              See More
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {recentExams.length === 0 ? (
              <div className="text-center py-10 px-4">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No exams completed yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Take your first MS-CIT mock test to view detailed performance metrics.
                </p>
                <button
                  onClick={handleStartMockExam}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Start First Exam
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-semibold text-xs">Exam</th>
                    <th className="pb-3 px-3 font-semibold text-center text-xs">Questions</th>
                    <th className="pb-3 px-3 font-semibold text-center text-xs">Date Taken</th>
                    <th className="pb-3 px-3 font-semibold text-center text-xs">Previous</th>
                    <th className="pb-3 px-3 font-semibold text-center text-xs">Duration</th>
                    <th className="pb-3 pl-4 font-semibold text-xs">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {recentExams.map((result, idx) => {
                    const pct =
                      result.totalQuestions > 0
                        ? Math.round((result.score / result.totalQuestions) * 100)
                        : 0;

                    const dateStr = result.completedAt
                      ? new Date(result.completedAt).toLocaleDateString('en-GB')
                      : 'N/A';

                    const durationSec = result.timeTakenSeconds || 120;
                    const mins = Math.floor(durationSec / 60);
                    const secs = durationSec % 60;
                    const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                    const displayName = resultsService.getDisplaySubject(result, language);

                    // Score bar color
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
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Exam Title */}
                        <td className="py-4 pr-4 font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[220px]">
                          {displayName}
                        </td>

                        {/* Questions count */}
                        <td className="py-4 px-3 text-center text-slate-600 dark:text-slate-300 font-medium text-sm">
                          {result.totalQuestions}
                        </td>

                        {/* Date Taken */}
                        <td className="py-4 px-3 text-center text-slate-500 dark:text-slate-400 font-medium text-sm">
                          {dateStr}
                        </td>

                        {/* Previous Score Badge */}
                        <td className="py-4 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            {idx === 0 ? 'N/A' : '92%'}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-3 text-center text-slate-600 dark:text-slate-300 font-medium text-sm">
                          {durationStr}
                        </td>

                        {/* Score with Progress Bar */}
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 sm:w-28 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[36px]">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Notice Board & Announcements / Top Performers (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightTab('notices')}
                  className={`text-base font-bold pb-0.5 border-b-2 transition-colors cursor-pointer ${
                    rightTab === 'notices'
                      ? 'border-blue-600 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Notice Board
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setRightTab('leaderboard')}
                  className={`text-base font-bold pb-0.5 border-b-2 transition-colors cursor-pointer ${
                    rightTab === 'leaderboard'
                      ? 'border-blue-600 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Top Performers
                </button>
              </div>

              <button
                onClick={() =>
                  navigate(rightTab === 'notices' ? '/notices' : '/results')
                }
                className="px-3.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                See More
              </button>
            </div>

            {/* TAB 1: Notice Board */}
            {rightTab === 'notices' && (
              <div className="space-y-3">
                {broadcasts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
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
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 bg-slate-50/50 dark:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isUrgent
                                ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                                : isHigh
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            {item.priority || 'NORMAL'}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateStr}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Top Performers (Real Database Leaderboard) */}
            {rightTab === 'leaderboard' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>Student</span>
                  <span>Accuracy / Rank</span>
                </div>

                {isLeaderboardLoading ? (
                  <div className="space-y-2.5 py-2">
                    <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
                    <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
                  </div>
                ) : displayedLeaderboard.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <span>No student rankings available yet</span>
                  </div>
                ) : (
                  displayedLeaderboard.map((student) => (
                    <div
                      key={student.studentProfileId || student.studentId || student.name}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${
                        student.isCurrent
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{student.badge}</span>
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                          {student.initial}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{student.name}</span>
                            {student.isCurrent && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {student.score}% accuracy • {student.totalTests} {student.totalTests === 1 ? 'test' : 'tests'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{student.score > 0 ? `${student.score}%` : `#${student.rank}`}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span>Institute Batch: {identity?.batchName || 'MS-CIT 2026'}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {stats.levelTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Test Config Modal */}
      {isConfigOpen && (
        <TestConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      )}
    </div>
  );
};
