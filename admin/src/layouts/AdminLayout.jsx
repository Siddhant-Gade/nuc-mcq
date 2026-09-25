import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import styles from './AdminLayout.module.css';
export default function AdminLayout() {
    const auth = useAuth();
    const { collapsed } = useSidebar();
    if (auth.status === 'checking') {
        return <div className={styles.main}>Loading…</div>;
    }
    if (auth.status === 'unauthenticated') {
        return <Navigate to="/login" replace/>;
    }
    return (<div className={styles.layout}>
      <Sidebar />
      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>);
}
