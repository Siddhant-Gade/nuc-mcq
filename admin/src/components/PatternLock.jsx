import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './PatternLock.module.css';

/**
 * 3x3 Interactive Pattern Lock Component
 * Supports both touch dragging, mouse dragging, and clicking.
 * Returns connected dot sequence like "0-1-2-4-7".
 */
export default function PatternLock({
    onComplete,
    disabled = false,
    minPoints = 4,
    error = false,
    helperMessage = '',
}) {
    const boardRef = useRef(null);
    const [selectedDots, setSelectedDots] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [cursorPos, setCursorPos] = useState(null);
    const dotRefs = useRef([]);

    // Compute relative center of dot index (0-8) inside board
    const getDotCenter = useCallback((index) => {
        const board = boardRef.current;
        const dot = dotRefs.current[index];
        if (!board || !dot) return { x: 0, y: 0 };
        const bRect = board.getBoundingClientRect();
        const dRect = dot.getBoundingClientRect();
        return {
            x: dRect.left - bRect.left + dRect.width / 2,
            y: dRect.top - bRect.top + dRect.height / 2,
        };
    }, []);

    // Detect which dot index is at client coordinates (clientX, clientY)
    const getDotAtCoord = useCallback((clientX, clientY) => {
        for (let i = 0; i < 9; i++) {
            const el = dotRefs.current[i];
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            // Generous hit target
            const padding = 12;
            if (
                clientX >= rect.left - padding &&
                clientX <= rect.right + padding &&
                clientY >= rect.top - padding &&
                clientY <= rect.bottom + padding
            ) {
                return i;
            }
        }
        return -1;
    }, []);

    const handlePointerDown = (e) => {
        if (disabled) return;
        const dotIndex = getDotAtCoord(e.clientX, e.clientY);
        if (dotIndex !== -1) {
            setIsDrawing(true);
            setSelectedDots([dotIndex]);
            const board = boardRef.current?.getBoundingClientRect();
            if (board) {
                setCursorPos({ x: e.clientX - board.left, y: e.clientY - board.top });
            }
        }
    };

    const handlePointerMove = (e) => {
        if (!isDrawing || disabled) return;
        const board = boardRef.current?.getBoundingClientRect();
        if (board) {
            setCursorPos({ x: e.clientX - board.left, y: e.clientY - board.top });
        }
        const dotIndex = getDotAtCoord(e.clientX, e.clientY);
        if (dotIndex !== -1 && !selectedDots.includes(dotIndex)) {
            setSelectedDots((prev) => [...prev, dotIndex]);
        }
    };

    const finishPattern = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setCursorPos(null);

        if (selectedDots.length >= minPoints) {
            const patternStr = selectedDots.join('-');
            onComplete?.(patternStr, selectedDots.length);
        } else if (selectedDots.length > 0) {
            // Less than minimum
            onComplete?.('', selectedDots.length);
        }
    }, [isDrawing, selectedDots, minPoints, onComplete]);

    const handlePointerUp = () => {
        finishPattern();
    };

    const handleClear = () => {
        setSelectedDots([]);
        setCursorPos(null);
        setIsDrawing(false);
        onComplete?.('', 0);
    };

    // Attach window pointerup listener in case user releases outside board
    useEffect(() => {
        const handleWindowPointerUp = () => {
            if (isDrawing) {
                finishPattern();
            }
        };
        window.addEventListener('pointerup', handleWindowPointerUp);
        return () => window.removeEventListener('pointerup', handleWindowPointerUp);
    }, [isDrawing, finishPattern]);

    // Build SVG path points
    const lines = [];
    for (let i = 0; i < selectedDots.length - 1; i++) {
        const from = getDotCenter(selectedDots[i]);
        const to = getDotCenter(selectedDots[i + 1]);
        lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }

    const lastCenter = selectedDots.length > 0
        ? getDotCenter(selectedDots[selectedDots.length - 1])
        : null;

    return (
        <div className={styles.container}>
            <div
                ref={boardRef}
                className={styles.board}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <svg className={styles.svg}>
                    {lines.map((l, idx) => (
                        <line
                            key={idx}
                            x1={l.x1}
                            y1={l.y1}
                            x2={l.x2}
                            y2={l.y2}
                            className={styles.line}
                            style={{ stroke: error ? 'var(--color-error)' : 'var(--color-primary)' }}
                        />
                    ))}
                    {isDrawing && lastCenter && cursorPos && (
                        <line
                            x1={lastCenter.x}
                            y1={lastCenter.y}
                            x2={cursorPos.x}
                            y2={cursorPos.y}
                            className={styles.liveLine}
                            style={{ stroke: error ? 'var(--color-error)' : 'var(--color-primary)' }}
                        />
                    )}
                </svg>

                <div className={styles.dotsGrid}>
                    {Array.from({ length: 9 }).map((_, idx) => {
                        const isSelected = selectedDots.includes(idx);
                        return (
                            <div key={idx} className={styles.dotCell}>
                                <div
                                    ref={(el) => (dotRefs.current[idx] = el)}
                                    className={`${styles.dotCircle} ${isSelected ? (error ? styles.dotError : styles.dotActive) : ''}`}
                                >
                                    <div className={styles.dotInner} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={styles.helperText} style={{ color: error ? 'var(--color-error)' : undefined }}>
                {helperMessage || (selectedDots.length > 0
                    ? `Connected ${selectedDots.length} dots ${selectedDots.length < minPoints ? `(minimum ${minPoints})` : '✓'}`
                    : `Connect at least ${minPoints} dots to form pattern`)}
            </div>

            {selectedDots.length > 0 && (
                <button type="button" className={styles.clearBtn} onClick={handleClear}>
                    Clear Pattern
                </button>
            )}
        </div>
    );
}
