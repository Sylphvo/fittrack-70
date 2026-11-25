import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser } from '../types/fittrack';

const USER_STORAGE_KEY = '@fittrack70/google_user_v1';
const CLIENT_ID_STORAGE_KEY = '@fittrack70/google_client_id_v1';

export async function loadSavedUser(): Promise<GoogleUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleUser;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveUser(user: GoogleUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function loadGoogleClientId(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(CLIENT_ID_STORAGE_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveGoogleClientId(clientId: string): Promise<void> {
  const trimmed = clientId.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Web environment required'));
      return;
    }
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được Google Sign-In SDK'));
    document.head.appendChild(script);
  });
}

export async function signInWithGoogleOAuthWeb(clientId: string): Promise<GoogleUser> {
  if (Platform.OS !== 'web') {
    throw new Error('OAuth Web chỉ chạy trên trình duyệt/PWA.');
  }
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services chưa sẵn sàng.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId.trim(),
      scope: 'openid email profile',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Đã hủy đăng nhập Google.'));
          return;
        }
        try {
          const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          if (!infoRes.ok) throw new Error('Không lấy được hồ sơ Google.');
          const profile = await infoRes.json();
          const user: GoogleUser = {
            id: String(profile.sub || profile.email),
            name: String(profile.name || profile.email?.split('@')[0] || 'Google User'),
            email: String(profile.email || ''),
            avatarUrl: profile.picture ? String(profile.picture) : undefined,
            provider: 'google_oauth',
          };
          await saveUser(user);
          resolve(user);
        } catch (err) {
          reject(err);
        }
      },
    });
    tokenClient.requestAccessToken();
  });
}

export async function signInWithGoogleEmailLocal(
  email: string,
  name?: string
): Promise<GoogleUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Vui lòng nhập địa chỉ email Google hợp lệ.');
  }
  const displayName = (name || '').trim() || cleanEmail.split('@')[0];
  const user: GoogleUser = {
    id: `local-${cleanEmail}`,
    name: displayName,
    email: cleanEmail,
    provider: 'google_local',
  };
  await saveUser(user);
  return user;
}
