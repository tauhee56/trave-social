
export async function deleteStory(storyId: string) {
  try {
    const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
