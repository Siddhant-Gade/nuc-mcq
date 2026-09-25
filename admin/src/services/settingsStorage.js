const PREFIX = 'nuc-';
function read(key, fallback) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw !== null)
            return JSON.parse(raw);
    }
    catch { /* ignore */ }
    return fallback;
}
function write(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    catch { /* ignore */ }
}
function remove(key) {
    try {
        localStorage.removeItem(PREFIX + key);
    }
    catch { /* ignore */ }
}
const DEFAULTS = {
    theme: 'system',
    language: 'en',
    notifications: {
        authorizationRequests: true,
        studentAdmissions: true,
        systemAlerts: false,
    },
};
export function loadTheme() {
    return read('theme', DEFAULTS.theme);
}
export function saveTheme(theme) {
    write('theme', theme);
}
export function loadLanguage() {
    return read('language', DEFAULTS.language);
}
export function saveLanguage(lang) {
    write('language', lang);
}
export function loadNotifications() {
    return read('notifications', DEFAULTS.notifications);
}
export function saveNotifications(prefs) {
    write('notifications', prefs);
}
export function loadAdminInviteEnabled() {
    return read('adminInviteEnabled', false);
}
export function saveAdminInviteEnabled(enabled) {
    write('adminInviteEnabled', Boolean(enabled));
}
export function loadAllSettings() {
    return {
        theme: loadTheme(),
        language: loadLanguage(),
        notifications: loadNotifications(),
        adminInviteEnabled: loadAdminInviteEnabled(),
    };
}
export function resetSettings() {
    remove('theme');
    remove('language');
    remove('notifications');
    remove('adminInviteEnabled');
}
