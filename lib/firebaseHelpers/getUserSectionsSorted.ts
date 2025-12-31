import { apiService } from '../../app/_services/apiService';

export async function getUserSectionsSorted(userId: string) {
  try {
    const res = await apiService.get(`/users/${userId}/sections`);
    return { success: true, data: res || [] };
  } catch (error: any) {
    console.error('❌ getUserSectionsSorted error:', error);
    return { success: false, error: error.message, data: [] };
  }
}
