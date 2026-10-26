// utils/imageCompression.ts
// Utility to compress images to target size (500KB by default)

interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    quality?: number;
  }
  
  /**
   * Compress an image file to target size
   * @param file - The image file to compress
   * @param targetSizeKB - Target size in KB (default: 500KB)
   * @returns Compressed file as Blob
   */
  export async function compressImage(
    file: File,
    targetSizeKB: number = 500
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
  
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const maxDimension = 1920; // Max width/height for quality
  
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
  
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
  
          // Start with high quality and reduce until target size is met
          let quality = 0.9;
          const targetSizeBytes = targetSizeKB * 1024;
          
          const tryCompress = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'));
                  return;
                }
  
                console.log(`Compression attempt - Quality: ${q.toFixed(2)}, Size: ${(blob.size / 1024).toFixed(2)}KB`);
  
                if (blob.size <= targetSizeBytes || q <= 0.1) {
                  // Success or minimum quality reached
                  resolve(blob);
                } else {
                  // Try again with lower quality
                  tryCompress(q - 0.1);
                }
              },
              file.type,
              q
            );
          };
  
          tryCompress(quality);
        };
  
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
  
        img.src = event.target?.result as string;
      };
  
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
  
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Validate image file before compression
   * @param file - The file to validate
   * @param maxSizeMB - Maximum allowed size in MB (default: 3MB)
   * @returns Validation result with error message if invalid
   */
  export function validateImageFile(
    file: File,
    maxSizeMB: number = 3
  ): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only JPG and PNG images are allowed',
      };
    }
  
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }
  
    return { valid: true };
  }
  
  /**
   * Convert blob to File
   * @param blob - The blob to convert
   * @param fileName - Name for the new file
   * @returns File object
   */
  export function blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now(),
    });
  }
  
  /**
   * Format file size for display
   * @param bytes - Size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
  
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
  
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Process and compress image file
   * @param file - Original image file
   * @param targetSizeKB - Target size in KB (default: 500KB)
   * @returns Object with compressed file and metadata
   */
  export async function processImageFile(
    file: File,
    targetSizeKB: number = 500
  ): Promise<{
    file: File;
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
  }> {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  
    const originalSize = file.size;
  
    // Compress image
    const compressedBlob = await compressImage(file, targetSizeKB);
    const compressedFile = blobToFile(compressedBlob, file.name);
  
    const compressionRatio = ((1 - compressedBlob.size / originalSize) * 100).toFixed(1);
  
    return {
      file: compressedFile,
      originalSize: formatFileSize(originalSize),
      compressedSize: formatFileSize(compressedBlob.size),
      compressionRatio: `${compressionRatio}%`,
    };
  }