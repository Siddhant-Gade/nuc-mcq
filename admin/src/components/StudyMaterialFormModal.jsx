import { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './StudyMaterialFormModal.module.css';
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
const ALLOWED_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
function validateFileType(file) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext))
        return true;
    if (ALLOWED_MIMES.includes(file.type))
        return true;
    return false;
}
export default function StudyMaterialFormModal({ material, onConfirm, onCancel }) {
    const { t } = useLanguage();
    const [kind, setKind] = useState(material?.kind ?? (material?.youtubeVideoId ? 'VIDEO' : 'DOCUMENT'));
    const [title, setTitle] = useState(material?.title ?? '');
    const [description, setDescription] = useState(material?.description ?? '');
    const [youtubeUrl, setYoutubeUrl] = useState(material?.youtubeVideoId ? `https://www.youtube.com/watch?v=${material.youtubeVideoId}` : '');
    const [file, setFile] = useState(null);
    const [typeError, setTypeError] = useState('');
    const [errors, setErrors] = useState({});
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);
    function validate() {
        const e = {};
        if (!title.trim())
            e.title = t('material.errTitle');
        if (!material) {
            if (kind === 'DOCUMENT' && !file) {
                e.file = t('material.errFile');
            } else if (kind === 'VIDEO') {
                if (!youtubeUrl.trim()) {
                    e.youtubeUrl = 'YouTube lecture URL is required.';
                } else if (!youtubeUrl.includes('youtu')) {
                    e.youtubeUrl = 'Please enter a valid YouTube URL.';
                }
            }
        }
        return e;
    }
    function handleAction(action, e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        onConfirm({ 
            title: title.trim(), 
            description: description.trim(), 
            kind,
            youtubeUrl: youtubeUrl.trim(),
            file 
        }, action);
    }
    function clearError(field) {
        setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
    function handleFileSelect(selected) {
        setTypeError('');
        if (!validateFileType(selected)) {
            setTypeError(t('material.invalidType'));
            return;
        }
        setFile(selected);
        clearError('file');
    }
    function handleInputChange(e) {
        const f = e.target.files?.[0];
        if (f)
            handleFileSelect(f);
    }
    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f)
            handleFileSelect(f);
    }
    function handleDragOver(e) {
        e.preventDefault();
        setDragOver(true);
    }
    function handleDragLeave() {
        setDragOver(false);
    }
    function removeFile() {
        setFile(null);
        setTypeError('');
        if (inputRef.current)
            inputRef.current.value = '';
    }
    function formatSize(bytes) {
        if (bytes < 1024)
            return bytes + ' B';
        if (bytes < 1024 * 1024)
            return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (<div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{material ? t('material.editTitle') : t('material.formTitle')}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form className={styles.modalBody}>
          {!material && (
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={`${styles.typeBtn} ${kind === 'DOCUMENT' ? styles.typeBtnActive : ''}`}
                onClick={() => { setKind('DOCUMENT'); clearError('youtubeUrl'); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                  <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Document (PDF, Word, PPT)
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${kind === 'VIDEO' ? styles.typeBtnActive : ''}`}
                onClick={() => { setKind('VIDEO'); clearError('file'); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M6.5 5.5v5l4-2.5-4-2.5Z" fill="currentColor"/>
                </svg>
                YouTube Video Lecture
              </button>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="mtitle">{t('material.titleLabel')}</label>
            <input id="mtitle" className={`${styles.input} ${errors.title ? styles.inputError : ''}`} placeholder={t('material.titlePlaceholder')} value={title} onChange={(e) => { setTitle(e.target.value); clearError('title'); }}/>
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="mdesc">{t('material.descLabel')}</label>
            <textarea id="mdesc" className={styles.textarea} placeholder={t('material.descPlaceholder')} rows={3} value={description} onChange={(e) => setDescription(e.target.value)}/>
          </div>

          {!material && kind === 'DOCUMENT' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>File</label>
              <div className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''} ${errors.file ? styles.inputError : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => inputRef.current?.click()}>
                <input ref={inputRef} type="file" className={styles.fileInput} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={handleInputChange}/>
                {!file ? (<div className={styles.dropContent}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span className={styles.dropText}>{t('material.dragDrop')}</span>
                    <span className={styles.dropSubtext}>{t('material.orClick')}</span>
                    <span className={styles.dropHint}>{t('material.acceptedTypes')}</span>
                  </div>) : (<div className={styles.fileInfo}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 3h8l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                      <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileMeta}>{formatSize(file.size)}</span>
                    <button type="button" className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5 3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                    </button>
                  </div>)}
              </div>
              {(errors.file || typeError) && <span className={styles.errorText}>{errors.file || typeError}</span>}
            </div>
          )}

          {!material && kind === 'VIDEO' && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="myoutube">YouTube Lecture URL</label>
              <input
                id="myoutube"
                className={`${styles.input} ${errors.youtubeUrl ? styles.inputError : ''}`}
                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); clearError('youtubeUrl'); }}
              />
              {errors.youtubeUrl && <span className={styles.errorText}>{errors.youtubeUrl}</span>}
              <span className={styles.helperText}>Enter any full YouTube video link or youtu.be short link. Students can play it directly in their mobile app.</span>
            </div>
          )}

          {material && (
            <div className={styles.existingFile}>
              {material.kind === 'VIDEO' || material.youtubeVideoId ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.25"/>
                    <path d="M6.5 5.5v5l4-2.5-4-2.5Z" fill="currentColor"/>
                  </svg>
                  <span>YouTube Video ID: {material.youtubeVideoId}</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                    <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{material.fileName || 'Uploaded File'}</span>
                </>
              )}
            </div>
          )}
        </form>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>{t('material.cancel')}</button>
          <button className={styles.draftBtn} onClick={(e) => handleAction('draft', e)}>{t('material.saveDraft')}</button>
          <button className={styles.confirmBtn} onClick={(e) => handleAction('publish', e)}>{t('material.publishBtn')}</button>
        </div>
      </div>
    </div>);
}
