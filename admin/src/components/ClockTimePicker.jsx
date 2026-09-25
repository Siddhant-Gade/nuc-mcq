import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ClockTimePicker.module.css';

function parseTimeTo12h(time24) {
  if (!time24) return { time: '--:--', ampm: 'AM' };
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return { time: '--:--', ampm: 'AM' };
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hDisplay = h < 10 ? `0${h}` : `${h}`;
  return { time: `${hDisplay}:${m}`, ampm };
}

function addMinutes(time24, minsToAdd) {
  const base = time24 || '10:00';
  const parts = base.split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h)) h = 10;
  if (isNaN(m)) m = 0;
  const total = (h * 60 + m + minsToAdd) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(newH)}:${pad(newM)}`;
}

export default function ClockTimePicker({ value, onChange }) {
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [days, setDays] = useState('Mon–Sat');
  const [isManual, setIsManual] = useState(false);
  const [manualText, setManualText] = useState(value || '');

  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const buildOutput = useCallback((sTime, eTime, dOption) => {
    if (!sTime && !eTime) return '';
    const s12 = parseTimeTo12h(sTime);
    const e12 = parseTimeTo12h(eTime);
    const timePart = `${s12.time} ${s12.ampm} – ${e12.time} ${e12.ampm}`;
    return dOption ? `${dOption} ${timePart}` : timePart;
  }, []);

  const openPicker = (ref) => {
    try {
      if (ref.current?.showPicker) {
        ref.current.showPicker();
      } else {
        ref.current?.focus();
      }
    } catch {
      ref.current?.focus();
    }
  };

  const handleStartChange = (val) => {
    setStartTime(val);
    const newEnd = addMinutes(val, 60);
    setEndTime(newEnd);
    const out = buildOutput(val, newEnd, days);
    onChange(out);
  };

  const handleEndChange = (val) => {
    setEndTime(val);
    const out = buildOutput(startTime, val, days);
    onChange(out);
  };

  const handleDaysChange = (newDays) => {
    setDays(newDays);
    const out = buildOutput(startTime, endTime, newDays);
    onChange(out);
  };

  const handleQuickDuration = (mins) => {
    const newEnd = addMinutes(startTime, mins);
    setEndTime(newEnd);
    const out = buildOutput(startTime, newEnd, days);
    onChange(out);
  };

  const handleClear = () => {
    setStartTime('');
    setEndTime('');
    setDays('');
    setManualText('');
    onChange('');
  };

  const handleManualChange = (e) => {
    setManualText(e.target.value);
    onChange(e.target.value);
  };

  const start12 = parseTimeTo12h(startTime);
  const end12 = parseTimeTo12h(endTime);
  const currentFormatted = buildOutput(startTime, endTime, days);

  // Sync initial value if empty and we default to 10:00 - 11:00
  useEffect(() => {
    if (!value && !isManual && startTime && endTime) {
      onChange(buildOutput(startTime, endTime, days));
    }
  }, []);

  if (isManual) {
    return (
      <div className={styles.manualWrapper}>
        <input
          className={styles.manualInput}
          placeholder="e.g. Mon–Sat 10:00 AM – 12:00 PM"
          value={manualText}
          onChange={handleManualChange}
        />
        <button
          type="button"
          className={styles.switchModeBtn}
          onClick={() => {
            setIsManual(false);
            if (startTime && endTime) {
              onChange(buildOutput(startTime, endTime, days));
            }
          }}
        >
          🕒 Use Clock Picker
        </button>
      </div>
    );
  }

  return (
    <div className={styles.clockPickerContainer}>
      {/* Mobile-Style Dual Clock Display */}
      <div className={styles.clockRow}>
        {/* Start Time Clock Box */}
        <div
          className={styles.clockBox}
          onClick={() => openPicker(startInputRef)}
          role="button"
          tabIndex={0}
          title="Click to change Start Time"
        >
          <div className={styles.clockBoxHeader}>
            <span className={styles.clockBoxLabel}>FROM</span>
            <svg className={styles.clockIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.clockDigitsRow}>
            <span className={styles.clockDigits}>{start12.time}</span>
            <span className={`${styles.ampmBadge} ${start12.ampm === 'PM' ? styles.pm : styles.am}`}>
              {start12.ampm}
            </span>
          </div>
          <input
            ref={startInputRef}
            type="time"
            className={styles.nativeTimeInput}
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            aria-label="Start Time"
          />
        </div>

        <div className={styles.clockDivider}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        {/* End Time Clock Box */}
        <div
          className={styles.clockBox}
          onClick={() => openPicker(endInputRef)}
          role="button"
          tabIndex={0}
          title="Click to change End Time"
        >
          <div className={styles.clockBoxHeader}>
            <span className={styles.clockBoxLabel}>TO</span>
            <svg className={styles.clockIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.clockDigitsRow}>
            <span className={styles.clockDigits}>{end12.time}</span>
            <span className={`${styles.ampmBadge} ${end12.ampm === 'PM' ? styles.pm : styles.am}`}>
              {end12.ampm}
            </span>
          </div>
          <input
            ref={endInputRef}
            type="time"
            className={styles.nativeTimeInput}
            value={endTime}
            onChange={(e) => handleEndChange(e.target.value)}
            aria-label="End Time"
          />
        </div>
      </div>

      {/* Quick Duration Helpers */}
      <div className={styles.quickDurationRow}>
        <span className={styles.quickLabel}>Duration:</span>
        <button type="button" className={styles.durationChip} onClick={() => handleQuickDuration(60)}>
          1 hr
        </button>
        <button type="button" className={styles.durationChip} onClick={() => handleQuickDuration(90)}>
          1.5 hr
        </button>
        <button type="button" className={styles.durationChip} onClick={() => handleQuickDuration(120)}>
          2 hr
        </button>
      </div>

      {/* Day Frequency Chips */}
      <div className={styles.daysRow}>
        {[
          { label: 'Mon–Sat', value: 'Mon–Sat' },
          { label: 'Mon–Fri', value: 'Mon–Fri' },
          { label: 'Daily', value: 'Daily' },
          { label: 'Time only', value: '' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={`${styles.dayChip} ${days === item.value ? styles.dayChipActive : ''}`}
            onClick={() => handleDaysChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Formatted Output Badge / Clear Action */}
      {value ? (
        <div className={styles.previewCard}>
          <div className={styles.previewLeft}>
            <span className={styles.previewDot} />
            <span className={styles.previewText}>{value}</span>
          </div>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            title="Remove timing"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className={styles.previewCardEmpty}>
          <span>No timing set</span>
          <button
            type="button"
            className={styles.setDefaultsBtn}
            onClick={() => {
              setStartTime('10:00');
              setEndTime('11:00');
              setDays('Mon–Sat');
              onChange(buildOutput('10:00', '11:00', 'Mon–Sat'));
            }}
          >
            Set 10:00 AM
          </button>
        </div>
      )}

      {/* Toggle to manual free-text mode */}
      <div className={styles.footerRow}>
        <button
          type="button"
          className={styles.switchModeBtn}
          onClick={() => {
            setIsManual(true);
            setManualText(value || currentFormatted);
          }}
        >
          Type custom text instead
        </button>
      </div>
    </div>
  );
}
