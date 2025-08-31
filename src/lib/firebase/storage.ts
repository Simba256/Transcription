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
  const storageRef = ref(storage, path);
  
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress,
            totalBytes: snapshot.totalBytes,
            bytesTransferred: snapshot.bytesTransferred
          });
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: uploadTask.snapshot.ref.name
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } else {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      downloadURL,
      fullPath: snapshot.ref.fullPath,
      name: snapshot.ref.name
    };
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