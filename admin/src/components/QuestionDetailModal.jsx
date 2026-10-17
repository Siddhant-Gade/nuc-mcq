import React, { useEffect } from 'react';
import styles from './QuestionDetailModal.module.css';

export default function QuestionDetailModal({ question, onClose, onEdit }) {
    if (!question) return null;

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                onClose?.();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const options = [
        {
            key: 'A',
            en: question.opt_a_en,
            mr: question.opt_a_mr,
            hi: question.opt_a_hi,
            isCorrect: question.correct_option === 'A',
        },
        {
            key: 'B',
            en: question.opt_b_en,
            mr: question.opt_b_mr,
            hi: question.opt_b_hi,
            isCorrect: question.correct_option === 'B',
        },
        {
            key: 'C',
            en: question.opt_c_en,
            mr: question.opt_c_mr,
            hi: question.opt_c_hi,
            isCorrect: question.correct_option === 'C',
        },
        {
            key: 'D',
            en: question.opt_d_en,
            mr: question.opt_d_mr,
            hi: question.opt_d_hi,
            isCorrect: question.correct_option === 'D',
        },
    ];

    return (
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>Question Details</h2>
                        <span className={styles.topicBadge}>{question.section || 'General'}</span>
                        {question.sr && <span className={styles.srBadge}>Question #{question.sr}</span>}
                    </div>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close question details"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Question text */}
                    <div className={styles.questionSection}>
                        <div className={styles.sectionHeading}>Question Statement</div>
                        <div className={styles.questionTextEn}>{question.question_en}</div>

                        {question.question_mr && (
                            <div className={styles.translationBox}>
                                <div className={styles.translationLabel}>Marathi (मराठी)</div>
                                <div>{question.question_mr}</div>
                            </div>
                        )}

                        {question.question_hi && (
                            <div className={styles.translationBox}>
                                <div className={styles.translationLabel}>Hindi (हिंदी)</div>
                                <div>{question.question_hi}</div>
                            </div>
                        )}
                    </div>

                    {/* Options list */}
                    <div>
                        <div className={styles.sectionHeading}>Options & Answer Key</div>
                        <div className={styles.optionsGrid}>
                            {options.map((opt) => (
                                <div
                                    key={opt.key}
                                    className={`${styles.optionCard} ${
                                        opt.isCorrect ? styles.optionCardCorrect : ''
                                    }`}
                                >
                                    <div
                                        className={`${styles.optionLetter} ${
                                            opt.isCorrect ? styles.optionLetterCorrect : ''
                                        }`}
                                    >
                                        {opt.key}
                                    </div>
                                    <div className={styles.optionContent}>
                                        <div
                                            className={`${styles.optionText} ${
                                                opt.isCorrect ? styles.optionTextCorrect : ''
                                            }`}
                                        >
                                            {opt.en || '-'}
                                        </div>
                                        {opt.mr && (
                                            <div className={styles.optionTranslation}>
                                                <strong>मराठी:</strong> {opt.mr}
                                            </div>
                                        )}
                                        {opt.hi && (
                                            <div className={styles.optionTranslation}>
                                                <strong>हिंदी:</strong> {opt.hi}
                                            </div>
                                        )}
                                    </div>
                                    {opt.isCorrect && (
                                        <span className={styles.correctTag}>✓ Correct Option</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Explanation */}
                    {(question.explanation_en || question.explanation_mr || question.explanation_hi) && (
                        <div className={styles.explanationBox}>
                            <div className={styles.explanationTitle}>
                                💡 <span>Answer Explanation</span>
                            </div>
                            {question.explanation_en && (
                                <div className={styles.explanationText}>{question.explanation_en}</div>
                            )}
                            {question.explanation_mr && (
                                <div className={styles.explanationText}>
                                    <strong>मराठी:</strong> {question.explanation_mr}
                                </div>
                            )}
                            {question.explanation_hi && (
                                <div className={styles.explanationText}>
                                    <strong>हिंदी:</strong> {question.explanation_hi}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Meta info */}
                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Question ID</span>
                            <span className={styles.metaValue}>{question.id || 'N/A'}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Uploaded By</span>
                            <span className={styles.metaValue}>{question.uploaded_by || 'System / Admin'}</span>
                        </div>
                        {question.created_at && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Created</span>
                                <span className={styles.metaValue}>
                                    {new Date(question.created_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {question.updated_at && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Last Updated</span>
                                <span className={styles.metaValue}>
                                    {new Date(question.updated_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                        Close
                    </button>
                    {onEdit && (
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => {
                                onClose?.();
                                onEdit(question);
                            }}
                        >
                            Edit Question
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
