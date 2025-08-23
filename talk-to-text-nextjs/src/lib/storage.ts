import { 
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from './firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface StorageFileInfo {
  name: string;
  fullPath: string;
  downloadUrl: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
}

// Audio file upload
export const uploadAudioFile = async (
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ downloadUrl: string; filePath: string }> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  // Validate file type
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`);
  }
  
  // Validate file size (100MB limit)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 100MB`);
  }
  
  // Create unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedName}`;
  const filePath = `uploads/${userId}/${fileName}`;
  
  const storageRef = ref(storage, filePath);
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            state: snapshot.state as any
          };
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, filePath });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

// Simple file upload (for smaller files)
export const uploadFile = async (
  path: string,
  file: File
): Promise<string> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

// Profile picture upload
export const uploadProfilePicture = async (
  userId: string,
  file: File
): Promise<string> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  // Validate image file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Validate file size (5MB limit for images)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`Image too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 5MB`);
  }
  
  const fileName = `profile_${Date.now()}.${file.name.split('.').pop()}`;
  const filePath = `profile_pictures/${userId}/${fileName}`;
  
  return await uploadFile(filePath, file);
};

// Get download URL for existing file
export const getFileDownloadUrl = async (filePath: string): Promise<string> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const storageRef = ref(storage, filePath);
  return await getDownloadURL(storageRef);
};

// Delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const storageRef = ref(storage, filePath);
  await deleteObject(storageRef);
};

// List user's files
export const listUserFiles = async (userId: string, folder = 'uploads'): Promise<StorageFileInfo[]> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const folderRef = ref(storage, `${folder}/${userId}`);
  const result = await listAll(folderRef);
  
  const filesInfo: StorageFileInfo[] = [];
  
  for (const itemRef of result.items) {
    try {
      const [downloadUrl, metadata] = await Promise.all([
        getDownloadURL(itemRef),
        getMetadata(itemRef)
      ]);
      
      filesInfo.push({
        name: metadata.name,
        fullPath: metadata.fullPath,
        downloadUrl,
        size: metadata.size,
        contentType: metadata.contentType || 'unknown',
        timeCreated: metadata.timeCreated,
        updated: metadata.updated
      });
    } catch (error) {
      console.warn(`Failed to get info for ${itemRef.fullPath}:`, error);
    }
  }
  
  return filesInfo.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
};

// Get file metadata
export const getFileMetadata = async (filePath: string) => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const storageRef = ref(storage, filePath);
  return await getMetadata(storageRef);
};

// Helper function to get file extension
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to estimate audio duration from file size (returns minutes)
export const estimateAudioDuration = (fileSize: number, bitrate = 32): number => {
  // Conservative estimation using lower bitrate for more accurate duration
  // Many audio files are compressed with variable bitrates, often much lower than 128kbps
  // Duration in seconds = (fileSize in bits) / (bitrate in bits per second)
  const fileSizeInBits = fileSize * 8;
  const bitrateInBitsPerSecond = bitrate * 1000;
  const durationInSeconds = fileSizeInBits / bitrateInBitsPerSecond;
  const durationInMinutes = durationInSeconds / 60;
  
  // Return duration in minutes (with minimum of 0.1 minutes for very short files)
  return Math.max(0.1, Math.round(durationInMinutes * 10) / 10);
};

// Cleanup old files (for maintenance)
export const cleanupOldFiles = async (userId: string, daysOld = 30): Promise<number> => {
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const files = await listUserFiles(userId);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let deletedCount = 0;
  
  for (const file of files) {
    const fileDate = new Date(file.timeCreated);
    if (fileDate < cutoffDate) {
      try {
        await deleteFile(file.fullPath);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete old file ${file.fullPath}:`, error);
      }
    }
  }
  
  return deletedCount;
};