import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import pageStyles from '../shared/styles/Page.module.css';
import styles from './AdminProfile.module.css';

export default function AdminProfile() {
  const auth = useAuth();
  const { t } = useLanguage();
  const email = auth.identity?.email ?? 'admin@gmail.com';
  const name = auth.identity?.name ?? 'Institute Administrator';

  return (
    <div>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.heading}>{t('header.myProfile')}</h1>
          <p className={pageStyles.subtext}>Manage your administrator account details.</p>
        </div>
      </div>
      <section className={styles.profileCard} aria-labelledby="profile-title">
        <div className={styles.avatar} aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <div className={styles.details}>
          <h2 id="profile-title">{name}</h2>
          <p>{email}</p>
          <span className={styles.role}>Master Access</span>
        </div>
      </section>
    </div>
  );
}
