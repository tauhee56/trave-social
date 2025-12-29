
export async function updateUserSectionsOrder(userId: string, sections: any[]) {
  try {
    const res = await fetch(`/api/users/${userId}/sections-order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('❌ Error updating section order:', error);
    return { success: false, error: error.message };
  }
}
