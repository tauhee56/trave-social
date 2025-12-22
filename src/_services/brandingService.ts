import apiService from './apiService';

async function fetchLogoUrl(): Promise<string | null> {
  try {
    const data = await apiService.get('/branding');
    return data?.url || null;
  } catch (error) {
    // Silently fail if backend not reachable
    if (__DEV__) {
      console.log('Logo fetch skipped (backend not reachable)');
    }
    return null;
  }
}

export default fetchLogoUrl;
