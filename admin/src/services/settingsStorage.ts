const PREFIX = 'nuc-';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* ignore */ }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch { /* ignore */ }
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'mr' | 'hi';

export interface NotificationPrefs {
  authorizationRequests: boolean;
  studentAdmissions: boolean;
  systemAlerts: boolean;
}

export interface SettingsData {
  theme: Theme;
  language: Language;
  notifications: NotificationPrefs;
}

const DEFAULTS: SettingsData = {
  theme: 'system',
  language: 'en',
  notifications: {
    authorizationRequests: true,
    studentAdmissions: true,
    systemAlerts: false,
  },
};

export function loadTheme(): Theme {
  return read<Theme>('theme', DEFAULTS.theme);
}

export function saveTheme(theme: Theme): void {
  write('theme', theme);
}

export function loadLanguage(): Language {
  return read<Language>('language', DEFAULTS.language);
}

export function saveLanguage(lang: Language): void {
  write('language', lang);
}

export function loadNotifications(): NotificationPrefs {
  return read<NotificationPrefs>('notifications', DEFAULTS.notifications);
}

export function saveNotifications(prefs: NotificationPrefs): void {
  write('notifications', prefs);
}

export function loadAllSettings(): SettingsData {
  return {
    theme: loadTheme(),
    language: loadLanguage(),
    notifications: loadNotifications(),
  };
}

export function resetSettings(): void {
  remove('theme');
  remove('language');
  remove('notifications');
}
