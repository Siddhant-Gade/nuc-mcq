import { useEffect, useState, useMemo } from 'react';
import { getTeachers, getBatches } from '../services';
import { getErrorMessage } from '../services/api';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './TeacherAnalytics.module.css';

export default function TeacherAnalytics() {
    const [teachers, setTeachers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([getTeachers(), getBatches()])
            .then(([t, b]) => { setTeachers(t); setBatches(b); setLoading(false); })
            .catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
    }, []);

    const batchMap = useMemo(() => {
        const map = new Map();
        batches.forEach((b) => map.set(b.batchId, b));
        return map;
    }, [batches]);

    const enriched = useMemo(() =>
        teachers.map((t) => ({
            ...t,
            batch: t.assignedBatchId ? batchMap.get(t.assignedBatchId) : null,
        })), [teachers, batchMap]);

    const assigned = enriched.filter((t) => t.batch != null).length;
    const unassigned = enriched.length - assigned;

    if (loading) return <div className={pageStyles.subtext}>Loading analytics...</div>;
    if (error) return <div className={pageStyles.errorBanner}><span>{error}</span></div>;

    return (
        <div>
            <div className={pageStyles.breadcrumb}>
                <span className={pageStyles.breadcrumbLink}>Admin</span>
                <span className={pageStyles.breadcrumbSeparator}>/</span>
                <span className={pageStyles.breadcrumbCurrent}>Teacher Analytics</span>
            </div>
            <h1 className={pageStyles.heading}>Teacher Analytics</h1>
            <p className={styles.subtext}>Overview of teachers and their batch assignments.</p>

            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{enriched.length}</div>
                    <div className={styles.statLabel}>Total Teachers</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statValue} ${styles.green}`}>{assigned}</div>
                    <div className={styles.statLabel}>Assigned to Batch</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statValue} ${styles.amber}`}>{unassigned}</div>
                    <div className={styles.statLabel}>Unassigned</div>
                </div>
            </div>

            {enriched.length === 0 && <p className={pageStyles.subtext}>No teachers added yet.</p>}

            <div className={styles.grid}>
                {enriched.map((t) => {
                    const fillPct = t.batch ? Math.round((t.batch.enrolledCount / t.batch.capacity) * 100) : 0;
                    return (
                        <div key={t.id} className={styles.card}>
                            <div className={styles.cardTop}>
                                <div className={styles.avatar}>{t.name[0].toUpperCase()}</div>
                                <div>
                                    <div className={styles.teacherName}>{t.name}</div>
                                    <div className={styles.teacherEmail}>{t.email}</div>
                                </div>
                            </div>
                            {t.subject && <div className={styles.subject}>{t.subject}</div>}
                            {t.batch ? (
                                <div className={styles.batchInfo}>
                                    <div className={styles.batchLabel}>{t.batch.batchName} <span className={styles.batchIdSmall}>({t.batch.batchId})</span></div>
                                    {t.batch.timing && <div className={styles.timing}>🕐 {t.batch.timing}</div>}
                                    <div className={styles.fillBar}>
                                        <div className={styles.fillTrack}>
                                            <div className={styles.fillFill} style={{ width: `${Math.min(fillPct, 100)}%` }}/>
                                        </div>
                                        <span className={styles.fillText}>{t.batch.enrolledCount}/{t.batch.capacity} students ({fillPct}%)</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.unassigned}>No batch assigned</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
