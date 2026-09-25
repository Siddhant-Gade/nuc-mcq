import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { loadLanguage, saveLanguage } from '../services/settingsStorage';
import { t as translate } from '../services/translations';
const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(loadLanguage);
    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        saveLanguage(lang);
        document.documentElement.setAttribute('lang', lang);
    }, []);
    const t = useCallback((key) => translate(key, language), [language]);
    const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
    return (<LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>);
}
export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx)
        throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}
