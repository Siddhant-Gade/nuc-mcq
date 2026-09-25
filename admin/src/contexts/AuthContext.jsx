import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { restoreSession, signIn as signInService, signOut as signOutService, } from '../services/authService';
import { getErrorMessage } from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [state, setState] = useState({ status: 'checking', identity: null });
    useEffect(() => {
        let cancelled = false;
        restoreSession()
            .then((restored) => {
            if (!cancelled)
                setState(restored);
        })
            .catch(() => {
            if (!cancelled)
                setState({ status: 'unauthenticated', identity: null });
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const value = useMemo(() => ({
        ...state,
        async signIn(email, password) {
            setState({ status: 'checking', identity: null });
            try {
                const identity = await signInService(email, password);
                setState({ status: 'authenticated', identity });
            }
            catch (error) {
                setState({ status: 'unauthenticated', identity: null });
                throw new Error(getErrorMessage(error));
            }
        },
        async signOut() {
            await signOutService();
            setState({ status: 'unauthenticated', identity: null });
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
