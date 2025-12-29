
export async function getUserSectionsSorted(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}/sections`);
    const data = await res.json();
    return { success: data.success, data: data.data || [] };
  } catch (error: any) {
    console.error('❌ getUserSectionsSorted error:', error);
    return { success: false, error: error.message, data: [] };
  }
}
