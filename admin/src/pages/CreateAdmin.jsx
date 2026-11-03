import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPinStatus, setupPin, verifyPin, getAdmins, createAdmin, deleteAdmin } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './CreateAdmin.module.css';

export default function CreateAdmin() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // PIN State
    const [checkingPin, setCheckingPin] = useState(true);
    const [hasPin, setHasPin] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [activePin, setActivePin] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [confirmPinInput, setConfirmPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    // Admin Management State
    const [admins, setAdmins] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState(null);

    useEffect(() => {
        checkPin();
    }, []);

    async function checkPin() {
        setCheckingPin(true);
        try {
            const status = await getPinStatus();
            setHasPin(status?.hasPin ?? false);
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

    async function handleSetupPin(e) {
        e.preventDefault();
        setPinError('');
        if (!pinInput || pinInput.length < 4) {
            setPinError('PIN must be at least 4 digits or characters.');
            return;
        }
        if (pinInput !== confirmPinInput) {
            setPinError('PIN confirmation does not match.');
            return;
        }

        setPinLoading(true);
        try {
            await setupPin({ pin: pinInput });
            setHasPin(true);
            setActivePin(pinInput);
            setIsUnlocked(true);
            loadAdminList();
            setActionMsg({ type: 'success', text: 'Master Security PIN created successfully.' });
        } catch (err) {
            setPinError(getErrorMessage(err));
        } finally {
            setPinLoading(false);
        }
    }

    async function handleVerifyPin(e) {
        e.preventDefault();
        setPinError('');
        if (!pinInput) {
            setPinError('Please enter your security PIN.');
            return;
        }

        setPinLoading(true);
        try {
            await verifyPin(pinInput);
            setActivePin(pinInput);
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
            });
            setShowConfirm(false);
            setName('');
            setEmail('');
            setActionMsg({
                type: 'success',
                text: res?.message || `Admin access granted to ${email}. They can now sign in using Google.`,
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
        if (!hasPin) {
            return (
                <div>
                    <div className={pageStyles.pageHeader}>
                        <div>
                            <h1 className={pageStyles.heading}>Admin Security Setup</h1>
                            <p className={styles.subtext}>Protect admin account management with a Master Security PIN.</p>
                        </div>
                    </div>

                    <div className={styles.pinCard}>
                        <div className={styles.pinIcon}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h2 className={styles.pinTitle}>Create Master Security PIN</h2>
                        <p className={styles.pinSubtext}>
                            Before adding new administrator accounts, please set a 4 to 6 digit security PIN.
                            This PIN will be required whenever adding or removing administrators.
                        </p>

                        <form onSubmit={handleSetupPin}>
                            <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                <label className={styles.label}>New Security PIN</label>
                                <input
                                    type="password"
                                    maxLength="8"
                                    className={styles.pinInput}
                                    placeholder="••••"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
                                <label className={styles.label}>Confirm Security PIN</label>
                                <input
                                    type="password"
                                    maxLength="8"
                                    className={styles.pinInput}
                                    placeholder="••••"
                                    value={confirmPinInput}
                                    onChange={(e) => setConfirmPinInput(e.target.value)}
                                />
                            </div>

                            {pinError && <div className={styles.errorText} style={{ marginBottom: '1rem' }}>{pinError}</div>}

                            <button type="submit" className={styles.submitBtn} style={{ width: '100%', height: '2.5rem' }} disabled={pinLoading}>
                                {pinLoading ? 'Saving PIN...' : 'Save PIN & Proceed'}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

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
                    <h2 className={styles.pinTitle}>Enter Security PIN</h2>
                    <p className={styles.pinSubtext}>
                        Please enter your Master Security PIN to access Administrator Management.
                    </p>

                    <form onSubmit={handleVerifyPin}>
                        <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                            <input
                                type="password"
                                maxLength="8"
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
                </div>
            </div>
        );
    }

    // Step 2: Unlocked Admin Management
    return (
        <div>
            <div className={pageStyles.pageHeader}>
                <div>
                    <h1 className={pageStyles.heading}>{t('createAdmin.title')}</h1>
                    <p className={styles.subtext}>Manage authorized administrator accounts for New Unique Computers.</p>
                </div>
                <button
                    className={styles.cancelBtn}
                    onClick={() => { setIsUnlocked(false); setActivePin(''); setPinInput(''); }}
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

            {/* Add New Admin Form */}
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
                    </div>

                    <div className={styles.notice}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9 8v4M9 6v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                        <p>
                            Once added, this email will be recognized by the server as an <strong>ADMIN</strong>. They can sign in on the admin login page using <strong>Continue with Google</strong>.
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

            {/* Current Active Administrators Table */}
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
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-on-surface-variant)' }}>
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
                    ]}
                    confirmLabel="Confirm & Grant Access"
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}
