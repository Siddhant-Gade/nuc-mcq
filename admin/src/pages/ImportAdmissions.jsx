import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadTemplate, parseCsvFile, validateRows, executeImport } from '../services/importService';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './ImportAdmissions.module.css';

function formatBytes(b) {
    if (b < 1024)
        return b + ' B';
    return (b / 1024).toFixed(1) + ' KB';
}

export default function ImportAdmissions() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const fileRef = useRef(null);
    const [step, setStep] = useState('upload');
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [validated, setValidated] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const validCount = validated.filter((r) => r.status === 'valid').length;
    const invalidCount = validated.length - validCount;
    const duplicateCount = validated.filter((r) => r.status === 'duplicate').length;

    // Filter loaded CSV rows in validate step
    const filteredLoadedRows = rows.filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (r.studentId && String(r.studentId).toLowerCase().includes(q)) ||
            (r.name && String(r.name).toLowerCase().includes(q)) ||
            (r.email && String(r.email).toLowerCase().includes(q)) ||
            (r.mobile && String(r.mobile).toLowerCase().includes(q)) ||
            (r.batchId && String(r.batchId).toLowerCase().includes(q)) ||
            (r.courseInfo && String(r.courseInfo).toLowerCase().includes(q))
        );
    });

    // Filter validated rows in review step
    const filteredValidatedRows = validated.filter((r) => {
        // Status filter
        if (statusFilter === 'valid' && r.status !== 'valid') return false;
        if (statusFilter === 'invalid' && r.status === 'valid') return false;
        if (statusFilter === 'duplicate' && r.status !== 'duplicate') return false;

        // Search text
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (r.studentId && String(r.studentId).toLowerCase().includes(q)) ||
            (r.name && String(r.name).toLowerCase().includes(q)) ||
            (r.email && String(r.email).toLowerCase().includes(q)) ||
            (r.errors && r.errors.some((err) => String(err).toLowerCase().includes(q)))
        );
    });

    const handleFile = useCallback(async (f) => {
        setFile(f);
        setLoading(true);
        setSearchQuery('');
        setStatusFilter('ALL');
        const parsed = await parseCsvFile(f);
        setRows(parsed);
        setLoading(false);
        setStep('validate');
    }, []);

    function onDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
            handleFile(f);
        }
    }

    function onFileChange(e) {
        const f = e.target.files?.[0];
        if (f)
            handleFile(f);
    }

    async function onValidate() {
        setLoading(true);
        setSearchQuery('');
        setStatusFilter('ALL');
        const v = await validateRows(rows);
        setValidated(v);
        setLoading(false);
        setStep('review');
    }

    async function onImport() {
        setLoading(true);
        setStep('importing');
        const r = await executeImport(validated);
        setResult(r);
        setLoading(false);
        setStep('done');
    }

    function onReset() {
        setFile(null);
        setRows([]);
        setValidated([]);
        setResult(null);
        setSearchQuery('');
        setStatusFilter('ALL');
        setStep('upload');
    }

    const steps = [
        { key: 'upload', labelKey: 'import.uploadCsv' },
        { key: 'validate', labelKey: 'auth.pending' },
        { key: 'review', labelKey: 'import.validationResults' },
        { key: 'importing', labelKey: 'import.importing' },
        { key: 'done', labelKey: 'import.importComplete' },
    ];
    const stepIdx = steps.findIndex((s) => s.key === step);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backLink} onClick={() => navigate('/students')}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t('common.back')}
                    </button>
                    <h1 className={styles.title}>{t('import.title')}</h1>
                </div>
                <span className={styles.subtitle}>{t('import.subtitle')}</span>
            </div>

            <div className={styles.steps}>
                {steps.map((s, i) => (
                    <div key={s.key} className={styles.stepItem}>
                        <div className={`${styles.step} ${i === stepIdx ? styles.stepActive : ''} ${i < stepIdx ? styles.stepDone : ''}`}>
                            <span className={styles.stepNum}>{i < stepIdx ? '\u2713' : i + 1}</span>
                            <span className={styles.stepLabel}>{t(s.labelKey)}</span>
                        </div>
                        {i < steps.length - 1 && <div className={styles.stepConnector}/>}
                    </div>
                ))}
            </div>

            {step === 'upload' && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('import.uploadCsv')}</h2>
                    <p className={styles.cardDesc}>{t('import.uploadDesc')}</p>

                    <button className={styles.btnSecondary} onClick={downloadTemplate} style={{ marginBottom: '1rem' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t('import.downloadTemplate')}
                    </button>

                    <div
                        className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <div className={styles.dropIcon}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <path d="M20 26V10m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 30h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <p className={styles.dropText}>{dragOver ? t('import.dropHere') : t('import.dragDrop')}</p>
                        <p className={styles.dropHint}>{t('import.orClick')}</p>
                    </div>

                    <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFileChange}/>

                    {loading && <div className={styles.emptyState}>{t('import.parsing')}</div>}
                </div>
            )}

            {step === 'validate' && file && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('import.fileLoaded')}</h2>
                    <p className={styles.cardDesc}>{t('import.reviewBeforeValidate')}</p>

                    <div className={styles.fileInfo}>
                        <div className={styles.fileIcon}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4 2h6l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.25"/>
                                <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.25"/>
                            </svg>
                        </div>
                        <div className={styles.fileDetails}>
                            <div className={styles.fileName}>{file.name}</div>
                            <div className={styles.fileSize}>{formatBytes(file.size)} &middot; {rows.length} row{rows.length !== 1 ? 's' : ''}</div>
                        </div>
                        <button className={styles.fileRemove} onClick={onReset} aria-label="Remove file">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M10.5 3.5 3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>

                    {rows.length > 0 && (
                        <div style={{ marginTop: '1.25rem' }}>
                            <div className={styles.filterSection}>
                                <div className={styles.searchWrapper}>
                                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
                                        <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder={t('import.searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button type="button" className={styles.clearBtn} onClick={() => setSearchQuery('')} aria-label="Clear search">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.tableWrap} style={{ marginTop: '0.75rem' }}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{t('studentDetail.studentIdPrn')}</th>
                                            <th>{t('studentDetail.fullName')}</th>
                                            <th>{t('studentDetail.email')}</th>
                                            <th>{t('studentDetail.mobile')}</th>
                                            <th>{t('studentDetail.batch')}</th>
                                            <th>{t('studentDetail.course')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLoadedRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                                    {t('import.noMatchingRows')}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLoadedRows.slice(0, 50).map((r, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{r.studentId}</td>
                                                    <td>{r.name}</td>
                                                    <td>{r.email}</td>
                                                    <td>{r.mobile}</td>
                                                    <td>{r.batchId}</td>
                                                    <td>{r.courseInfo}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className={styles.tableSubtext}>
                                {searchQuery ? (
                                    <span>Showing {Math.min(50, filteredLoadedRows.length)} of {filteredLoadedRows.length} matching rows ({rows.length} total)</span>
                                ) : rows.length > 50 ? (
                                    <span>Showing first 50 of {rows.length} rows</span>
                                ) : (
                                    <span>{rows.length} row{rows.length !== 1 ? 's' : ''} ready to validate</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button className={styles.btnGhost} onClick={onReset}>{t('admission.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={onValidate} disabled={loading}>
                            {loading ? <span className={styles.spinner}/> : null}
                            {t('import.validateRows').replace('{n}', String(rows.length))}
                        </button>
                    </div>
                </div>
            )}

            {step === 'review' && (
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('import.validationResults')}</h2>
                    <p className={styles.cardDesc}>{t('import.reviewResults')}</p>

                    <div className={styles.summary}>
                        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                            <div className={styles.summaryNumber}>{validated.length}</div>
                            <div className={styles.summaryLabel}>{t('import.totalRows')}</div>
                        </div>
                        <div className={`${styles.summaryCard} ${styles.summaryValid}`}>
                            <div className={styles.summaryNumber}>{validCount}</div>
                            <div className={styles.summaryLabel}>{t('import.valid')}</div>
                        </div>
                        <div className={`${styles.summaryCard} ${styles.summaryInvalid}`}>
                            <div className={styles.summaryNumber}>{invalidCount}</div>
                            <div className={styles.summaryLabel}>{t('import.invalidSkipped')}</div>
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <div className={styles.searchWrapper}>
                            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
                                <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={t('import.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button type="button" className={styles.clearBtn} onClick={() => setSearchQuery('')} aria-label="Clear search">
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className={styles.filterChips}>
                            <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'ALL' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('ALL')}
                            >
                                {t('import.allRows')} ({validated.length})
                            </button>
                            <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'valid' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('valid')}
                            >
                                {t('import.validOnly')} ({validCount})
                            </button>
                            <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'invalid' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('invalid')}
                            >
                                {t('import.issuesOnly')} ({invalidCount})
                            </button>
                            {duplicateCount > 0 && (
                                <button
                                    type="button"
                                    className={`${styles.filterChip} ${statusFilter === 'duplicate' ? styles.filterChipActive : ''}`}
                                    onClick={() => setStatusFilter('duplicate')}
                                >
                                    {t('import.duplicatesOnly')} ({duplicateCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {validated.length > 0 && (
                        <div className={styles.tableWrap} style={{ marginTop: '0.75rem' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('studentDetail.studentIdPrn')}</th>
                                        <th>{t('studentDetail.fullName')}</th>
                                        <th>{t('studentDetail.email')}</th>
                                        <th>{t('import.status')}</th>
                                        <th>{t('import.issues')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredValidatedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                                {t('import.noMatchingRows')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredValidatedRows.map((r, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{r.studentId}</td>
                                                <td>{r.name}</td>
                                                <td>{r.email}</td>
                                                <td>
                                                    {r.status === 'valid' && <span className={styles.badgeValid}>{t('import.valid')}</span>}
                                                    {r.status === 'duplicate' && <span className={styles.badgeDuplicate}>Duplicate</span>}
                                                    {(r.status === 'missing_field' || r.status === 'invalid_email') && (
                                                        <span className={styles.badgeInvalid}>{t('import.invalidSkipped').split(' / ')[0]}</span>
                                                    )}
                                                </td>
                                                <td className={styles.errorCell}>{r.errors?.join('; ') || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className={styles.tableSubtext}>
                        <span>Showing {filteredValidatedRows.length} of {validated.length} rows</span>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.btnGhost} onClick={() => setStep('validate')}>{t('import.back')}</button>
                        <button className={styles.btnSuccess} disabled={validCount === 0 || loading} onClick={onImport}>
                            {loading ? <span className={styles.spinner}/> : null}
                            {t('import.importStudents').replace('{n}', String(validCount)).replace('{s}', validCount !== 1 ? 's' : '')}
                        </button>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div className={styles.card}>
                    <div className={styles.emptyState}>
                        <div className={styles.spinner} style={{ width: '2rem', height: '2rem', borderWidth: '3px', margin: '0 auto 1rem' }}/>
                        {t('import.importing')}
                    </div>
                </div>
            )}

            {step === 'done' && result && (
                <div className={styles.card}>
                    <div className={styles.successIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h2 className={styles.cardTitle} style={{ textAlign: 'center' }}>{t('import.importComplete')}</h2>
                    <p className={styles.cardDesc} style={{ textAlign: 'center' }}>{t('import.processFinished')}</p>

                    <div className={styles.resultSummary}>
                        <div className={`${styles.resultCard} ${styles.summaryTotal}`}>
                            <div className={styles.summaryNumber}>{result.totalRows}</div>
                            <div className={styles.summaryLabel}>{t('import.totalProcessed')}</div>
                        </div>
                        <div className={`${styles.resultCard} ${styles.resultCardSuccess}`}>
                            <div className={styles.summaryNumber}>{result.validRows}</div>
                            <div className={styles.summaryLabel}>{t('import.imported')}</div>
                        </div>
                        <div className={`${styles.resultCard} ${styles.resultCardError}`}>
                            <div className={styles.summaryNumber}>{result.skippedRows}</div>
                            <div className={styles.summaryLabel}>{t('import.skipped')}</div>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div className={styles.tableWrap} style={{ marginTop: '1rem' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Row</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.errors.map((e, i) => (
                                        <tr key={i}>
                                            <td>{e.row}</td>
                                            <td className={styles.errorCell}>{e.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button className={styles.btnGhost} onClick={onReset}>{t('import.importAnother')}</button>
                        <button className={styles.btnPrimary} onClick={() => navigate('/students')}>{t('import.goToList')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
