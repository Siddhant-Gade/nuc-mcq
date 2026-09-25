import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import styles from './ErrorPage.module.css';
export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();
    const { t } = useLanguage();
    let titleKey = 'error.somethingWrong';
    let descKey = 'error.unexpected';
    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            titleKey = 'error.notFound';
            descKey = 'error.notFoundDesc';
        }
    }
    return (<div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
            <path d="M20 12v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="20" cy="28" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <h1 className={styles.title}>{t(titleKey)}</h1>
        <p className={styles.message}>{t(descKey)}</p>
        <button className={styles.button} onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('error.goDashboard')}
        </button>
      </div>
    </div>);
}
