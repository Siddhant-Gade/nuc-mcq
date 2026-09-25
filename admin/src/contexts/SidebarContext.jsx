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

    // Mobile drawer state
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
        }
        catch {}
    }, [collapsed]);

    // Close mobile drawer on resize to desktop
    useEffect(() => {
        function handleResize() {
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggle = () => setCollapsedState((prev) => !prev);
    const setCollapsed = (val) => setCollapsedState(val);
    const toggleMobile = () => setMobileOpen((prev) => !prev);
    const closeMobile = () => setMobileOpen(false);

    return (
      <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed, mobileOpen, toggleMobile, closeMobile }}>
        {children}
      </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
