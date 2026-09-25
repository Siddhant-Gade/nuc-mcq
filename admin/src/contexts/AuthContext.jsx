import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { restoreSession, signIn as signInService, signOut as signOutService, } from '../services/authService';
import { getErrorMessage } from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [state, setState] = useState({ status: 'checking', identity: null, authError: null });
    useEffect(() => {
        let cancelled = false;
        restoreSession()
            .then((restored) => {
            if (!cancelled)
                setState({ ...restored, authError: null });
        })
            .catch((err) => {
            if (!cancelled)
                setState({ status: 'unauthenticated', identity: null, authError: err?.message || 'Access denied. Account is not authorized as administrator.' });
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const value = useMemo(() => ({
        ...state,
        clearAuthError() {
            setState((prev) => ({ ...prev, authError: null }));
        },
        async signIn(email, password) {
            setState({ status: 'checking', identity: null, authError: null });
            try {
                const identity = await signInService(email, password);
                setState({ status: 'authenticated', identity, authError: null });
            }
            catch (error) {
                const msg = getErrorMessage(error);
                setState({ status: 'unauthenticated', identity: null, authError: msg });
                throw new Error(msg);
            }
        },
        async signOut() {
            await signOutService();
            setState({ status: 'unauthenticated', identity: null, authError: null });
        },
    }), [state]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
