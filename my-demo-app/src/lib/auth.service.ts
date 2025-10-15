// Frontend auth wrapper that talks to the API server.
// The backend issues httpOnly cookies for access/refresh tokens. After login
// we call /auth/me to obtain the canonical user (with roles and permissions)
// and store minimal info in localStorage for the UI.

export type ApiUser = {
  id: number;
  name: string;
  email?: string;
  roles?: any[];
  permissions?: Record<string, number>;
};

const STORAGE_KEY = 'demo_auth_user_v2';

type StoredAuth = { user: ApiUser; expiresAt: number };

const PERM_MANAGE = 'manage';

let _logoutTimer: number | null = null;
let _refreshTimer: number | null = null;
let _refreshPromise: Promise<boolean> | null = null;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

async function login(email: string, password: string) {
  // POST /auth/login with cookies
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const msg = body && body.error ? body.error : `Login failed (${resp.status})`;
    throw new Error(msg);
  }

  // After login, request /auth/me to get the current user with permissions
  const me = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!me.ok) throw new Error('Failed to fetch authenticated user');
  const data = await me.json();

  // expiresIn ~15 minutes for access token
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const stored: StoredAuth = { user: data as ApiUser, expiresAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  startAuthTimer();
  return data as ApiUser;
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    // ignore network errors here
  }
  localStorage.removeItem(STORAGE_KEY);
  cancelAuthTimer();
}

function currentUser(): ApiUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      logout();
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

function userHasPermission(user: ApiUser | null, perm: string) {
  if (!user) return false;
  const perms = user.permissions || {};
  const v = perms[perm] || 0;
  return v > 0;
}

function startAuthTimer(onExpire?: () => void) {
  if (_logoutTimer) {
    clearTimeout(_logoutTimer);
    _logoutTimer = null;
  }
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    const ms = parsed.expiresAt - Date.now();
    if (ms <= 0) {
      logout();
      if (onExpire) onExpire();
      return;
    }
    // Schedule logout at exact expiry time
    _logoutTimer = window.setTimeout(() => {
      logout();
      if (onExpire) onExpire();
    }, ms) as unknown as number;

    // Schedule a refresh attempt shortly before expiry (30s before)
    const refreshBefore = 30 * 1000; // 30 seconds
    const msToRefresh = ms - refreshBefore;
    if (msToRefresh > 0) {
      _refreshTimer = window.setTimeout(async () => {
        try {
          const ok = await refreshAccess();
          if (ok) {
            // successful refresh; restart timers using new expiry
            startAuthTimer(onExpire);
          } else {
            logout();
            if (onExpire) onExpire();
          }
        } catch (e) {
          logout();
          if (onExpire) onExpire();
        }
      }, msToRefresh) as unknown as number;
    } else {
      // If we're already too close to expiry, attempt immediate refresh
      (async () => {
        try {
          const ok = await refreshAccess();
          if (ok) startAuthTimer(onExpire);
          else {
            logout();
            if (onExpire) onExpire();
          }
        } catch (e) {
          logout();
          if (onExpire) onExpire();
        }
      })();
    }
  } catch {
    // ignore
  }
}

function cancelAuthTimer() {
  if (_logoutTimer) {
    clearTimeout(_logoutTimer);
    _logoutTimer = null;
  }
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

async function refreshAccess(): Promise<boolean> {
  // Avoid duplicate refresh attempts
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!resp.ok) {
        _refreshPromise = null;
        return false;
      }
      // Re-fetch /auth/me to update user and permissions
      const me = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        _refreshPromise = null;
        return false;
      }
      const data = await me.json();
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const stored: StoredAuth = { user: data as ApiUser, expiresAt };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      _refreshPromise = null;
      return true;
    } catch (err) {
      _refreshPromise = null;
      return false;
    }
  })();
  return _refreshPromise;
}

// Force a refresh (useful for manual flows)
async function forceRefresh(): Promise<boolean> {
  return refreshAccess();
}

export { forceRefresh };

export { login, logout, currentUser, userHasPermission, startAuthTimer, cancelAuthTimer, PERM_MANAGE };
export default { login, logout, currentUser, userHasPermission, startAuthTimer, cancelAuthTimer, PERM_MANAGE };
