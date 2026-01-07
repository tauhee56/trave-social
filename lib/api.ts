import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getAPIBaseURL(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    if (__DEV__) console.log('📡 [lib/api] Using environment URL:', envUrl);
    return normalizeApiBase(envUrl);
  }

  if (__DEV__ && Platform.OS !== 'web') {
    const debuggerHost =
      (Constants as any)?.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost;

    const host = typeof debuggerHost === 'string' ? debuggerHost.split(':')[0] : null;
    if (host) {
      const derivedUrl = `http://${host}:5000/api`;
      if (__DEV__) console.log('📡 [lib/api] Dev host derived from debuggerHost:', derivedUrl);
      return derivedUrl;
    }

    const localUrl = 'http://localhost:5000/api';
    if (__DEV__) console.log('📱 [lib/api] Dev mode: Using localhost:', localUrl);
    return localUrl;
  }

  return 'https://trave-social-backend.onrender.com/api';
}

export const API_BASE_URL = getAPIBaseURL();
export const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, '');
