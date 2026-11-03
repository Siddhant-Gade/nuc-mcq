import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPinStatus, setupPin, verifyPin, getAdmins, createAdmin, deleteAdmin } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import PatternLock from '../components/PatternLock';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './CreateAdmin.module.css';

function getPasswordStrength(pwd) {
    if (!pwd) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, text: 'Weak', color: '#ef4444' };
    if (score === 3) return { score: 2, text: 'Fair', color: '#f59e0b' };
    if (score === 4) return { score: 3, text: 'Good', color: '#10b981' };
    return { score: 4, text: 'Strong', color: '#059669' };
}

export default function CreateAdmin() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Security & Unlock State
    const [checkingPin, setCheckingPin] = useState(true);
    const [hasPin, setHasPin] = useState(false);
    const [securityType, setSecurityType] = useState('pin'); // 'pin' | 'pattern' | 'password'
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [activePin, setActivePin] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [confirmPinInput, setConfirmPinInput] = useState('');
    const [patternVal, setPatternVal] = useState('');
    const [confirmPatternVal, setConfirmPatternVal] = useState('');
    const [patternStep, setPatternStep] = useState(1); // 1 = draw, 2 = confirm
    const [selectedMode, setSelectedMode] = useState('pin'); // for setup/change
    const [showChangeSecurity, setShowChangeSecurity] = useState(false);
    const [currentPinForChange, setCurrentPinForChange] = useState('');

    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    // Admin Creation State
    const [admins, setAdmins] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState(null);

    useEffect(() => {
        checkPinStatus();
    }, []);

    async function checkPinStatus() {
        setCheckingPin(true);
        try {
            const status = await getPinStatus();
            setHasPin(status?.hasPin ?? false);
            if (status?.securityType) {
                setSecurityType(status.securityType);
                setSelectedMode(status.securityType);
            }
            if (status?.updatedAt) {
                setLastUpdated(status.updatedAt);
            }
        } catch (err) {
            console.error('Error checking PIN status:', err);
        } finally {
            setCheckingPin(false);
        }
    }

    async function loadAdminList() {
        try {
            const list = await getAdmins();
            setAdmins(list || []);
        } catch (err) {
            console.error('Error loading admins:', err);
        }
    }

    // Handle Setting Up or Updating Security Credential
    async function handleSetupSecurity(e) {
        if (e?.preventDefault) e.preventDefault();
        setPinError('');

        let finalSecret = '';

        if (selectedMode === 'pattern') {
            if (!patternVal || patternVal.split('-').length < 4) {
                setPinError('Pattern must connect at least 4 dots.');
                return;
            }
            if (patternVal !== confirmPatternVal) {
                setPinError('Pattern confirmation does not match. Please draw again.');
                setPatternStep(1);
                setPatternVal('');
                setConfirmPatternVal('');
                return;
            }
            finalSecret = patternVal;
        } else {
            if (!pinInput || pinInput.length < 4) {
                setPinError(selectedMode === 'pin' ? 'PIN must be at least 4 digits.' : 'Password must be at least 4 characters.');
                return;
            }
            if (pinInput !== confirmPinInput) {
                setPinError('Confirmation does not match.');
                return;
            }
            finalSecret = pinInput;
        }

        setPinLoading(true);
        try {
            const payload = {
                pin: finalSecret,
                securityType: selectedMode,
                ...(showChangeSecurity ? { currentPin: currentPinForChange } : {}),
            };
            await setupPin(payload);
            setHasPin(true);
            setSecurityType(selectedMode);
            setActivePin(finalSecret);
            setIsUnlocked(true);
            setShowChangeSecurity(false);
            setPinInput('');
            setConfirmPinInput('');
            setPatternVal('');
            setConfirmPatternVal('');
            setCurrentPinForChange('');
            loadAdminList();
            setActionMsg({
                type: 'success',
                text: `Master Security ${selectedMode === 'pattern' ? 'Pattern' : selectedMode === 'pin' ? 'PIN' : 'Password'} saved successfully.`,
            });
        } catch (err) {
            setPinError(getErrorMessage(err));
        } finally {
            setPinLoading(false);
        }
    }

    // Handle Unlocking with Credential
    async function handleVerify(secretToVerify) {
        const secret = secretToVerify || pinInput;
        setPinError('');
        if (!secret) {
            setPinError(securityType === 'pattern' ? 'Please draw your pattern.' : 'Please enter your security key.');
            return;
        }

        setPinLoading(true);
        try {
            const res = await verifyPin(secret);
            setActivePin(secret);
            if (res?.securityType) setSecurityType(res.securityType);
            setIsUnlocked(true);
            loadAdminList();
        } catch (err) {
            setPinError(getErrorMessage(err));
        } finally {
            setPinLoading(false);
        }
    }

    function validate() {
        const e = {};
        if (!name.trim()) e.name = 'Full name is required.';
        if (!email.trim()) e.email = 'Gmail address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
        if (newAdminPassword && newAdminPassword.length < 6) {
            e.password = 'Password must be at least 6 characters.';
        }
        return e;
    }

    function handleCreateClick() {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setShowConfirm(true);
    }

    async function handleConfirm() {
        setLoading(true);
        setErrors({});
        try {
            const res = await createAdmin({
                name: name.trim(),
                email: email.trim(),
                pin: activePin,
                password: newAdminPassword.trim() || undefined,
            });
            setShowConfirm(false);
            setName('');
            setEmail('');
            setNewAdminPassword('');
            setActionMsg({
                type: 'success',
                text: res?.message || `Admin access granted to ${email}.`,
            });
            loadAdminList();
        } catch (err) {
            setShowConfirm(false);
            setErrors({ submit: getErrorMessage(err) });
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteAdmin(admin) {
        if (admin.isSuperAdmin) return;
        const confirmed = window.confirm(`Revoke admin access for "${admin.name}" (${admin.email})?`);
        if (!confirmed) return;

        try {
            await deleteAdmin(admin.id, activePin);
            setActionMsg({ type: 'success', text: `Admin access revoked for ${admin.email}.` });
            loadAdminList();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    }

    if (checkingPin) {
        return (
            <div className={pageStyles.pageHeader}>
                <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
                <p className={styles.subtext}>Checking security verification status...</p>
            </div>
        );
    }

    // Step 1: Security Barrier if not unlocked
    if (!isUnlocked) {
        // A) Initial Setup if no PIN/Pattern is configured yet
        if (!hasPin) {
            return (
                <div>
                    <div className={pageStyles.pageHeader}>
                        <div>
                            <h1 className={pageStyles.heading}>Admin Security Setup</h1>
                            <p className={styles.subtext}>Protect admin account management with Master Security protection.</p>
                        </div>
                    </div>

                    <div className={styles.pinCard}>
                        <div className={styles.pinIcon}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h2 className={styles.pinTitle}>Create Master Security Key</h2>
                        <p className={styles.pinSubtext}>
                            Choose your preferred authentication method to protect administrator accounts.
                        </p>

                        {/* Mode Switcher Tabs */}
                        <div className={styles.modeTabs}>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'pin' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('pin'); setPinError(''); }}
                            >
                                🔢 Numeric PIN
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'pattern' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('pattern'); setPinError(''); setPatternStep(1); }}
                            >
                                🔏 Pattern Lock
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'password' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('password'); setPinError(''); }}
                            >
                                🔑 Password
                            </button>
                        </div>

                        {selectedMode === 'pattern' ? (
                            <div>
                                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                                    {patternStep === 1 ? 'Step 1: Draw your new pattern' : 'Step 2: Re-draw pattern to confirm'}
                                </p>
                                <PatternLock
                                    onComplete={(pat, count) => {
                                        if (patternStep === 1) {
                                            if (count >= 4) {
                                                setPatternVal(pat);
                                                setPatternStep(2);
                                                setPinError('');
                                            } else {
                                                setPinError('Connect at least 4 dots.');
                                            }
                                        } else {
                                            setConfirmPatternVal(pat);
                                            if (pat === patternVal) {
                                                setPinError('');
                                            } else {
                                                setPinError('Confirmation does not match. Please redraw.');
                                            }
                                        }
                                    }}
                                    error={Boolean(pinError)}
                                    helperMessage={pinError}
                                />

                                {patternStep === 2 && (
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            onClick={() => { setPatternStep(1); setPatternVal(''); setConfirmPatternVal(''); }}
                                        >
                                            Redraw
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.submitBtn}
                                            disabled={!confirmPatternVal || confirmPatternVal !== patternVal || pinLoading}
                                            onClick={handleSetupSecurity}
                                        >
                                            {pinLoading ? 'Saving Pattern...' : 'Save Pattern & Proceed'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSetupSecurity}>
                                <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                    <label className={styles.label}>
                                        {selectedMode === 'pin' ? 'New 4-8 Digit PIN' : 'New Security Password'}
                                    </label>
                                    <input
                                        type={selectedMode === 'pin' ? 'password' : 'text'}
                                        maxLength={selectedMode === 'pin' ? '8' : '40'}
                                        className={styles.pinInput}
                                        placeholder={selectedMode === 'pin' ? '••••' : 'Enter strong password'}
                                        value={pinInput}
                                        onChange={(e) => setPinInput(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
                                    <label className={styles.label}>
                                        {selectedMode === 'pin' ? 'Confirm Security PIN' : 'Confirm Password'}
                                    </label>
                                    <input
                                        type={selectedMode === 'pin' ? 'password' : 'text'}
                                        maxLength={selectedMode === 'pin' ? '8' : '40'}
                                        className={styles.pinInput}
                                        placeholder={selectedMode === 'pin' ? '••••' : 'Confirm password'}
                                        value={confirmPinInput}
                                        onChange={(e) => setConfirmPinInput(e.target.value)}
                                    />
                                </div>

                                {pinError && <div className={styles.errorText} style={{ marginBottom: '1rem' }}>{pinError}</div>}

                                <button type="submit" className={styles.submitBtn} style={{ width: '100%', height: '2.5rem' }} disabled={pinLoading}>
                                    {pinLoading ? 'Saving...' : 'Save Credential & Proceed'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            );
        }

        // B) Security Verification Barrier (PIN, Pattern, or Password)
        return (
            <div>
                <div className={pageStyles.pageHeader}>
                    <div>
                        <h1 className={pageStyles.heading}>Admin Security Verification</h1>
                        <p className={styles.subtext}>Authorized administrators only.</p>
                    </div>
                </div>

                <div className={styles.pinCard}>
                    <div className={styles.pinIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 className={styles.pinTitle}>
                        {securityType === 'pattern' ? 'Draw Master Pattern' : securityType === 'password' ? 'Enter Master Password' : 'Enter Security PIN'}
                    </h2>
                    <p className={styles.pinSubtext}>
                        {securityType === 'pattern'
                            ? 'Connect your configured pattern to unlock Administrator Management.'
                            : 'Enter your configured master credential to unlock Administrator Management.'}
                    </p>

                    {securityType === 'pattern' ? (
                        <div>
                            <PatternLock
                                onComplete={(pat) => {
                                    if (pat) handleVerify(pat);
                                }}
                                disabled={pinLoading}
                                error={Boolean(pinError)}
                                helperMessage={pinError || (pinLoading ? 'Verifying pattern...' : 'Draw pattern to unlock')}
                            />
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
                            <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                <input
                                    type="password"
                                    maxLength={securityType === 'pin' ? '8' : '40'}
                                    className={styles.pinInput}
                                    placeholder="••••"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {pinError && <div className={styles.errorText} style={{ marginBottom: '1rem' }}>{pinError}</div>}

                            <button type="submit" className={styles.submitBtn} style={{ width: '100%', height: '2.5rem' }} disabled={pinLoading}>
                                {pinLoading ? 'Verifying...' : 'Unlock Admin Portal'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    const pwdStrength = getPasswordStrength(newAdminPassword);

    // Step 2: Unlocked Admin Management
    return (
        <div>
            <div className={pageStyles.pageHeader}>
                <div>
                    <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
                    <p className={styles.subtext}>Manage authorized administrators and master security configurations.</p>
                </div>
                <button
                    className={styles.cancelBtn}
                    onClick={() => {
                        setIsUnlocked(false);
                        setActivePin('');
                        setPinInput('');
                        setShowChangeSecurity(false);
                    }}
                    style={{ height: '2.25rem', padding: '0 0.875rem' }}
                >
                    🔒 Lock Portal
                </button>
            </div>

            {actionMsg && (
                <div style={{
                    padding: '0.875rem 1rem',
                    marginBottom: '1.25rem',
                    borderRadius: '8px',
                    background: actionMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${actionMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    color: actionMsg.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>{actionMsg.text}</span>
                    <button
                        onClick={() => setActionMsg(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {errors.submit && (
                <div className={pageStyles.errorBanner} style={{ marginBottom: '1.25rem' }}>
                    <span>{errors.submit}</span>
                </div>
            )}

            {/* Sub-module 1: Master Security Protection & Pattern/Password Configuration */}
            <div className={styles.securitySubmoduleCard}>
                <div className={styles.securityHeader}>
                    <div className={styles.securityTitle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span>Master Security Sub-Module</span>
                    </div>
                    <span className={styles.securityStatusBadge}>
                        <span style={{ fontSize: '0.55rem' }}>●</span>
                        Active & Protected
                    </span>
                </div>

                <div className={styles.securityInfoGrid}>
                    <div className={styles.securityInfoItem}>
                        <span className={styles.securityInfoLabel}>Lock Protection Mode</span>
                        <span className={styles.securityInfoValue}>
                            {securityType === 'pattern' ? '🔏 3x3 Pattern Lock' : securityType === 'password' ? '🔑 Password Key' : '🔢 Numeric PIN'}
                        </span>
                    </div>
                    <div className={styles.securityInfoItem}>
                        <span className={styles.securityInfoLabel}>Access Barrier</span>
                        <span className={styles.securityInfoValue}>Required on Admin Management</span>
                    </div>
                    <div className={styles.securityInfoItem}>
                        <span className={styles.securityInfoLabel}>Last Updated</span>
                        <span className={styles.securityInfoValue}>
                            {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Active session'}
                        </span>
                    </div>
                </div>

                {!showChangeSecurity ? (
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => {
                            setShowChangeSecurity(true);
                            setSelectedMode(securityType);
                            setPinError('');
                            setPinInput('');
                            setConfirmPinInput('');
                        }}
                    >
                        ⚙️ Update Master Password, PIN or Pattern
                    </button>
                ) : (
                    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Change Master Security Key</h4>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                style={{ height: '1.75rem', fontSize: '0.75rem' }}
                                onClick={() => setShowChangeSecurity(false)}
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Current key verification */}
                        <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                            <label className={styles.label}>Enter Current Master Key / PIN to authorize change:</label>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="Current PIN / Password / Pattern string"
                                value={currentPinForChange}
                                onChange={(e) => setCurrentPinForChange(e.target.value)}
                                style={{ maxWidth: '20rem' }}
                            />
                        </div>

                        <div className={styles.modeTabs} style={{ maxWidth: '28rem', margin: '0.75rem 0' }}>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'pin' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('pin'); setPinError(''); }}
                            >
                                🔢 Numeric PIN
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'pattern' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('pattern'); setPinError(''); setPatternStep(1); }}
                            >
                                🔏 Pattern Lock
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeTab} ${selectedMode === 'password' ? styles.modeTabActive : ''}`}
                                onClick={() => { setSelectedMode('password'); setPinError(''); }}
                            >
                                🔑 Password
                            </button>
                        </div>

                        {selectedMode === 'pattern' ? (
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                                    {patternStep === 1 ? 'Draw new pattern' : 'Confirm new pattern'}
                                </p>
                                <PatternLock
                                    onComplete={(pat, count) => {
                                        if (patternStep === 1) {
                                            if (count >= 4) {
                                                setPatternVal(pat);
                                                setPatternStep(2);
                                                setPinError('');
                                            } else {
                                                setPinError('Connect at least 4 dots.');
                                            }
                                        } else {
                                            setConfirmPatternVal(pat);
                                            if (pat !== patternVal) {
                                                setPinError('Pattern does not match.');
                                            }
                                        }
                                    }}
                                    error={Boolean(pinError)}
                                    helperMessage={pinError}
                                />
                                {patternStep === 2 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            onClick={() => { setPatternStep(1); setPatternVal(''); setConfirmPatternVal(''); }}
                                        >
                                            Redraw
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.submitBtn}
                                            disabled={!confirmPatternVal || confirmPatternVal !== patternVal || !currentPinForChange || pinLoading}
                                            onClick={handleSetupSecurity}
                                        >
                                            {pinLoading ? 'Updating...' : 'Save New Pattern'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxWidth: '20rem' }}>
                                <div className={styles.formGroup} style={{ marginBottom: '0.5rem' }}>
                                    <label className={styles.label}>{selectedMode === 'pin' ? 'New PIN' : 'New Password'}</label>
                                    <input
                                        type={selectedMode === 'pin' ? 'password' : 'text'}
                                        className={styles.input}
                                        placeholder={selectedMode === 'pin' ? '••••' : 'Enter new password'}
                                        value={pinInput}
                                        onChange={(e) => setPinInput(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                                    <label className={styles.label}>Confirm</label>
                                    <input
                                        type={selectedMode === 'pin' ? 'password' : 'text'}
                                        className={styles.input}
                                        placeholder={selectedMode === 'pin' ? '••••' : 'Confirm new password'}
                                        value={confirmPinInput}
                                        onChange={(e) => setConfirmPinInput(e.target.value)}
                                    />
                                </div>
                                {pinError && <div className={styles.errorText} style={{ marginBottom: '0.5rem' }}>{pinError}</div>}
                                <button
                                    type="button"
                                    className={styles.submitBtn}
                                    disabled={!pinInput || !confirmPinInput || !currentPinForChange || pinLoading}
                                    onClick={handleSetupSecurity}
                                >
                                    {pinLoading ? 'Updating...' : 'Save New Credential'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sub-module 2: Add New Admin Form */}
            <div className={styles.formCard}>
                <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCreateClick(); }}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.25"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                            Add New Administrator
                        </h3>
                        <div className={styles.fieldGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName"
                                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                                    placeholder="e.g. Rajesh Sharma"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}
                                />
                                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="email">Gmail Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                                    placeholder="e.g. rajesh@gmail.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
                                />
                                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                            </div>
                        </div>

                        {/* Extra Password Set Sub-Field */}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-outline-variant)' }}>
                            <div className={styles.formGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className={styles.label} htmlFor="adminPassword">
                                        Extra Password Setup <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>(Optional)</span>
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                                        Enables Email + Password Login
                                    </span>
                                </div>

                                <div className={styles.passwordWrap}>
                                    <input
                                        id="adminPassword"
                                        type={showNewAdminPassword ? 'text' : 'password'}
                                        className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                                        placeholder="Set an admin password or leave empty for Google SSO only"
                                        value={newAdminPassword}
                                        onChange={(e) => {
                                            setNewAdminPassword(e.target.value);
                                            setErrors((p) => { const n = { ...p }; delete n.password; return n; });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={styles.togglePw}
                                        onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                                        title={showNewAdminPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showNewAdminPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                                {errors.password && <span className={styles.errorText}>{errors.password}</span>}

                                {newAdminPassword && (
                                    <div className={styles.strengthBox}>
                                        <div className={styles.strengthRow}>
                                            <span className={styles.strengthLabel}>Password Strength:</span>
                                            <div className={styles.strengthBar}>
                                                {[1, 2, 3, 4].map((seg) => (
                                                    <div
                                                        key={seg}
                                                        className={styles.strengthSegment}
                                                        style={{
                                                            background: seg <= pwdStrength.score ? pwdStrength.color : undefined,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <span className={styles.strengthText} style={{ color: pwdStrength.color }}>
                                                {pwdStrength.text}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.notice}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9 8v4M9 6v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                        <p>
                            Once added, this email will be recognized by the server as an <strong>ADMIN</strong>. They can sign in using <strong>Continue with Google</strong> or their configured email & password.
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={() => navigate('/students')}>Cancel</button>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Adding...' : 'Grant Admin Access'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sub-module 3: Current Active Administrators Table */}
            <div className={styles.adminListSection}>
                <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                    Current Administrators ({admins.length})
                </h3>
                <div className={styles.formCard} style={{ overflowX: 'auto' }}>
                    <table className={styles.adminTable}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email Address</th>
                                <th>Role</th>
                                <th>Auth Method</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map((adm) => (
                                <tr key={adm.id || adm.email}>
                                    <td><strong>{adm.name}</strong></td>
                                    <td>{adm.email}</td>
                                    <td>
                                        <span className={adm.isSuperAdmin ? styles.superBadge : styles.adminBadge}>
                                            {adm.isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.authBadge}>
                                            {adm.hasPassword ? 'Google + Password' : 'Google SSO'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}>
                                            ● Active
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {adm.isSuperAdmin ? (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Master Account</span>
                                        ) : (
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDeleteAdmin(adm)}
                                                title="Revoke admin access"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {admins.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-on-surface-variant)' }}>
                                        No secondary administrator accounts registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showConfirm && (
                <ConfirmModal
                    title="Grant Administrator Access?"
                    message="This account will have full administrative access to student management, test configurations, and reports."
                    fields={[
                        { label: 'Name', value: name },
                        { label: 'Gmail', value: email },
                        ...(newAdminPassword ? [{ label: 'Password', value: '•••••••• (Configured)' }] : [{ label: 'Sign-in', value: 'Google Single Sign-on' }]),
                    ]}
                    confirmLabel="Confirm & Grant Access"
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}
