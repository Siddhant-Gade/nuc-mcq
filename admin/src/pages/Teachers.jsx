import { useEffect, useState, useMemo } from 'react';
import { getTeachers, createTeacher, deleteTeacher } from '../services';
import { getErrorMessage } from '../services/api';
import CreateTeacherModal from '../components/CreateTeacherModal';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './Teachers.module.css';

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);

    useEffect(() => {
        getTeachers()
            .then((t) => { setTeachers(t); setLoading(false); })
            .catch((err) => { setLoadError(getErrorMessage(err)); setLoading(false); });
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return teachers.filter((t) =>
            t.name.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q) ||
            (t.subject || '').toLowerCase().includes(q)
        );
    }, [teachers, search]);

    async function handleCreate(data) {
        setActionError(null);
        try {
            const newTeacher = await createTeacher(data);
            setTeachers((prev) => [...prev, newTeacher]);
            setShowCreate(false);
        } catch (err) { setActionError(getErrorMessage(err)); }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setActionError(null);
        try {
            await deleteTeacher(deleteTarget.id);
            setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setActionError(getErrorMessage(err));
            setDeleteTarget(null);
        }
    }

    if (loading) return <div className={pageStyles.subtext}>Loading...</div>;
    if (loadError) return (
        <div className={pageStyles.errorBanner}>
            <span>{loadError}</span>
            <button className={pageStyles.errorRetryBtn} onClick={() => window.location.reload()}>Retry</button>
        </div>
    );

    return (
        <div>
            <div className={pageStyles.breadcrumb}>
                <span className={pageStyles.breadcrumbLink}>Admin</span>
                <span className={pageStyles.breadcrumbSeparator}>/</span>
                <span className={pageStyles.breadcrumbCurrent}>Teachers</span>
            </div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={pageStyles.heading}>Teachers</h1>
                    <p className={styles.subtext}>Manage institute teachers and their batch assignments.</p>
                </div>
                <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Add Teacher
                </button>
            </div>

            {actionError && (
                <div className={pageStyles.errorBanner}>
                    <span>{actionError}</span>
                    <button className={pageStyles.errorRetryBtn} onClick={() => setActionError(null)}>Dismiss</button>
                </div>
            )}

            <div className={styles.filterBar}>
                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
                        <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                    </svg>
                    <input className={styles.searchInput} placeholder="Search by name, email or subject..." value={search} onChange={(e) => setSearch(e.target.value)}/>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Subject</th>
                            <th>Mobile</th>
                            <th>Assigned Batch</th>
                            <th className={styles.thActions}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (<tr><td colSpan={6} className={styles.emptyRow}>No teachers found.</td></tr>)}
                        {filtered.map((t) => (
                            <tr key={t.id}>
                                <td className={styles.nameCell}>{t.name}</td>
                                <td className={styles.emailCell}>{t.email}</td>
                                <td>{t.subject || '—'}</td>
                                <td>{t.mobile || '—'}</td>
                                <td>
                                    {t.assignedBatchName
                                        ? <span className={styles.batchTag}>{t.assignedBatchName} <span className={styles.batchId}>({t.assignedBatchId})</span></span>
                                        : <span className={styles.unassigned}>Unassigned</span>}
                                </td>
                                <td className={styles.actionsCell}>
                                    <button className={styles.deleteBtn} title="Delete teacher" onClick={() => setDeleteTarget(t)}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M12.5 4.5l-.5 8.5a1 1 0 01-1 1h-6a1 1 0 01-1-1l-.5-8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate && <CreateTeacherModal onConfirm={handleCreate} onCancel={() => setShowCreate(false)}/>}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete Teacher"
                    message="This will permanently remove the teacher. They will be unassigned from any batch."
                    fields={[{ label: 'Teacher Name', value: deleteTarget.name }]}
                    confirmLabel="Delete Teacher"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
