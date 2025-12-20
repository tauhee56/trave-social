import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  QueryConstraint,
  DocumentData,
  Query,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Generic paginated query for Firestore
 */
export async function getPaginatedData<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number = 20,
  lastDocument?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedResult<T>> {
  try {
    const queryConstraints = [
      ...constraints,
      limit(pageSize + 1), // Fetch one extra to check if more exist
    ];

    if (lastDocument) {
      queryConstraints.push(startAfter(lastDocument));
    }

    const q = query(collection(db, collectionName), ...queryConstraints);
    const snapshot = await getDocs(q);

    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    
    const data = docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    return {
      data,
      lastDoc: docs[docs.length - 1] || null,
      hasMore,
    };
  } catch (error) {
    console.error('Paginated query error:', error);
    return {
      data: [],
      lastDoc: null,
      hasMore: false,
    };
  }
}

/**
 * Get paginated posts
 */
export async function getPaginatedPosts(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
) {
  return getPaginatedData<any>(
    'posts',
    [orderBy('createdAt', 'desc')],
    pageSize,
    lastDoc
  );
}

/**
 * Get paginated user posts
 */
export async function getPaginatedUserPosts(
  userId: string,
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
) {
  return getPaginatedData<any>(
    'posts',
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    pageSize,
    lastDoc
  );
}

/**
 * Get paginated notifications
 */
export async function getPaginatedNotifications(
  userId: string,
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
) {
  return getPaginatedData<any>(
    'notifications',
    [where('userId', '==', userId), orderBy('createdAt', 'desc')],
    pageSize,
    lastDoc
  );
}

/**
 * Batch delete documents (for cleanup)
 */
export async function batchDelete(
  collectionName: string,
  constraints: QueryConstraint[],
  batchSize: number = 500
): Promise<number> {
  const { writeBatch } = await import('firebase/firestore');
  
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const q = query(
      collection(db, collectionName),
      ...constraints,
      limit(batchSize)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    deletedCount += snapshot.docs.length;

    if (snapshot.docs.length < batchSize) {
      hasMore = false;
    }
  }

  return deletedCount;
}
