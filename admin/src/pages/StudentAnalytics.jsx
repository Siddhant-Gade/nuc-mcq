import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudentAnalytics } from '../services';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudentAnalytics.module.css';

const TOPIC_COLORS = {
  'Computer Fundamentals': 'var(--color-primary)',
  'Operating System': 'var(--color-success)',
  'MS Word': 'var(--color-primary)',
  'MS Excel': 'var(--color-success)',
  'Power-Point': 'var(--color-primary)',
  'PageMaker': 'var(--color-success)',
  'Internet': 'var(--color-primary)',
};

const DEFAULT_COLOR = 'var(--color-primary)';

function getTopicColor(topic) {
  return TOPIC_COLORS[topic] || DEFAULT_COLOR;
}

export default function StudentAnalytics() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredTopic, setHoveredTopic] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentAnalytics();
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Donut chart calculations
  const chartSegments = useMemo(() => {
    if (!data?.topicBreakdown || data.topicBreakdown.length === 0) return [];

    const activeTopics = data.topicBreakdown.filter((t) => t.errorCount > 0);
    const totalErrors = activeTopics.reduce((sum, item) => sum + item.errorCount, 0);

    if (totalErrors === 0) {
      return data.topicBreakdown.slice(0, 6).map((t) => ({
        ...t,
        percentage: Math.round(100 / Math.min(data.topicBreakdown.length, 6)),
        color: getTopicColor(t.topic),
      }));
    }

    let cumulativePercentage = 0;
    return activeTopics.map((item) => {
      const pct = (item.errorCount / totalErrors) * 100;
      const segment = {
        ...item,
        percentage: Math.round(pct),
        exactPct: pct,
        offset: cumulativePercentage,
        color: getTopicColor(item.topic),
      };
      cumulativePercentage += pct;
      return segment;
    });
  }, [data]);

  // Score distribution calculation for bar chart
  const scoreDistribution = useMemo(() => {
    const submissions = data?.recentSubmissions || [];
    const bands = [
      { band: '80% - 100%', label: 'Distinction (80-100%)', count: 0, color: 'var(--color-success)' },
      { band: '60% - 79%', label: 'First Class (60-79%)', count: 0, color: 'var(--color-primary)' },
      { band: '40% - 59%', label: 'Passing (40-59%)', count: 0, color: 'var(--color-primary)' },
      { band: '0% - 39%', label: 'Needs Support (0-39%)', count: 0, color: 'var(--color-success)' },
    ];

    submissions.forEach((s) => {
      const p = s.percentage;
      if (p >= 80) bands[0].count++;
      else if (p >= 60) bands[1].count++;
      else if (p >= 40) bands[2].count++;
      else bands[3].count++;
    });

    const maxCount = Math.max(...bands.map((b) => b.count), 1);
    return bands.map((b) => ({
      ...b,
      percentageOfMax: Math.round((b.count / maxCount) * 100),
      shareOfTotal: submissions.length > 0 ? Math.round((b.count / submissions.length) * 100) : 0,
    }));
  }, [data]);

  // Learning vs Time trend calculation
  const learningTrend = useMemo(() => {
    const submissions = data?.recentSubmissions || [];
    if (submissions.length === 0) {
      return [
        { label: 'Session 1', score: 45, date: 'Earlier' },
        { label: 'Session 2', score: 58, date: 'Day 2' },
        { label: 'Session 3', score: 64, date: 'Day 3' },
        { label: 'Session 4', score: 72, date: 'Day 4' },
        { label: 'Session 5', score: 78, date: 'Recent' },
      ];
    }

    // Sort chronologically ascending
    const sorted = [...submissions].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Group into up to 7 chronological points
    const step = Math.max(1, Math.floor(sorted.length / 7));
    const points = [];
    for (let i = 0; i < sorted.length; i += step) {
      const slice = sorted.slice(i, i + step);
      const avg = Math.round(
        slice.reduce((acc, curr) => acc + curr.percentage, 0) / slice.length
      );
      const dateObj = new Date(slice[slice.length - 1].completedAt);
      const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `T-${i + 1}`;

      points.push({
        label: `T${points.length + 1}`,
        score: avg,
        date: dateStr,
        student: slice[slice.length - 1].studentName,
        count: slice.length,
      });
      if (points.length >= 7) break;
    }

    return points;
  }, [data]);

  const summary = data?.summary || {
    totalTests: 0,
    avgScore: 0,
    passRate: 0,
    practiceCount: 0,
    examCount: 0,
    uniqueStudents: 0,
    totalWrongAnswers: 0,
    weakestTopic: 'None',
  };

  const topicBreakdown = data?.topicBreakdown || [];
  const actionableInsights = data?.actionableInsights || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div className={styles.container}>
      {/* ── Page Header & Breadcrumbs ── */}
      <div>
        <nav className={pageStyles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/" className={pageStyles.breadcrumbLink}>
            {t('nav.dashboard')}
          </Link>
          <span className={pageStyles.breadcrumbSeparator}>/</span>
          <span className={pageStyles.breadcrumbCurrent}>{t('nav.analytics')}</span>
        </nav>

        <div className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.heading}>{t('analytics.title')}</h1>
            <p className={pageStyles.subtext}>{t('analytics.subtitle')}</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={fetchAnalytics}
              disabled={loading}
              title="Refresh Analytics"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{t('analytics.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={styles.errorMessage}
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className={styles.loadingSpinner}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      ) : (
        <>
          {/* ── KPI Grid ── */}
          <div className={styles.kpiGrid}>
            {/* KPI 1: Total Tests */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{t('analytics.kpi.totalTests')}</span>
                <div className={`${styles.kpiIconWrap} ${styles.kpiIconPrimary}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{summary.totalTests}</span>
              </div>
              <div className={styles.kpiSubtext}>
                <span className={`${styles.kpiBadge} ${styles.badgeInfo}`}>
                  {summary.practiceCount} Practice · {summary.examCount} Exam
                </span>
              </div>
            </div>

            {/* KPI 2: Average Score */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{t('analytics.kpi.avgScore')}</span>
                <div className={`${styles.kpiIconWrap} ${styles.kpiIconPrimary}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{summary.avgScore}%</span>
              </div>
              <div className={styles.kpiSubtext}>
                <span
                  className={`${styles.kpiBadge} ${
                    summary.avgScore >= 60
                      ? styles.badgeSuccess
                      : summary.avgScore >= 40
                      ? styles.badgeWarning
                      : styles.badgeDanger
                  }`}
                >
                  {summary.avgScore >= 60 ? 'Above Average' : summary.avgScore >= 40 ? 'Fair Progress' : 'Needs Practice'}
                </span>
              </div>
            </div>

            {/* KPI 3: Pass Rate */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{t('analytics.kpi.passRate')}</span>
                <div className={`${styles.kpiIconWrap} ${styles.kpiIconSuccess}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{summary.passRate}%</span>
              </div>
              <div className={styles.kpiSubtext}>
                <span
                  className={`${styles.kpiBadge} ${
                    summary.passRate >= 60 ? styles.badgeSuccess : styles.badgeWarning
                  }`}
                >
                  {summary.passRate >= 60 ? 'Healthy Clearance' : 'Target: 75%+ Passing'}
                </span>
              </div>
            </div>

            {/* KPI 4: Most Challenging Topic */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{t('analytics.kpi.weakestTopic')}</span>
                <div className={`${styles.kpiIconWrap} ${styles.kpiIconPrimary}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <span
                  className={styles.kpiValue}
                  style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={summary.weakestTopic}
                >
                  {summary.weakestTopic}
                </span>
              </div>
              <div className={styles.kpiSubtext}>
                <span className={`${styles.kpiBadge} ${styles.badgeDanger}`}>
                  {summary.totalWrongAnswers} total mistakes
                </span>
              </div>
            </div>

            {/* KPI 5: Students Assessed */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{t('analytics.kpi.studentsAssessed')}</span>
                <div className={`${styles.kpiIconWrap} ${styles.kpiIconSuccess}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{summary.uniqueStudents}</span>
              </div>
              <div className={styles.kpiSubtext}>
                <span className={`${styles.kpiBadge} ${styles.badgeInfo}`}>
                  Active Exam Takers
                </span>
              </div>
            </div>
          </div>

          {/* ── Visual Analytics Section ── */}
          <div className={styles.visualsGrid}>
            {/* Left Column: Donut + Score Distribution */}
            <div className={styles.visualsColumn}>
              {/* Chart 1: Donut Chart - Topic Error Distribution */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{t('analytics.chart.errorDistribution')}</h3>
                    <p className={styles.cardSubtitle}>{t('analytics.chart.errorDistributionSub')}</p>
                  </div>
                </div>

                <div className={styles.donutContainer}>
                  {/* SVG Donut */}
                  <div className={styles.donutSvgWrapper}>
                    <svg width="170" height="170" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="var(--color-surface-container)"
                        strokeWidth="14"
                      />
                      {chartSegments.map((seg) => {
                        const radius = 38;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDasharray = `${(seg.exactPct ?? seg.percentage) * (circumference / 100)} ${circumference}`;
                        const strokeDashoffset = -((seg.offset ?? 0) * (circumference / 100));
                        const isHovered = hoveredTopic === seg.topic;

                        return (
                          <circle
                            key={seg.topic}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? '17' : '14'}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            style={{
                              transition: 'stroke-width 200ms ease, opacity 200ms ease',
                              cursor: 'pointer',
                              opacity: hoveredTopic && !isHovered ? 0.45 : 1,
                            }}
                            onMouseEnter={() => setHoveredTopic(seg.topic)}
                            onMouseLeave={() => setHoveredTopic(null)}
                          />
                        );
                      })}
                    </svg>
                    <div className={styles.donutCenterText}>
                      <div className={styles.donutCenterValue}>{summary.totalWrongAnswers}</div>
                      <div className={styles.donutCenterLabel}>Errors</div>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className={styles.donutLegend}>
                    {chartSegments.map((seg) => (
                      <div
                        key={seg.topic}
                        className={styles.legendItem}
                        style={{
                          opacity: hoveredTopic && hoveredTopic !== seg.topic ? 0.5 : 1,
                        }}
                        onMouseEnter={() => setHoveredTopic(seg.topic)}
                        onMouseLeave={() => setHoveredTopic(null)}
                      >
                        <div className={styles.legendLeft}>
                          <span
                            className={styles.legendColorDot}
                            style={{ background: seg.color }}
                          />
                          <span className={styles.legendTopicName} title={seg.topic}>
                            {seg.topic}
                          </span>
                        </div>
                        <div className={styles.legendRight}>
                          <span>{seg.errorCount} err</span>
                          <span className={styles.legendPct}>{seg.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 2: Student Score Distribution Bands */}
              <div className={styles.barChartCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{t('analytics.chart.scoreDistribution')}</h3>
                    <p className={styles.cardSubtitle}>{t('analytics.chart.scoreDistributionSub')}</p>
                  </div>
                </div>

                <div className={styles.barChartContainer}>
                  {scoreDistribution.map((band) => (
                    <div key={band.band} className={styles.barRow}>
                      <div className={styles.barLabel} title={band.label}>
                        <span className={styles.barDot} style={{ background: band.color }} />
                        <span>{band.band}</span>
                      </div>
                      <div className={styles.barTrackContainer}>
                        <div
                          className={styles.barValueFill}
                          style={{
                            width: `${Math.max(band.percentageOfMax, band.count > 0 ? 8 : 2)}%`,
                            background: band.color,
                          }}
                        >
                          {band.count > 0 && band.percentageOfMax >= 15 && (
                            <span className={styles.barValueTextInside}>{band.count}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.barStatRight}>
                        <span>{band.count} tests</span>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.8, marginLeft: '4px' }}>({band.shareOfTotal}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Topic Diagnostics & Severity Bars */}
            <div className={styles.visualsColumn}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{t('analytics.chart.diagnostic')}</h3>
                    <p className={styles.cardSubtitle}>{t('analytics.chart.diagnosticSub')}</p>
                  </div>
                </div>

                <div className={styles.diagnosticList}>
                  {topicBreakdown.map((item) => {
                    const color = getTopicColor(item.topic);
                    const isCritical = item.percentage >= 25 && item.errorCount > 0;
                    const isModerate = item.percentage >= 10 && item.errorCount > 0;

                    return (
                      <div key={item.topic} className={styles.diagnosticItem}>
                        <div className={styles.diagnosticHeader}>
                          <div className={styles.diagnosticTitle}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: color,
                              }}
                            />
                            <span>{item.topic}</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-outline)' }}>
                              ({item.totalQuestionsInBank} Qs in bank)
                            </span>
                          </div>
                          <div className={styles.diagnosticStats}>
                            <span
                              className={`${styles.errorCountBadge} ${
                                isCritical
                                  ? styles.badgeDanger
                                  : isModerate
                                  ? styles.badgeWarning
                                  : styles.badgeSuccess
                              }`}
                            >
                              {isCritical
                                ? t('analytics.highDifficulty')
                                : isModerate
                                ? t('analytics.moderate')
                                : t('analytics.mastered')}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                              {item.errorCount} errors ({item.percentage}%)
                            </span>
                          </div>
                        </div>

                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: `${Math.max(item.percentage, item.errorCount > 0 ? 5 : 0)}%`,
                              background: color,
                            }}
                          />
                        </div>

                        <div className={styles.diagnosticTip}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          <span>{item.recommendation}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Topic Error Breakdown (Horizontal Bars) ── */}
          <div className={styles.barChartCard} style={{ marginTop: '0.5rem' }}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{t('analytics.chart.barComparison')}</h3>
                <p className={styles.cardSubtitle}>{t('analytics.chart.barComparisonSub')}</p>
              </div>
            </div>

            <div className={styles.barChartContainer}>
              {topicBreakdown.map((item) => {
                const color = getTopicColor(item.topic);
                const maxErrors = Math.max(...topicBreakdown.map((t) => t.errorCount), 1);
                const barWidthPct = item.errorCount > 0 ? Math.round((item.errorCount / maxErrors) * 100) : 2;

                return (
                  <div key={item.topic} className={styles.barRow}>
                    <div className={styles.barLabel} title={item.topic}>
                      <span className={styles.barDot} style={{ background: color }} />
                      <span>{item.topic}</span>
                    </div>
                    <div className={styles.barTrackContainer}>
                      <div
                        className={styles.barValueFill}
                        style={{
                          width: `${barWidthPct}%`,
                          background: color,
                          minWidth: item.errorCount > 0 ? '24px' : '6px',
                        }}
                      >
                        {item.errorCount > 0 && barWidthPct >= 18 && (
                          <span className={styles.barValueTextInside}>{item.errorCount}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.barStatRight}>
                      <span>{item.errorCount} errors</span>
                      <span style={{ fontSize: '0.6875rem', opacity: 0.8, marginLeft: '4px' }}>({item.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Line Chart: Learning vs Time ── */}
          <div className={styles.lineChartCard} style={{ marginTop: '0.5rem' }}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{t('analytics.chart.learningVsTime')}</h3>
                <p className={styles.cardSubtitle}>{t('analytics.chart.learningVsTimeSub')}</p>
              </div>
              <div className={styles.lineChartLegend}>
                <div className={styles.lineChartLegendItem}>
                  <span className={styles.lineChartLegendLine} style={{ background: 'var(--color-primary)' }} />
                  <span>Student Avg Score</span>
                </div>
                <div className={styles.lineChartLegendItem}>
                  <span className={styles.lineChartLegendLine} style={{ background: 'var(--color-success)', borderTop: '2px dashed var(--color-success)' }} />
                  <span>Passing Benchmark (40%)</span>
                </div>
              </div>
            </div>

            <div className={styles.lineChartContainer}>
              {(() => {
                const W = 700;
                const H = 220;
                const padLeft = 45;
                const padRight = 30;
                const padTop = 25;
                const padBottom = 40;
                const innerW = W - padLeft - padRight;
                const innerH = H - padTop - padBottom;

                const n = learningTrend.length;
                const coords = learningTrend.map((pt, idx) => {
                  const x = padLeft + (n > 1 ? (idx / (n - 1)) * innerW : innerW / 2);
                  const y = padTop + innerH - (pt.score / 100) * innerH;
                  return { ...pt, x, y };
                });

                const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
                const passBenchmarkY = padTop + innerH - 0.4 * innerH;

                // Area under the curve
                const areaPath = coords.length > 0
                  ? `M ${coords[0].x},${padTop + innerH} ` +
                    coords.map((c) => `L ${c.x},${c.y}`).join(' ') +
                    ` L ${coords[coords.length - 1].x},${padTop + innerH} Z`
                  : '';

                return (
                  <div className={styles.lineChartSvgWrapper}>
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className={styles.lineChartSvg}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      {[0, 25, 50, 75, 100].map((val) => {
                        const y = padTop + innerH - (val / 100) * innerH;
                        return (
                          <g key={val}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={W - padRight}
                              y2={y}
                              className={styles.lineChartGridLine}
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className={styles.lineChartAxisText}
                            >
                              {val}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Passing Benchmark Dashed Line */}
                      <line
                        x1={padLeft}
                        y1={passBenchmarkY}
                        x2={W - padRight}
                        y2={passBenchmarkY}
                        stroke="var(--color-success)"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                        opacity="0.85"
                      />

                      {/* Area Fill */}
                      {areaPath && <path d={areaPath} fill="url(#lineAreaGrad)" />}

                      {/* Performance Trend Line */}
                      <polyline
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylinePoints}
                      />

                      {/* Data Point Circles & Tooltips */}
                      {coords.map((c, i) => (
                        <g key={i}>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={hoveredPoint === i ? 6 : 4.5}
                            fill="var(--color-surface-card)"
                            stroke="var(--color-primary)"
                            strokeWidth={hoveredPoint === i ? 3 : 2.5}
                            className={styles.lineChartPoint}
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {/* Score Label on hover or top */}
                          <text
                            x={c.x}
                            y={c.y - 10}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="var(--color-on-surface)"
                            style={{
                              transition: 'opacity 150ms ease',
                              opacity: hoveredPoint === null || hoveredPoint === i ? 1 : 0.4,
                            }}
                          >
                            {c.score}%
                          </text>
                          {/* X Axis Time / Date Label */}
                          <text
                            x={c.x}
                            y={H - 12}
                            textAnchor="middle"
                            className={styles.lineChartAxisText}
                            fontWeight="600"
                          >
                            {c.date}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Actionable Guidance Section ── */}
          <div className={styles.actionsSection}>
            <div>
              <h3 className={pageStyles.heading} style={{ fontSize: '1.0625rem' }}>
                {t('analytics.actions.title')}
              </h3>
              <p className={pageStyles.subtext}>{t('analytics.actions.subtitle')}</p>
            </div>

            <div className={styles.actionsGrid}>
              {actionableInsights.map((action) => {
                const isHigh = action.priority === 'HIGH';
                const isMed = action.priority === 'MEDIUM';

                return (
                  <div
                    key={action.id}
                    className={`${styles.actionCard} ${
                      isHigh
                        ? styles.actionCardHigh
                        : isMed
                        ? styles.actionCardMed
                        : styles.actionCardLow
                    }`}
                  >
                    <div>
                      <span
                        className={`${styles.actionPriority} ${
                          isHigh
                            ? styles.priorityHigh
                            : isMed
                            ? styles.priorityMed
                            : styles.priorityLow
                        }`}
                      >
                        {action.priority} Priority
                      </span>
                      <h4 className={styles.actionTitle}>{action.title}</h4>
                      <p className={styles.actionDesc}>{action.description}</p>
                    </div>

                    <Link to={action.actionLink} className={styles.actionBtn}>
                      <span>{action.actionLabel}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Student Activity Table ── */}
          <div className={styles.tableCard}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <h3 className={styles.cardTitle}>{t('analytics.table.recentTests')}</h3>
              <p className={styles.cardSubtitle}>{t('analytics.table.recentTestsSub')}</p>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className={styles.emptyState}>{t('analytics.noData')}</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('analytics.table.student')}</th>
                      <th>{t('analytics.table.prn')}</th>
                      <th>{t('analytics.table.batch')}</th>
                      <th>{t('analytics.table.mode')}</th>
                      <th>{t('analytics.table.score')}</th>
                      <th>{t('analytics.table.status')}</th>
                      <th>{t('analytics.table.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((row) => {
                      const studentTargetId = row.studentProfileId || row.studentId;
                      return (
                        <tr
                          key={row.id}
                          className={styles.clickableRow}
                          onClick={() => studentTargetId && navigate(`/students/${studentTargetId}`)}
                          title={`View ${row.studentName}'s details`}
                        >
                          <td>
                            <Link
                              to={`/students/${studentTargetId}`}
                              className={styles.studentLink}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={styles.studentAvatar}>
                                {row.studentName.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.studentInfo}>
                                <span className={styles.studentName}>{row.studentName}</span>
                              </div>
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {row.studentId}
                            </span>
                          </td>
                        <td>
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>
                            {row.batchId}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.modeBadge} ${
                              row.mode === 'EXAM' ? styles.modeExam : styles.modePractice
                            }`}
                          >
                            {row.mode}
                          </span>
                        </td>
                        <td>
                          <div className={styles.scoreProgressRow}>
                            <div className={styles.scoreBarTrack}>
                              <div
                                className={styles.scoreBarFill}
                                style={{
                                  width: `${row.percentage}%`,
                                  background:
                                    row.percentage >= 60
                                      ? 'var(--color-success)'
                                      : 'var(--color-primary)',
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 600, minWidth: '45px' }}>
                              {row.score}/{row.totalQuestions} ({row.percentage}%)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${styles.resultPill} ${
                              row.isPassed ? styles.resultPassed : styles.resultFailed
                            }`}
                          >
                            {row.isPassed ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                            <span>{row.isPassed ? t('analytics.passed') : t('analytics.needsHelp')}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem' }}>
                            {new Date(row.completedAt).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
