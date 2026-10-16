export interface GoogleIdTokenClaims {
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Parses payload portion of a JWT/ID token safely in the browser.
 */
export function parseJwtPayload(token: string): GoogleIdTokenClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleIdTokenClaims;
  } catch {
    return null;
  }
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  '950049251059-dm2kqg2lgb0ldfr21vqkgo1vge8qecuf.apps.googleusercontent.com';

/**
 * Initializes Google Identity Services (GIS) and registers the credential callback.
 */
export function initGoogleIdentityServices(
  onCredentialReceived: (credential: string) => void | Promise<void>
): boolean {
  if (typeof window === 'undefined' || !window.google?.accounts?.id) {
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => {
        if (response.credential) {
          void onCredentialReceived(response.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    return true;
  } catch (err) {
    console.warn('[GoogleAuth] Failed to initialize Google Identity Services:', err);
    return false;
  }
}

/**
 * Renders the official Google Sign-In button into a container element.
 */
export function renderGoogleSignInButton(
  container: HTMLElement,
  onCredentialReceived: (credential: string) => void | Promise<void>
): boolean {
  const initialized = initGoogleIdentityServices(onCredentialReceived);
  if (!initialized || !window.google?.accounts?.id) {
    return false;
  }

  try {
    container.innerHTML = '';
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: container.clientWidth || 380,
    });
    return true;
  } catch (err) {
    console.warn('[GoogleAuth] Failed to render Google Sign-In button:', err);
    return false;
  }
}

/**
 * Prompts Google One Tap if GIS is available.
 */
export function promptGoogleOneTap(): void {
  try {
    window.google?.accounts?.id?.prompt();
  } catch (_) {}
}
