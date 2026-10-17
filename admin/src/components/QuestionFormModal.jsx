import React, { useState } from 'react';
import styles from './QuestionFormModal.module.css';

const DEFAULT_TOPICS = [
    'MS Word',
    'MS Excel',
    'PowerPoint',
    'Internet',
    'Computer Fundamentals',
    'Windows',
    'PageMaker',
    'General',
];

export default function QuestionFormModal({ question, onConfirm, onCancel, existingTopics = [] }) {
    const isEdit = Boolean(question);
    const allTopics = Array.from(new Set([...DEFAULT_TOPICS, ...existingTopics])).filter(Boolean);

    // Form state
    const [section, setSection] = useState(question?.section || allTopics[0] || 'MS Word');
    const [customSection, setCustomSection] = useState(
        question?.section && !DEFAULT_TOPICS.includes(question.section) ? question.section : ''
    );
    const [isCustomSection, setIsCustomSection] = useState(
        question?.section ? !DEFAULT_TOPICS.includes(question.section) : false
    );

    const [questionEn, setQuestionEn] = useState(question?.question_en || '');
    const [optAEn, setOptAEn] = useState(question?.opt_a_en || '');
    const [optBEn, setOptBEn] = useState(question?.opt_b_en || '');
    const [optCEn, setOptCEn] = useState(question?.opt_c_en || '');
    const [optDEn, setOptDEn] = useState(question?.opt_d_en || '');
    const [correctOption, setCorrectOption] = useState(question?.correct_option || 'A');
    const [explanationEn, setExplanationEn] = useState(question?.explanation_en || '');

    // Optional multilingual fields
    const [showTranslations, setShowTranslations] = useState(
        Boolean(question?.question_mr || question?.question_hi)
    );
    const [questionMr, setQuestionMr] = useState(question?.question_mr || '');
    const [optAMr, setOptAMr] = useState(question?.opt_a_mr || '');
    const [optBMr, setOptBMr] = useState(question?.opt_b_mr || '');
    const [optCMr, setOptCMr] = useState(question?.opt_c_mr || '');
    const [optDMr, setOptDMr] = useState(question?.opt_d_mr || '');
    const [explanationMr, setExplanationMr] = useState(question?.explanation_mr || '');

    const [questionHi, setQuestionHi] = useState(question?.question_hi || '');
    const [optAHi, setOptAHi] = useState(question?.opt_a_hi || '');
    const [optBHi, setOptBHi] = useState(question?.opt_b_hi || '');
    const [optCHi, setOptCHi] = useState(question?.opt_c_hi || '');
    const [optDHi, setOptDHi] = useState(question?.opt_d_hi || '');
    const [explanationHi, setExplanationHi] = useState(question?.explanation_hi || '');

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function validate() {
        const e = {};
        const finalSection = isCustomSection ? customSection.trim() : section.trim();
        if (!finalSection) e.section = 'Syllabus topic is required.';
        if (!questionEn.trim()) e.questionEn = 'Question text in English is required.';
        if (!optAEn.trim()) e.optAEn = 'Option A is required.';
        if (!optBEn.trim()) e.optBEn = 'Option B is required.';
        if (!optCEn.trim()) e.optCEn = 'Option C is required.';
        if (!optDEn.trim()) e.optDEn = 'Option D is required.';
        return e;
    }

    async function handleSubmit(ev) {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        const finalSection = isCustomSection ? customSection.trim() : section.trim();
        const opts = [optAEn.trim(), optBEn.trim(), optCEn.trim(), optDEn.trim()];
        const idxMap = { A: 0, B: 1, C: 2, D: 3 };
        const correctIdx = idxMap[correctOption] ?? 0;
        const correctAnswer = opts[correctIdx] || optAEn.trim();

        const payload = {
            section: finalSection,
            question_en: questionEn.trim(),
            opt_a_en: optAEn.trim(),
            opt_b_en: optBEn.trim(),
            opt_c_en: optCEn.trim(),
            opt_d_en: optDEn.trim(),
            correct_option: correctOption,
            correct_index: correctIdx,
            correct_answer: correctAnswer,
            explanation_en: explanationEn.trim() || null,
            question_mr: questionMr.trim() || null,
            opt_a_mr: optAMr.trim() || null,
            opt_b_mr: optBMr.trim() || null,
            opt_c_mr: optCMr.trim() || null,
            opt_d_mr: optDMr.trim() || null,
            explanation_mr: explanationMr.trim() || null,
            question_hi: questionHi.trim() || null,
            opt_a_hi: optAHi.trim() || null,
            opt_b_hi: optBHi.trim() || null,
            opt_c_hi: optCHi.trim() || null,
            opt_d_hi: optDHi.trim() || null,
            explanation_hi: explanationHi.trim() || null,
        };

        try {
            setSubmitting(true);
            await onConfirm(payload);
        } catch (err) {
            setErrors({ submit: err?.message || 'Operation failed.' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.overlay} onClick={() => !submitting && onCancel()}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.title}>{isEdit ? 'Edit Question' : 'Add New Question'}</h2>
                    <button className={styles.closeBtn} onClick={onCancel} disabled={submitting}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <form className={styles.modalBody} onSubmit={handleSubmit}>
                    {errors.submit && <div className={styles.errorText}>{errors.submit}</div>}

                    {/* Topic Selection */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Topic / Syllabus Section<span className={styles.required}>*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!isCustomSection ? (
                                <select
                                    className={`${styles.select} ${errors.section ? styles.inputError : ''}`}
                                    value={section}
                                    onChange={(e) => {
                                        if (e.target.value === '__CUSTOM__') {
                                            setIsCustomSection(true);
                                        } else {
                                            setSection(e.target.value);
                                        }
                                    }}
                                >
                                    {allTopics.map((top) => (
                                        <option key={top} value={top}>
                                            {top}
                                        </option>
                                    ))}
                                    <option value="__CUSTOM__">+ Custom Topic...</option>
                                </select>
                            ) : (
                                <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${errors.section ? styles.inputError : ''}`}
                                        placeholder="Enter custom topic name (e.g. PageMaker)"
                                        value={customSection}
                                        onChange={(e) => setCustomSection(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        style={{ height: 'auto', padding: '0 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => setIsCustomSection(false)}
                                    >
                                        Back
                                    </button>
                                </div>
                            )}
                        </div>
                        {errors.section && <span className={styles.errorText}>{errors.section}</span>}
                    </div>

                    {/* Question (English) */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Question (English)<span className={styles.required}>*</span>
                        </label>
                        <textarea
                            className={`${styles.textarea} ${errors.questionEn ? styles.inputError : ''}`}
                            placeholder="Enter the question text in English..."
                            value={questionEn}
                            onChange={(e) => setQuestionEn(e.target.value)}
                            rows={3}
                        />
                        {errors.questionEn && <span className={styles.errorText}>{errors.questionEn}</span>}
                    </div>

                    {/* Four Options */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Options (English)<span className={styles.required}>*</span>
                        </label>
                        <div className={styles.optionsContainer}>
                            <div className={styles.optionRow}>
                                <button
                                    type="button"
                                    className={`${styles.optionBadge} ${correctOption === 'A' ? styles.optionBadgeActive : ''}`}
                                    onClick={() => setCorrectOption('A')}
                                    title="Mark Option A as correct answer"
                                >
                                    A
                                </button>
                                <input
                                    type="text"
                                    className={`${styles.input} ${errors.optAEn ? styles.inputError : ''}`}
                                    placeholder="Option A text"
                                    value={optAEn}
                                    onChange={(e) => setOptAEn(e.target.value)}
                                />
                            </div>
                            <div className={styles.optionRow}>
                                <button
                                    type="button"
                                    className={`${styles.optionBadge} ${correctOption === 'B' ? styles.optionBadgeActive : ''}`}
                                    onClick={() => setCorrectOption('B')}
                                    title="Mark Option B as correct answer"
                                >
                                    B
                                </button>
                                <input
                                    type="text"
                                    className={`${styles.input} ${errors.optBEn ? styles.inputError : ''}`}
                                    placeholder="Option B text"
                                    value={optBEn}
                                    onChange={(e) => setOptBEn(e.target.value)}
                                />
                            </div>
                            <div className={styles.optionRow}>
                                <button
                                    type="button"
                                    className={`${styles.optionBadge} ${correctOption === 'C' ? styles.optionBadgeActive : ''}`}
                                    onClick={() => setCorrectOption('C')}
                                    title="Mark Option C as correct answer"
                                >
                                    C
                                </button>
                                <input
                                    type="text"
                                    className={`${styles.input} ${errors.optCEn ? styles.inputError : ''}`}
                                    placeholder="Option C text"
                                    value={optCEn}
                                    onChange={(e) => setOptCEn(e.target.value)}
                                />
                            </div>
                            <div className={styles.optionRow}>
                                <button
                                    type="button"
                                    className={`${styles.optionBadge} ${correctOption === 'D' ? styles.optionBadgeActive : ''}`}
                                    onClick={() => setCorrectOption('D')}
                                    title="Mark Option D as correct answer"
                                >
                                    D
                                </button>
                                <input
                                    type="text"
                                    className={`${styles.input} ${errors.optDEn ? styles.inputError : ''}`}
                                    placeholder="Option D text"
                                    value={optDEn}
                                    onChange={(e) => setOptDEn(e.target.value)}
                                />
                            </div>
                        </div>
                        {(errors.optAEn || errors.optBEn || errors.optCEn || errors.optDEn) && (
                            <span className={styles.errorText}>All 4 options (A, B, C, D) are required.</span>
                        )}
                    </div>

                    {/* Correct Answer Selector Indicator */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Correct Option<span className={styles.required}>*</span>
                        </label>
                        <div className={styles.correctSelector}>
                            {['A', 'B', 'C', 'D'].map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    className={`${styles.correctPill} ${correctOption === opt ? styles.correctPillActive : ''}`}
                                    onClick={() => setCorrectOption(opt)}
                                >
                                    <span>Option {opt}</span>
                                    {correctOption === opt && <span>✓ Correct</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Explanation / Rationale (Optional)</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Helpful explanation shown to students after test completion..."
                            value={explanationEn}
                            onChange={(e) => setExplanationEn(e.target.value)}
                        />
                    </div>

                    {/* Multilingual Toggle */}
                    <div>
                        <button
                            type="button"
                            className={styles.toggleLangBtn}
                            onClick={() => setShowTranslations((prev) => !prev)}
                        >
                            {showTranslations ? '− Hide Marathi & Hindi Translations' : '+ Add Marathi & Hindi Translations (Optional)'}
                        </button>
                    </div>

                    {showTranslations && (
                        <div className={styles.multilingualSection}>
                            <h4 style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface)' }}>
                                Marathi (मराठी) Translation
                            </h4>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Question (मराठी)</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="मराठी प्रश्न..."
                                    value={questionMr}
                                    onChange={(e) => setQuestionMr(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className={styles.formGrid}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="पर्याय A (मराठी)"
                                    value={optAMr}
                                    onChange={(e) => setOptAMr(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="पर्याय B (मराठी)"
                                    value={optBMr}
                                    onChange={(e) => setOptBMr(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="पर्याय C (मराठी)"
                                    value={optCMr}
                                    onChange={(e) => setOptCMr(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="पर्याय D (मराठी)"
                                    value={optDMr}
                                    onChange={(e) => setOptDMr(e.target.value)}
                                />
                            </div>

                            <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface)' }}>
                                Hindi (हिंदी) Translation
                            </h4>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Question (हिंदी)</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="हिंदी प्रश्न..."
                                    value={questionHi}
                                    onChange={(e) => setQuestionHi(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className={styles.formGrid}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="विकल्प A (हिंदी)"
                                    value={optAHi}
                                    onChange={(e) => setOptAHi(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="विकल्प B (हिंदी)"
                                    value={optBHi}
                                    onChange={(e) => setOptBHi(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="विकल्प C (हिंदी)"
                                    value={optCHi}
                                    onChange={(e) => setOptCHi(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="विकल्प D (हिंदी)"
                                    value={optDHi}
                                    onChange={(e) => setOptDHi(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
