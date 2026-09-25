import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './NotFound.module.css';
export default function NotFound() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    return (<div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>{t('error.notFound')}</h1>
        <p className={styles.message}>{t('error.notFoundDesc')}</p>
        <button className={styles.button} onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('error.goDashboard')}
        </button>
      </div>
    </div>);
}
