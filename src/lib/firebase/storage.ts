import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, UploadTask } from 'firebase/storage';
import { storage } from './config';

export interface UploadProgress {
  progress: number;
  totalBytes: number;
  bytesTransferred: number;
}

export interface UploadResult {
  downloadURL: string;
  fullPath: string;
  name: string;
}

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  console.log('[Storage] Starting upload:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    path: path,
    storageBucket: storage.app.options.storageBucket
  });

  // Validate storage configuration
  if (!storage.app.options.storageBucket) {
    const error = new Error('Firebase Storage bucket not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in environment variables.');
    console.error('[Storage] Configuration error:', error);
    throw error;
  }

  const storageRef = ref(storage, path);
  console.log('[Storage] Storage reference created:', storageRef.fullPath);

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('[Storage] Upload progress:', {
            file: file.name,
            progress: progress.toFixed(2) + '%',
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state
          });
          onProgress({
            progress,
            totalBytes: snapshot.totalBytes,
            bytesTransferred: snapshot.bytesTransferred
          });
        },
        (error) => {
          console.error('[Storage] Upload error:', {
            file: file.name,
            errorCode: error.code,
            errorMessage: error.message,
            errorName: error.name,
            serverResponse: (error as any).serverResponse,
            customData: (error as any).customData,
            fullError: error
          });

          // Add helpful error messages based on error code
          let enhancedMessage = error.message;
          if (error.code === 'storage/unauthorized') {
            enhancedMessage += ' - Check Firebase Storage rules and authentication.';
          } else if (error.code === 'storage/quota-exceeded') {
            enhancedMessage += ' - Storage quota exceeded. Upgrade to Blaze plan.';
          } else if (error.code === 'storage/unknown') {
            enhancedMessage += ' - This often indicates: 1) Quota exceeded (need Blaze plan), 2) Storage rules issue, 3) Billing not enabled, or 4) Storage bucket not initialized.';
          }

          reject(new Error(enhancedMessage));
        },
        async () => {
          try {
            console.log('[Storage] Upload completed, getting download URL...');
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[Storage] Upload successful:', {
              file: file.name,
              downloadURL: downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath
            });
            resolve({
              downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: uploadTask.snapshot.ref.name
            });
          } catch (error) {
            console.error('[Storage] Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } else {
    try {
      console.log('[Storage] Uploading without progress tracking...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('[Storage] Upload completed, getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('[Storage] Upload successful:', {
        file: file.name,
        downloadURL: downloadURL
      });

      return {
        downloadURL,
        fullPath: snapshot.ref.fullPath,
        name: snapshot.ref.name
      };
    } catch (error: any) {
      console.error('[Storage] Upload error (no progress):', {
        file: file.name,
        errorCode: error.code,
        errorMessage: error.message,
        fullError: error
      });
      throw error;
    }
  }
};

export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

export const generateFilePath = (userId: string, filename: string): string => {
  const timestamp = new Date().toISOString();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `transcriptions/${userId}/${timestamp}_${sanitizedFilename}`;
};