import { useState } from 'react';
import { updateStudent } from '../services';
import styles from './EditStudentModal.module.css';

export default function EditStudentModal({ student, batches = [], onSave, onClose }) {
  const [form, setForm] = useState({
    name: student.name || '',
    studentId: student.studentId || '',
    email: student.email || '',
    mobile: student.mobile || '',
    batchId: student.batchId || '',
    courseInfo: student.courseInfo || '',
    photoPath: student.photoPath || '',
  });

  const [photoPreview, setPhotoPreview] = useState(student.photoPath || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 102400) {
      setError('Photo size must be 100 KB or less.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPhotoPreview(dataUrl);
      setForm((prev) => ({ ...prev, photoPath: dataUrl }));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!form.studentId.trim()) {
      setError('Student ID (PRN) is required.');
      return;
    }
    if (!form.batchId) {
      setError('Please select a batch.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        batchId: form.batchId,
        email: form.email.trim() ? form.email.trim() : undefined,
        mobile: form.mobile.trim() ? form.mobile.trim() : undefined,
        courseInfo: form.courseInfo.trim() ? form.courseInfo.trim() : undefined,
        photoPath: form.photoPath || undefined,
      };

      const updated = await updateStudent(student.id, payload);
      onSave(updated || { ...student, ...payload });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update student details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Student Details
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Photo Row */}
          <div className={styles.photoRow}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className={styles.avatarPreview} />
            ) : (
              <div className={styles.avatarFallback}>
                {form.name ? form.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div className={styles.photoActions}>
              <label className={styles.uploadLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Change Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className={styles.fileInputHidden}
                />
              </label>
              <span className={styles.photoHint}>JPG, PNG up to 100 KB</span>
            </div>
          </div>

          <div className={styles.formGrid}>
            {/* Full Name */}
            <div className={`${styles.formGroup} ${styles.colSpan2}`}>
              <label className={styles.label}>Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            {/* PRN / Student ID */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Student ID / PRN *</label>
              <input
                type="text"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="e.g. PRN2026001"
              />
            </div>

            {/* Batch */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Batch *</label>
              <select
                name="batchId"
                value={form.batchId}
                onChange={handleChange}
                required
                className={styles.select}
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.batchId || b.id} value={b.batchId || b.id}>
                    {b.batchName || b.name || b.batchId}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="student@example.com"
              />
            </div>

            {/* Mobile */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Mobile Number</label>
              <input
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                className={styles.input}
                placeholder="10-digit number"
              />
            </div>

            {/* Course Info */}
            <div className={`${styles.formGroup} ${styles.colSpan2}`}>
              <label className={styles.label}>Course / Stream</label>
              <input
                type="text"
                name="courseInfo"
                value={form.courseInfo}
                onChange={handleChange}
                className={styles.input}
                placeholder="e.g. MS-CIT / GCC-TBC 30 WPM"
              />
            </div>
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
