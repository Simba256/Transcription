"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileAudio, FileVideo, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { generateFilePath } from '@/lib/firebase/storage';
import { createTranscriptionJob, getModeDetails, TranscriptionMode } from '@/lib/firebase/transcriptions';
import { formatDuration, getBillingMinutes } from '@/lib/utils';

interface UploadFile {
  file: File;
  duration: number; // in seconds (exact duration)
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState('ai');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const { user, userData } = useAuth();
  const { addTransaction, consumeCredits } = useCredits();
  const { toast } = useToast();
  const router = useRouter();

  const transcriptionModes = [
    {
      id: 'ai',
      name: 'AI Transcription',
      description: 'Fast, automated transcription with good accuracy',
      creditsPerMinute: 100,
      turnaround: '60 minutes'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Review',
      description: 'AI transcription reviewed by human experts',
      creditsPerMinute: 150,
      turnaround: '24-48 hours'
    },
    {
      id: 'human',
      name: 'Human Transcription',
      description: 'Professional human transcription for highest accuracy',
      creditsPerMinute: 200,
      turnaround: '24-72 hours'
    }
  ];

  const selectedMode = transcriptionModes.find(mode => mode.id === transcriptionMode)!;
  const totalDurationSeconds = uploadedFiles.reduce((sum, file) => sum + file.duration, 0);
  const totalBillingMinutes = uploadedFiles.reduce((sum, file) => sum + getBillingMinutes(file.duration), 0);
  const estimatedCredits = totalBillingMinutes * selectedMode.creditsPerMinute;
  const hasInsufficientCredits = userData ? estimatedCredits > (userData.credits || 0) : false;

  // Function to get accurate duration from audio/video files
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const isVideo = file.type.startsWith('video/');
      const media = isVideo ? document.createElement('video') : document.createElement('audio');
      
      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);
      
      media.addEventListener('loadedmetadata', () => {
        // Clean up the object URL to free memory
        URL.revokeObjectURL(objectUrl);
        // Return exact duration in seconds
        resolve(media.duration);
      });
      
      media.addEventListener('error', (e) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load media file'));
      });
      
      // Set the source to trigger loading
      media.src = objectUrl;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFiles = async (files: File[]) => {
    const audioVideoFiles = files.filter(file => 
      file.type.startsWith('audio/') || file.type.startsWith('video/')
    );

    if (audioVideoFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please upload only audio or video files.",
        variant: "destructive",
      });
    }

    // Process files one by one to get their durations
    for (const file of audioVideoFiles) {
      const fileKey = file.name;
      setProcessingFiles(prev => new Set(prev).add(fileKey));
      
      try {
        const durationSeconds = await getMediaDuration(file);
        
        const newFile: UploadFile = {
          file,
          duration: durationSeconds
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
      } catch (error) {
        console.error(`Error getting duration for ${file.name}:`, error);
        toast({
          title: "Duration calculation failed",
          description: `Could not determine duration for ${file.name}. Using estimated duration.`,
          variant: "destructive",
        });
        
        // Fallback to estimated duration based on file size
        const estimatedDurationMinutes = Math.ceil(file.size / (1024 * 1024) * 2); // Rough estimate: 2 minutes per MB
        const finalDurationMinutes = Math.max(estimatedDurationMinutes, 1); // At least 1 minute
        const estimatedDurationSeconds = finalDurationMinutes * 60; // Convert to seconds
        const newFile: UploadFile = {
          file,
          duration: estimatedDurationSeconds
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file to continue.",
        variant: "destructive",
      });
      return;
    }

    if (hasInsufficientCredits) {
      toast({
        title: "Insufficient credits",
        description: "Please purchase more credits to process these files.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const progress: {[key: string]: number} = {};
    
    try {
      const modeDetails = getModeDetails(transcriptionMode as TranscriptionMode);
      
      // Upload files to Firebase Storage and create transcription jobs
      const uploadPromises = uploadedFiles.map(async (uploadFile, index) => {
        const filePath = generateFilePath(user.uid, uploadFile.file.name);
        const fileKey = `${index}-${uploadFile.file.name}`;
        
        // Upload file to Firebase Storage with progress tracking
        const { uploadFile: uploadFileFunction } = await import('@/lib/firebase/storage');
        const result = await uploadFileFunction(
          uploadFile.file,
          filePath,
          (progressData) => {
            progress[fileKey] = progressData.progress;
            setUploadProgress({...progress});
          }
        );
        
        // Create transcription job in Firestore
        const billingMinutes = getBillingMinutes(uploadFile.duration);
        const creditsForFile = billingMinutes * modeDetails.creditsPerMinute;
        
        // Set initial status based on transcription mode
        let initialStatus: 'processing' | 'pending-transcription';
        if (transcriptionMode === 'human') {
          initialStatus = 'pending-transcription'; // Human mode goes directly to transcription queue
        } else {
          initialStatus = 'processing'; // AI and hybrid modes start processing immediately
        }

        const jobData: any = {
          userId: user.uid,
          filename: result.name,
          originalFilename: uploadFile.file.name,
          filePath: result.fullPath,
          downloadURL: result.downloadURL,
          status: initialStatus,
          mode: transcriptionMode as TranscriptionMode,
          duration: uploadFile.duration, // Store duration in seconds
          creditsUsed: creditsForFile
        };
        
        // Only add specialInstructions if it has content
        const trimmedInstructions = specialInstructions.trim();
        if (trimmedInstructions) {
          jobData.specialInstructions = trimmedInstructions;
        }
        
        const jobId = await createTranscriptionJob(jobData);
        
        // Consume credits and add transaction with custom description
        const modeDisplayName = modeDetails.name; // e.g., "AI Transcription", "Hybrid Review", "Human Transcription"
        const description = `${modeDisplayName}: ${uploadFile.file.name}`;
        await consumeCredits(creditsForFile, jobId, description);
        
        // For AI and hybrid modes, start Speechmatics transcription processing
        if (transcriptionMode === 'ai' || transcriptionMode === 'hybrid') {
          try {
            console.log(`Starting Speechmatics processing for job ${jobId}`);
            const transcriptionResponse = await fetch('/api/transcriptions/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                jobId: jobId,
                language: 'en', // You could make this configurable
                operatingPoint: 'enhanced'
              })
            });

            if (!transcriptionResponse.ok) {
              const errorData = await transcriptionResponse.json();
              console.error(`Failed to start Speechmatics processing for job ${jobId}:`, errorData.error);
              
              // Don't fail the upload, but log the issue
              toast({
                title: "Processing Warning",
                description: `File uploaded successfully, but automatic transcription may be delayed for ${uploadFile.file.name}`,
                variant: "default",
              });
            } else {
              console.log(`Successfully started Speechmatics processing for job ${jobId}`);
            }
          } catch (error) {
            console.error(`Error starting Speechmatics processing for job ${jobId}:`, error);
            
            // Don't fail the upload, but notify user
            toast({
              title: "Processing Warning", 
              description: `File uploaded successfully, but automatic transcription may be delayed for ${uploadFile.file.name}`,
              variant: "default",
            });
          }
        }
        
        return jobId;
      });
      
      await Promise.all(uploadPromises);
      
      toast({
        title: 'Upload successful!',
        description: `Your ${uploadedFiles.length} file(s) have been uploaded and are being processed.`,
      });

      // Reset form
      setUploadedFiles([]);
      setSpecialInstructions('');
      setUploadProgress({});
      
      router.push('/transcriptions');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Upload Files for Transcription
          </h1>
          <p className="text-gray-600">
            Upload your audio or video files and choose your preferred transcription mode.
          </p>
        </div>

        <div className="space-y-8">
          {/* File Upload */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Select Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-[#b29dd9] bg-[#b29dd9]/5'
                    : 'border-gray-300 hover:border-[#b29dd9]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-[#003366] mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-gray-600 mb-4">
                  Supports MP3, WAV, MP4, MOV, and other audio/video formats
                </p>
                <input
                  type="file"
                  multiple
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild className="bg-[#003366] hover:bg-[#002244] text-white">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </div>

              {/* Processing Files Message */}
              {processingFiles.size > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-blue-800 font-medium">
                      Calculating duration for {processingFiles.size} file(s)...
                    </p>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Please wait while we analyze your media files to determine accurate pricing.
                  </p>
                </div>
              )}

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-[#003366]">Uploaded Files</h4>
                  {uploadedFiles.map((uploadFile, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {uploadFile.file.type.startsWith('audio/') ? (
                          <FileAudio className="h-5 w-5 text-[#b29dd9]" />
                        ) : (
                          <FileVideo className="h-5 w-5 text-[#b29dd9]" />
                        )}
                        <div>
                          <p className="font-medium text-[#003366]">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {Math.round(uploadFile.file.size / 1024 / 1024 * 100) / 100} MB • {formatDuration(uploadFile.duration)}
                          </p>
                        </div>
                        {isUploading && uploadProgress[`${index}-${uploadFile.file.name}`] !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-[#b29dd9] h-2 rounded-full transition-all duration-300" 
                                style={{width: `${uploadProgress[`${index}-${uploadFile.file.name}`] || 0}%`}}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {Math.round(uploadProgress[`${index}-${uploadFile.file.name}`] || 0)}% uploaded
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcription Mode */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Choose Transcription Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={transcriptionMode} onValueChange={setTranscriptionMode} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {transcriptionModes.map((mode) => (
                  <Label
                    htmlFor={mode.id}
                    key={mode.id}
                    className={`cursor-pointer border rounded-lg p-6 flex flex-col transition-colors min-h-[200px] ${
                      transcriptionMode === mode.id
                        ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                        : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[#003366] text-lg">{mode.name}</h3>
                      <RadioGroupItem value={mode.id} id={mode.id} />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cost per minute:</span>
                          <CreditDisplay amount={mode.creditsPerMinute} size="sm" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Turnaround time:</span>
                          <span className="text-sm text-gray-600 font-medium">{mode.turnaround}</span>
                        </div>
                      </div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Special Instructions (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special instructions for the transcriber? (e.g., speaker names, technical terms, formatting preferences)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={4}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Total Duration:</span>
                  <span className="font-medium text-lg">{formatDuration(totalDurationSeconds)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Rate ({selectedMode.name}):</span>
                  <CreditDisplay amount={selectedMode.creditsPerMinute} size="sm" />
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="font-semibold text-[#003366] text-lg">Estimated Cost:</span>
                    <CreditDisplay amount={estimatedCredits} size="md" />
                  </div>
                </div>
                
                {userData && (
                  <div className="flex justify-between items-center py-2 text-sm border-t pt-4">
                    <span className="text-gray-600">Your Balance:</span>
                    <CreditDisplay amount={userData.credits || 0} size="sm" />
                  </div>
                )}

                {hasInsufficientCredits && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg mt-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-red-800 mb-2">
                          Insufficient Credits
                        </p>
                        <p className="text-red-700">
                          You need {estimatedCredits - (userData?.credits || 0)} more credits to process these files.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isUploading}
              className="px-8 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || uploadedFiles.length === 0 || hasInsufficientCredits}
              className="bg-[#003366] hover:bg-[#002244] text-white px-8 py-3"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                'Start Transcription'
              )}
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}