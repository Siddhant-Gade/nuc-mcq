import { Component } from 'react';
import styles from '../pages/ErrorPage.module.css';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('Unhandled React Error:', error, errorInfo);
        }
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.page}>
                    <div className={styles.card}>
                        <div className={styles.icon}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <circle cx="20" cy="20" r="18" stroke="#DC2626" strokeWidth="2" />
                                <path d="M20 12v10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="20" cy="28" r="1.5" fill="#DC2626" />
                            </svg>
                        </div>
                        <h1 className={styles.title}>Something went wrong</h1>
                        <p className={styles.message}>
                            An unexpected interface error occurred. Please refresh or return to the dashboard.
                        </p>
                        <button className={styles.button} onClick={this.handleReload}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
