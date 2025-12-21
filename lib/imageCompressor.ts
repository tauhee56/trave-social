/**
 * Image Optimization & Compression
 * Compress images before upload to reduce storage/bandwidth
 * Generates both original (compressed) and thumbnail versions
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number; // bytes
  mimeType: string;
}

/**
 * Compress image for upload
 * @param imageUri - Original image URI
 * @param quality - Compression quality (0-1, default 0.8)
 * @param maxWidth - Max width in pixels (default 2048)
 * @returns Compressed image with metadata
 */
export async function compressImage(
  imageUri: string,
  quality: number = 0.8,
  maxWidth: number = 2048
): Promise<CompressedImage> {
  try {
    // Get original dimensions
    const originalImage = await ImageManipulator.manipulateAsync(imageUri, [], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
    
    // Compress and resize
    const compressedImage = await ImageManipulator.manipulateAsync(imageUri, [{ resize: { width: maxWidth } }], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    // Calculate size
    const response = await fetch(compressedImage.uri);
    const blob = await response.blob();
    const sizeInBytes = blob.size;

    console.log(`📦 Image compressed: ${(blob.size / 1024).toFixed(2)}KB (quality: ${(quality * 100).toFixed(0)}%)`);

    return {
      uri: compressedImage.uri,
      width: compressedImage.width,
      height: compressedImage.height,
      size: sizeInBytes,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('❌ Image compression error:', error);
    throw error;
  }
}

/**
 * Create thumbnail from image
 * @param imageUri - Original image URI
 * @param size - Square size in pixels (default 200)
 * @returns Thumbnail URI
 */
export async function createThumbnail(imageUri: string, size: number = 200): Promise<CompressedImage> {
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: size, height: size } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const response = await fetch(thumbnail.uri);
    const blob = await response.blob();

    console.log(`🔍 Thumbnail created: ${(blob.size / 1024).toFixed(2)}KB`);

    return {
      uri: thumbnail.uri,
      width: size,
      height: size,
      size: blob.size,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('❌ Thumbnail creation error:', error);
    throw error;
  }
}

/**
 * Optimize multiple images for upload
 * Returns both compressed original and thumbnail
 */
export async function optimizeImagesForUpload(
  imageUris: string[]
): Promise<Array<{ compressed: CompressedImage; thumbnail: CompressedImage }>> {
  try {
    const results = await Promise.all(
      imageUris.map(async (uri) => ({
        compressed: await compressImage(uri, 0.8, 2048),
        thumbnail: await createThumbnail(uri, 200),
      }))
    );

    const totalOriginal = imageUris.length;
    const totalCompressed = results.reduce((sum, r) => sum + r.compressed.size, 0);
    const savings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
    console.log(`💾 Total savings: ${savings}% of original size`);

    return results;
  } catch (error) {
    console.error('❌ Error optimizing images:', error);
    throw error;
  }
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
