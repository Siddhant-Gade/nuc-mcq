import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Batch } from '../types';
import { getActiveBatches, createStudent } from '../services';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './StudentAdmission.module.css';

interface FormData {
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  batchId: string;
  courseInfo: string;
  photo: File | null;
}

interface FormErrors {
  studentId?: string;
  name?: string;
  batchId?: string;
  photo?: string;
}

export default function StudentAdmission() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState<FormData>({ studentId: '', name: '', email: '', mobile: '', batchId: '', courseInfo: 'MSCIT', photo: null });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    getActiveBatches().then(setBatches);
  }, []);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.studentId.trim()) e.studentId = t('admission.errStudentIdRequired');
    if (!form.name.trim()) e.name = t('admission.errNameRequired');
    if (!form.batchId) e.batchId = t('admission.errBatchRequired');
    if (form.photo && form.photo.size > 10240) e.photo = t('admission.errPhotoSize');
    return e;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, photo: file }));
    if (file && file.size > 10240) {
      setErrors((prev) => ({ ...prev, photo: t('admission.errPhotoSize') }));
    } else {
      setErrors((prev) => ({ ...prev, photo: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    await createStudent({
      studentId: form.studentId,
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      instituteId: 'INST001',
      batchId: form.batchId,
      photoPath: '',
      courseInfo: form.courseInfo,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  function handleReset() {
    setSubmitted(false);
    setForm({ studentId: '', name: '', email: '', mobile: '', batchId: '', courseInfo: 'MSCIT', photo: null });
    setErrors({});
  }

  if (submitted) {
    return (
      <div>
        <div className={pageStyles.pageHeader}>
          <h1 className={pageStyles.heading}>{t('admission.successTitle')}</h1>
        </div>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M8 12.5l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className={styles.successText}>{t('admission.successMsg')}</p>
          <button className={styles.successBtn} onClick={handleReset}>
            {t('admission.addAnother')}
          </button>
        </div>
      </div>
    );
  }

  const selectedBatch = batches.find((b) => b.batchId === form.batchId);

  return (
    <div>
      <div className={pageStyles.breadcrumb}>
        <a className={pageStyles.breadcrumbLink} onClick={() => navigate('/students')}>{t('admission.breadcrumbStudents')}</a>
        <span className={pageStyles.breadcrumbSeparator}>/</span>
        <span className={pageStyles.breadcrumbCurrent}>{t('admission.breadcrumbAdmission')}</span>
      </div>
      <div className={pageStyles.pageHeader}>
        <h1 className={pageStyles.heading}>{t('admission.title')}</h1>
      </div>

      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <div className={styles.leftColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{t('admission.studentInfo')}</h3>
              <p className={styles.cardDescription}>{t('admission.studentInfoDesc')}</p>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.fieldGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="name">{t('admission.fullName')}</label>
                  <input id="name" name="name" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} placeholder={t('admission.fullNamePlaceholder')} value={form.name} onChange={handleChange} />
                  {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="studentId">{t('admission.studentId')}</label>
                  <input id="studentId" name="studentId" className={`${styles.input} ${errors.studentId ? styles.inputError : ''}`} placeholder={t('admission.studentIdPlaceholder')} value={form.studentId} onChange={handleChange} />
                  {errors.studentId && <span className={styles.errorText}>{errors.studentId}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="email">{t('admission.emailAddress')}</label>
                  <input id="email" name="email" type="email" className={styles.input} placeholder="jane.doe@example.com" value={form.email} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="mobile">{t('admission.mobileNumber')}</label>
                  <input id="mobile" name="mobile" className={styles.input} placeholder="+1 (555) 000-0000" value={form.mobile} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{t('admission.batchAssignment')}</h3>
              <p className={styles.cardDescription}>{t('admission.batchAssignmentDesc')}</p>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="batchId">{t('admission.availableBatches')}</label>
                <select id="batchId" name="batchId" className={`${styles.select} ${errors.batchId ? styles.inputError : ''}`} value={form.batchId} onChange={handleChange}>
                  <option value="">{t('admission.selectBatch')}</option>
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>{b.batchName}</option>
                  ))}
                </select>
                {errors.batchId && <span className={styles.errorText}>{errors.batchId}</span>}
              </div>
              {selectedBatch && (
                <div className={styles.batchInfo}>
                  <svg className={styles.batchInfoIcon} width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                  <div>
                    <p className={styles.batchInfoTitle}>{t('admission.batchCapacity')}</p>
                    <p className={styles.batchInfoText}>{selectedBatch.enrolledCount}/{selectedBatch.capacity} {t('admission.enrolled')} — {selectedBatch.capacity - selectedBatch.enrolledCount} {t('admission.seatsRemaining')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{t('admission.officialPhoto')}</h3>
              <p className={styles.cardDescription}>{t('admission.photoDesc')}</p>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.photoUpload} onClick={() => fileInputRef.current?.click()}>
                {form.photo ? (
                  <div className={styles.photoPreview}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="#10b981"/><path d="M11 16.5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <p className={styles.photoName}>{form.photo.name}</p>
                    <p className={styles.photoSize}>{(form.photo.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4a4 4 0 0 0-4 4v2h8V8a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="1.5"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="2" fill="currentColor"/></svg>
                    <span className={styles.photoLabel}>{t('admission.upload')}</span>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handlePhotoChange} />
              <p className={styles.photoHint}>{t('admission.maxFileSize')}</p>
              <p className={styles.photoHint}>{t('admission.format')}</p>
              {errors.photo && (
                <div className={styles.photoError}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#fee2e2"/><path d="M7 4.5v3M7 9.5v.5" stroke="#ba1a1a" strokeWidth="1.25" strokeLinecap="round"/></svg>
                  {errors.photo}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <button type="button" className={styles.cancelBtn} onClick={handleReset}>{t('admission.cancel')}</button>
          <button type="submit" className={styles.saveBtn} disabled={submitting}>
            {submitting ? t('admission.saving') : t('admission.saveStudent')}
          </button>
        </div>
      </form>
    </div>
  );
}
