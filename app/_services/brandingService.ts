
import { apiService } from './apiService';

// Fetches the logo URL from backend
export async function fetchLogoUrl(): Promise<string | null> {
  try {
    const data = await apiService.get('/branding');
    return data?.url || null;
  } catch (error) {
    console.error('Error fetching logo URL:', error);
    return null;
  }
}
