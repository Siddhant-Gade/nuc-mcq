import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    getQuestionBankSummary,
    getQuestionList,
    uploadQuestionBank,
    clearQuestionBank,
    parseQuestionBankFile,
    getPrebuiltQuestionBank,
} from '../services/questionBankService';
import styles from './QuestionBank.module.css';

export default function QuestionBank() {
    const [summary, setSummary] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);

    // File upload & preview state
    const [dragActive, setDragActive] = useState(false);
    const [parsedItems, setParsedItems] = useState([]);
    const [parsedFileName, setParsedFileName] = useState('');
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewTopic, setPreviewTopic] = useState('ALL');
    const fileInputRef = useRef(null);
    const previewRef = useRef(null);

    // Filters for Live Explorer
    const [selectedSection, setSelectedSection] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [sum, qList] = await Promise.all([
                getQuestionBankSummary(),
                getQuestionList({
                    section: selectedSection === 'ALL' ? undefined : selectedSection,
                    search: searchQuery.trim() || undefined,
                    limit: 100,
                }),
            ]);
            setSummary(sum);
            setQuestions(qList.questions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedSection, searchQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleFileSelect(file) {
        try {
            setStatusMsg({ text: `Parsing question bank from ${file.name}... Please wait.`, type: 'info' });
            setLoading(true);
            setPreviewSearch('');
            setPreviewTopic('ALL');
            const items = await parseQuestionBankFile(file);
            if (!items || items.length === 0) {
                setParsedItems([]);
                setParsedFileName('');
                setStatusMsg({
                    text: `No questions could be extracted from "${file.name}". The file may be image-only (scanned), empty, or not in a supported question table format. Please upload a GCC-TBC batch PDF, Excel (.xlsx/.csv), or JSON question file.`,
                    type: 'error',
                });
                return;
            }
            setParsedItems(items);
            setParsedFileName(file.name);
            setStatusMsg({
                text: `Parsed ${items.length} questions from ${file.name}. Review below and click "Confirm & Upload".`,
                type: 'success',
            });
            setTimeout(() => {
                previewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            const serverMsg = err?.response?.data?.message;
            const msg = serverMsg || (err instanceof Error ? err.message : 'Failed to parse file.');
            setStatusMsg({ text: msg, type: 'error' });
            setParsedItems([]);
            setParsedFileName('');
        } finally {
            setLoading(false);
        }
    }

    async function handleLoadPreset(topic) {
        const labels = {
            FULL: 'Full Syllabus Question Bank (1,743 Qs)',
            INTERNET: 'Internet (365 Qs)',
            WORD: 'MS Word (355 Qs)',
            EXCEL: 'MS Excel (337 Qs)',
            POWERPOINT: 'PowerPoint (348 Qs)',
            FUNDAMENTALS: 'Computer Fundamentals (338 Qs)',
        };
        try {
            setLoading(true);
            setPreviewSearch('');
            setPreviewTopic('ALL');
            setStatusMsg({ text: `Loading preset ${labels[topic] || topic}... Please wait.`, type: 'info' });
            const items = await getPrebuiltQuestionBank(topic);
            if (!items || items.length === 0) {
                setStatusMsg({ text: `No questions found in preset ${topic}.`, type: 'error' });
                return;
            }
            setParsedItems(items);
            setParsedFileName(`Preset: ${labels[topic] || topic}`);
            setStatusMsg({
                text: `Loaded ${items.length} questions from ${labels[topic] || topic}. Review below and click "Confirm & Upload".`,
                type: 'success',
            });
            setTimeout(() => {
                previewRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            const serverMsg = err?.response?.data?.message;
            const msg = serverMsg || (err instanceof Error ? err.message : 'Failed to load preset.');
            setStatusMsg({ text: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    function onDragOver(e) {
        e.preventDefault();
        setDragActive(true);
    }

    function onDragLeave() {
        setDragActive(false);
    }

    function onDrop(e) {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }

    async function handleConfirmUpload() {
        if (parsedItems.length === 0)
            return;
        try {
            setUploading(true);
            setStatusMsg(null);
            const result = await uploadQuestionBank(parsedItems, true, '2.0.0');
            setStatusMsg({
                text: `Successfully uploaded ${result.insertedCount} questions to the database! Mobile apps can now sync offline tests.`,
                type: 'success',
            });
            setParsedItems([]);
            setParsedFileName('');
            setPreviewSearch('');
            setPreviewTopic('ALL');
            await loadData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload failed.';
            setStatusMsg({ text: msg, type: 'error' });
        } finally {
            setUploading(false);
        }
    }

    async function handleClearBank() {
        if (!window.confirm('Are you sure you want to clear the entire question bank? Students will not have questions until a new file is uploaded.')) {
            return;
        }
        try {
            setLoading(true);
            await clearQuestionBank();
            setStatusMsg({ text: 'Question bank cleared successfully.', type: 'success' });
            await loadData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to clear bank.';
            setStatusMsg({ text: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    // Calculate topic counts for parsed items preview
    const parsedTopicCounts = {};
    for (const item of parsedItems) {
        parsedTopicCounts[item.section] = (parsedTopicCounts[item.section] || 0) + 1;
    }

    // Filter parsed items in preview
    const filteredParsedItems = parsedItems.filter((item) => {
        if (previewTopic !== 'ALL' && item.section !== previewTopic) return false;
        if (!previewSearch.trim()) return true;
        const q = previewSearch.toLowerCase().trim();
        return (
            (item.question_en && item.question_en.toLowerCase().includes(q)) ||
            (item.question_mr && item.question_mr.toLowerCase().includes(q)) ||
            (item.section && item.section.toLowerCase().includes(q)) ||
            (item.opt_a_en && item.opt_a_en.toLowerCase().includes(q)) ||
            (item.opt_b_en && item.opt_b_en.toLowerCase().includes(q)) ||
            (item.opt_c_en && item.opt_c_en.toLowerCase().includes(q)) ||
            (item.opt_d_en && item.opt_d_en.toLowerCase().includes(q))
        );
    });

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Question Bank Management</h1>
                    <p className={styles.subtitle}>
                        Upload and distribute syllabus questions (.pdf, .xlsx, .csv, .json) for student offline practice and mock exams.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    {summary && summary.totalQuestions > 0 && (
                        <button className={styles.dangerBtn} onClick={handleClearBank} disabled={loading}>
                            Clear Question Bank
                        </button>
                    )}
                </div>
            </div>

            {statusMsg && (
                <div
                    className={`${styles.statusMessage} ${
                        statusMsg.type === 'success'
                            ? styles.successMessage
                            : statusMsg.type === 'info'
                            ? styles.infoMessage
                            : styles.errorMessage
                    }`}
                >
                    {statusMsg.text}
                </div>
            )}

            {/* Stats Summary Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Questions</span>
                    <span className={styles.statValue}>{summary?.totalQuestions ?? 0}</span>
                    <span className={styles.statDesc}>
                        {summary?.lastUpdated ? `Updated ${new Date(summary.lastUpdated).toLocaleDateString()}` : 'No questions uploaded'}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active Syllabus Topics</span>
                    <span className={styles.statValue}>
                        {summary ? Object.keys(summary.topicCounts).length : 0} / 8
                    </span>
                    <span className={styles.statDesc}>MS-CIT Assessment Blueprint</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Sync Version</span>
                    <span className={styles.statValue}>{summary?.version ?? '2.0.0'}</span>
                    <span className={styles.statDesc}>Static Offline Available</span>
                </div>
            </div>

            {/* Upload Box */}
            <div className={styles.uploadCard}>
                <h2 className={styles.previewTitle} style={{ marginBottom: '1rem' }}>
                    Upload New Question Bank
                </h2>
                <div
                    className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf,.xlsx,.xls,.csv,.json"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleFileSelect(e.target.files[0]);
                            }
                        }}
                    />
                    <svg className={styles.dropIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <div className={styles.dropText}>
                        {parsedFileName ? `Selected: ${parsedFileName}` : 'Drag & Drop Question Bank (.pdf, .xlsx, .csv, .json)'}
                    </div>
                    <div className={styles.dropSubtext}>Click to browse from your computer. Supports PDF examination papers, Excel (.xlsx/.csv), or JSON.</div>
                </div>

                {/* Quick Load Pre-built Curricula */}
                <div className={styles.presetSection}>
                    <div className={styles.presetHeading}>Or Load Official MS-CIT / GCC-TBC Question Bank Directly:</div>
                    <div className={styles.presetButtonGroup}>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('FULL')}
                            disabled={loading || uploading}
                        >
                            📚 Full Question Bank (1,743 Qs)
                        </button>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('INTERNET')}
                            disabled={loading || uploading}
                        >
                            🌐 Internet Syllabus (365 Qs)
                        </button>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('WORD')}
                            disabled={loading || uploading}
                        >
                            📝 MS Word (355 Qs)
                        </button>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('EXCEL')}
                            disabled={loading || uploading}
                        >
                            📊 MS Excel (337 Qs)
                        </button>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('POWERPOINT')}
                            disabled={loading || uploading}
                        >
                            📽️ PowerPoint (348 Qs)
                        </button>
                        <button
                            type="button"
                            className={styles.presetBtn}
                            onClick={() => handleLoadPreset('FUNDAMENTALS')}
                            disabled={loading || uploading}
                        >
                            💻 Fundamentals (338 Qs)
                        </button>
                    </div>
                </div>

                {/* Preview of Parsed Items */}
                {parsedItems.length > 0 && (
                    <div ref={previewRef} className={styles.previewSection}>
                        <div className={styles.previewHeader}>
                            <div>
                                <h3 className={styles.previewTitle}>File Preview ({parsedItems.length} questions parsed)</h3>
                                <p className={styles.subtitle}>Review parsed questions, search, and click "Confirm & Upload" to save.</p>
                            </div>
                            <div className={styles.previewActions}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => {
                                        setParsedItems([]);
                                        setParsedFileName('');
                                        setPreviewSearch('');
                                        setPreviewTopic('ALL');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    onClick={handleConfirmUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading to Database...' : `Confirm & Upload (${parsedItems.length} Qs)`}
                                </button>
                            </div>
                        </div>

                        {/* Interactive Topic Filter Badges */}
                        <div className={styles.topicBadges}>
                            <button
                                type="button"
                                className={`${styles.filterBadge} ${previewTopic === 'ALL' ? styles.filterBadgeActive : ''}`}
                                onClick={() => setPreviewTopic('ALL')}
                            >
                                All Topics ({parsedItems.length})
                            </button>
                            {Object.entries(parsedTopicCounts).map(([topic, count]) => (
                                <button
                                    key={topic}
                                    type="button"
                                    className={`${styles.filterBadge} ${previewTopic === topic ? styles.filterBadgeActive : ''}`}
                                    onClick={() => setPreviewTopic(previewTopic === topic ? 'ALL' : topic)}
                                >
                                    {topic}: <strong>{count}</strong>
                                </button>
                            ))}
                        </div>

                        {/* Preview Search Bar */}
                        <div className={styles.searchBar}>
                            <div className={styles.searchWrapper}>
                                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
                                    <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                                </svg>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search parsed preview by question, options, or keyword..."
                                    value={previewSearch}
                                    onChange={(e) => setPreviewSearch(e.target.value)}
                                />
                                {previewSearch && (
                                    <button
                                        type="button"
                                        className={styles.clearBtn}
                                        onClick={() => setPreviewSearch('')}
                                        aria-label="Clear preview search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Topic</th>
                                        <th>Question (English)</th>
                                        <th>Option A</th>
                                        <th>Option B</th>
                                        <th>Option C</th>
                                        <th>Option D</th>
                                        <th>Ans</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParsedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                                No parsed questions matched your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredParsedItems.slice(0, 15).map((q, idx) => (
                                            <tr key={idx}>
                                                <td>{q.sr ?? idx + 1}</td>
                                                <td>
                                                    <span className={styles.badge}>{q.section}</span>
                                                </td>
                                                <td style={{ maxWidth: '300px' }}>{q.question_en}</td>
                                                <td>{q.opt_a_en}</td>
                                                <td>{q.opt_b_en}</td>
                                                <td>{q.opt_c_en}</td>
                                                <td>{q.opt_d_en}</td>
                                                <td>
                                                    <strong>{q.correct_option}</strong>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.tableSubtext}>
                            {previewSearch || previewTopic !== 'ALL' ? (
                                <span>Showing {Math.min(15, filteredParsedItems.length)} of {filteredParsedItems.length} matching questions ({parsedItems.length} total parsed)</span>
                            ) : (
                                <span>Showing first 15 of {parsedItems.length} parsed questions</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Live Question Bank Explorer */}
            <div className={styles.uploadCard}>
                <h2 className={styles.previewTitle} style={{ marginBottom: '1rem' }}>
                    Current Question Bank ({summary?.totalQuestions ?? 0} total)
                </h2>

                <div className={styles.searchBar}>
                    <div className={styles.searchWrapper}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
                            <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search questions by text, keyword or explanation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className={styles.clearBtn}
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <div className={styles.selectWrapper}>
                        <select
                            className={styles.selectInput}
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                        >
                            <option value="ALL">All Syllabus Topics</option>
                            {summary &&
                                Object.keys(summary.topicCounts).map((top) => (
                                    <option key={top} value={top}>
                                        {top} ({summary.topicCounts[top]})
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Sr</th>
                                <th>Topic</th>
                                <th>Question (English)</th>
                                <th>Question (Marathi)</th>
                                <th>Correct Ans</th>
                                <th>Explanation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                        {loading ? 'Loading questions...' : 'No questions found. Upload a question bank above.'}
                                    </td>
                                </tr>
                            ) : (
                                questions.map((q, idx) => (
                                    <tr key={q.id ?? idx}>
                                        <td>{q.sr ?? idx + 1}</td>
                                        <td>
                                            <span className={styles.badge}>{q.section}</span>
                                        </td>
                                        <td style={{ maxWidth: '280px' }}>{q.question_en}</td>
                                        <td style={{ maxWidth: '280px', color: 'var(--color-on-surface-variant)' }}>
                                            {q.question_mr || '-'}
                                        </td>
                                        <td>
                                            <strong>Option {q.correct_option}</strong> ({q.correct_answer})
                                        </td>
                                        <td style={{ maxWidth: '200px', color: 'var(--color-outline)' }}>
                                            {q.explanation_en || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.tableSubtext}>
                    {searchQuery ? (
                        <span>Found {questions.length} matching questions</span>
                    ) : (
                        <span>Showing {questions.length} questions</span>
                    )}
                </div>
            </div>
        </div>
    );
}
