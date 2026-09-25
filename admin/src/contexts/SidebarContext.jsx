import { createContext, useContext, useState, useEffect } from 'react';
const SidebarContext = createContext(undefined);
export function SidebarProvider({ children }) {
    const [collapsed, setCollapsedState] = useState(() => {
        try {
            return localStorage.getItem('admin_sidebar_collapsed') === 'true';
        }
        catch {
            return false;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
        }
        catch {}
    }, [collapsed]);
    const toggle = () => setCollapsedState((prev) => !prev);
    const setCollapsed = (val) => setCollapsedState(val);
    return (<SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>);
}
export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
