// Export all helpers from the Node/Express (apiService) backend version
export * from '../firebaseHelpers';
export { getUserSectionsSorted } from './getUserSectionsSorted';

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: 'Travel', image: 'https://via.placeholder.com/80x80?text=Travel' },
  { name: 'Food', image: 'https://via.placeholder.com/80x80?text=Food' },
  { name: 'Adventure', image: 'https://via.placeholder.com/80x80?text=Adventure' },
  { name: 'Culture', image: 'https://via.placeholder.com/80x80?text=Culture' },
  { name: 'Nature', image: 'https://via.placeholder.com/80x80?text=Nature' },
  { name: 'Nightlife', image: 'https://via.placeholder.com/80x80?text=Nightlife' }
];

// Ensure default categories exist
export async function ensureDefaultCategories() {
  try {
    // Categories are now hardcoded, no backend call needed
    return { success: true, data: DEFAULT_CATEGORIES };
  } catch (error) {
    console.error('Error ensuring categories:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get all categories
export async function getCategories() {
  try {
    return DEFAULT_CATEGORIES;
  } catch (error) {
    console.error('Error getting categories:', error);
    return DEFAULT_CATEGORIES;
  }
}
