// Backend does not expose blocked users yet; return empty set to avoid Firestore dependency
export async function fetchBlockedUserIds(uid: string): Promise<Set<string>> {
  console.warn('fetchBlockedUserIds: blocked users not implemented on backend; returning empty set');
  return new Set<string>();
}

export function filterOutBlocked<T extends Record<string, any>>(items: T[], blocked: Set<string>): T[] {
  return items.filter(i => {
    const uid = i.userId || i.ownerId || i.authorId;
    return uid ? !blocked.has(uid) : true;
  });
}
