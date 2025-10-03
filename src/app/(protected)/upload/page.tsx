"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, FileAudio, FileVideo, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { generateFilePath } from '@/lib/firebase/storage';
import { createTranscriptionJobAPI, getModeDetails } from '@/lib/api/transcriptions';
import { TranscriptionMode, TranscriptionJob, TranscriptionDomain } from '@/lib/firebase/transcriptions';
import { formatDuration, getBillingMinutes } from '@/lib/utils';

interface UploadFile {
  file: File;
  duration: number; // in seconds (exact duration)
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState('ai');
  const [transcriptionDomain, setTranscriptionDomain] = useState<TranscriptionDomain>('general');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, stage: '' });
  const [overallProgress, setOverallProgress] = useState(0);

  // Metadata fields for transcript template
  const [projectName, setProjectName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const { user, userData } = useAuth();
  const { consumeCredits } = useCredits();
  const { toast } = useToast();
  const router = useRouter();

  // Function to get user's location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      return;
    }

    setLocationEnabled(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get a readable address
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );
          const data = await response.json();

          // Format a nice location string
          const locationString = [
            data.city,
            data.principalSubdivision,
            data.countryName
          ].filter(Boolean).join(', ');

          setLocation(locationString || `${position.coords.latitude}, ${position.coords.longitude}`);

          toast({
            title: "Location detected",
            description: `Location set to: ${locationString}`,
          });
        } catch {
          // Fallback to coordinates if geocoding fails
          const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setLocation(coords);

          toast({
            title: "Location detected",
            description: `Location set to coordinates: ${coords}`,
          });
        }
      },
      (error) => {
        setLocationEnabled(false);

        let message = "Unable to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        }

        toast({
          title: "Location error",
          description: message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const transcriptionModes = [
    {
      id: 'ai',
      name: 'AI Transcription',
      description: 'Fast, automated transcription with good accuracy',
      creditsPerMinute: 100,
      turnaround: '60 mins',
      icon: '/ai_transcription.jpg'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Review',
      description: 'AI transcription reviewed by human experts',
      creditsPerMinute: 150,
      turnaround: '24-48 hrs',
      icon: '/hybrid_review.jpg'
    },
    {
      id: 'human',
      name: 'Human Transcription',
      description: 'Professional human transcription for highest accuracy',
      creditsPerMinute: 200,
      turnaround: '24-72 hrs',
      icon: '/human_transcription.jpg'
    }
  ];

  const selectedMode = transcriptionModes.find(mode => mode.id === transcriptionMode)!;
  const totalDurationSeconds = uploadedFiles.reduce((sum, file) => sum + file.duration, 0);
  const totalBillingMinutes = uploadedFiles.reduce((sum, file) => sum + getBillingMinutes(file.duration), 0);

  // Calculate subscription and credit usage
  const subscriptionMinutesRemaining = userData?.subscriptionStatus === 'active'
    ? Math.max(0, (userData.includedMinutesPerMonth || 0) - (userData.minutesUsedThisMonth || 0))
    : (userData?.trialMinutesRemaining || 0); // Use trial minutes if no active subscription

  const minutesCoveredBySubscription = Math.min(totalBillingMinutes, subscriptionMinutesRemaining);
  const minutesNeedingCredits = Math.max(0, totalBillingMinutes - minutesCoveredBySubscription);
  const estimatedCredits = minutesNeedingCredits * selectedMode.creditsPerMinute;
  const hasInsufficientBalance = userData ? estimatedCredits > (userData.credits || 0) : false;

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
      
      media.addEventListener('error', () => {
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

    if (hasInsufficientBalance) {
      const message = subscriptionMinutesRemaining > 0
        ? `You need ${minutesNeedingCredits} more minutes. Your subscription covers ${minutesCoveredBySubscription} minutes, but you need ${estimatedCredits} more credits.`
        : `You need ${estimatedCredits} credits to process these files.`;

      toast({
        title: "Insufficient Balance",
        description: message,
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
    setProcessingProgress({ current: 0, total: uploadedFiles.length, stage: 'Preparing files...' });
    setOverallProgress(0);

    try {
      const modeDetails = getModeDetails(transcriptionMode as TranscriptionMode);

      // Track subscription minutes used across all files
      let subscriptionMinutesUsedSoFar = 0;

      // Upload files to Firebase Storage and create transcription jobs
      const uploadPromises = uploadedFiles.map(async (uploadFile, index) => {
        setProcessingProgress(prev => ({
          ...prev,
          current: index,
          stage: `Processing ${uploadFile.file.name}...`
        }));

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

            // Calculate overall progress across all files
            const totalProgress = Object.values(progress).reduce((sum, p) => sum + p, 0);
            const avgProgress = totalProgress / uploadedFiles.length;
            setOverallProgress(avgProgress);
          }
        );

        // Create transcription job in Firestore
        const billingMinutes = getBillingMinutes(uploadFile.duration);

        // Calculate how much is covered by subscription vs credits for this file
        const subscriptionMinutesAvailable = subscriptionMinutesRemaining - subscriptionMinutesUsedSoFar;
        const minutesFromSubscription = Math.min(billingMinutes, subscriptionMinutesAvailable);
        const minutesNeedingCreditsForFile = billingMinutes - minutesFromSubscription;
        const creditsForFile = minutesNeedingCreditsForFile * modeDetails.creditsPerMinute;

        // Update running total
        subscriptionMinutesUsedSoFar += minutesFromSubscription;
        
        // Set initial status based on transcription mode
        let initialStatus: 'processing' | 'pending-transcription';
        if (transcriptionMode === 'human') {
          initialStatus = 'pending-transcription'; // Human mode goes directly to transcription queue
        } else {
          initialStatus = 'processing'; // AI and hybrid modes start processing immediately
        }

        const jobData: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.uid,
          filename: result.name,
          originalFilename: uploadFile.file.name,
          filePath: result.fullPath,
          downloadURL: result.downloadURL,
          status: initialStatus,
          mode: transcriptionMode as TranscriptionMode,
          domain: transcriptionDomain, // Include domain for specialized vocabulary
          duration: uploadFile.duration, // Store duration in seconds
          minutesFromSubscription, // Track subscription minutes used
          creditsUsed: creditsForFile, // Track credits used (only for minutes not covered by subscription)
          // Add metadata fields for template
          projectName: projectName.trim() || undefined,
          patientName: patientName.trim() || undefined,
          location: location.trim() || undefined
        };

        // Only add specialInstructions if it has content
        const trimmedInstructions = specialInstructions.trim();
        if (trimmedInstructions) {
          jobData.specialInstructions = trimmedInstructions;
        }
        
        const jobId = await createTranscriptionJobAPI(jobData);
        
        // Consume credits and add transaction with custom description
        const modeDisplayName = modeDetails.name; // e.g., "AI Transcription", "Hybrid Review", "Human Transcription"
        const description = `${modeDisplayName}: ${uploadFile.file.name}`;
        await consumeCredits(creditsForFile, jobId, description);

        // For AI and hybrid modes, start Speechmatics transcription processing (async, don't wait)
        if (transcriptionMode === 'ai' || transcriptionMode === 'hybrid') {
          // Start processing in the background without waiting
          fetch('/api/transcriptions/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jobId: jobId,
              language: 'en', // You could make this configurable
              operatingPoint: 'standard'
            })
          }).then(async (transcriptionResponse) => {
            if (!transcriptionResponse.ok) {
              const errorData = await transcriptionResponse.json();
              console.warn(`[Upload] Speechmatics processing failed for job ${jobId} (${transcriptionResponse.status}):`, errorData.error || errorData.message);
              // This is expected if Speechmatics is not configured or has issues
              // The job will still be created and can be processed manually
            } else {
              // Check the response body for success status
              const responseData = await transcriptionResponse.json();
              if (responseData.success === false) {
                console.info(`[Upload] Speechmatics not available for job ${jobId}, marked for manual processing:`, responseData.message);
              } else {
                console.log(`[Upload] Successfully started Speechmatics processing for job ${jobId}`);
              }
            }
          }).catch(error => {
            console.warn(`[Upload] Network error starting Speechmatics processing for job ${jobId}:`, error.message);
            // Job is still uploaded successfully, processing will be handled separately
          });
        }

        setProcessingProgress(prev => ({
          ...prev,
          current: index + 1,
          stage: index + 1 === uploadedFiles.length ? 'Finalizing...' : `Completed ${uploadFile.file.name}`
        }));

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
      setProcessingProgress({ current: 0, total: 0, stage: '' });
      setOverallProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
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
              <RadioGroup value={transcriptionMode} onValueChange={setTranscriptionMode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {transcriptionModes.map((mode) => (
                  <Label
                    htmlFor={mode.id}
                    key={mode.id}
                    className={`cursor-pointer border rounded-lg p-4 md:p-6 flex flex-col transition-colors min-h-[200px] md:min-h-[250px] ${
                      transcriptionMode === mode.id
                        ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                        : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon and Title in one line */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <Image
                          src={mode.icon}
                          alt={mode.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-semibold text-[#003366] text-lg flex-1">{mode.name}</h3>
                      <RadioGroupItem value={mode.id} id={mode.id} className="flex-shrink-0" />
                    </div>
                    
                    {/* Description */}
                    <div className="flex-1 flex flex-col justify-between">
                      <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cost/min:</span>
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

          {/* Domain Selection for Medical/Legal Terminology */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                🎯 Domain-Specific Terminology
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Select your domain to improve accuracy for specialized vocabulary
              </p>
            </CardHeader>
            <CardContent>
              <RadioGroup value={transcriptionDomain} onValueChange={(value) => setTranscriptionDomain(value as TranscriptionDomain)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Label
                  htmlFor="general"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'general'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">🌐</div>
                    <h3 className="font-medium text-gray-900 flex-1">General</h3>
                    <RadioGroupItem value="general" id="general" />
                  </div>
                  <p className="text-sm text-gray-600">Standard vocabulary for everyday conversations and business meetings</p>
                </Label>

                <Label
                  htmlFor="medical"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'medical'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">🏥</div>
                    <h3 className="font-medium text-gray-900 flex-1">Medical</h3>
                    <RadioGroupItem value="medical" id="medical" />
                  </div>
                  <p className="text-sm text-gray-600">Enhanced accuracy for medical terminology, procedures, and pharmaceutical names</p>
                </Label>

                <Label
                  htmlFor="legal"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'legal'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">⚖️</div>
                    <h3 className="font-medium text-gray-900 flex-1">Legal</h3>
                    <RadioGroupItem value="legal" id="legal" />
                  </div>
                  <p className="text-sm text-gray-600">Optimized for legal terminology, court proceedings, and judicial language</p>
                </Label>
              </RadioGroup>

              {/* Domain-specific information */}
              {transcriptionDomain === 'medical' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 mt-0.5">ℹ️</div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Medical Domain Active</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Enhanced recognition for medical procedures, pharmaceutical names, anatomical terms, and clinical vocabulary.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transcriptionDomain === 'legal' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-amber-600 mt-0.5">ℹ️</div>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Legal Domain Active</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Improved accuracy for legal terminology, Latin phrases, court procedures, and judicial language.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript Metadata */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Transcript Information (Optional)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                This information will appear on your professional transcript template
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectName" className="text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Discovery Interview"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="patientName" className="text-sm font-medium text-gray-700 mb-2">
                    Patient/Subject Name
                  </Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    Location
                  </Label>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter location manually or use GPS"
                        className="w-full"
                        disabled={locationEnabled}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={requestLocation}
                      disabled={locationEnabled}
                      variant="outline"
                      className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                    >
                      {locationEnabled ? 'Getting Location...' : 'Use GPS'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Location will be auto-populated if you enable GPS, or you can enter it manually
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Automatic Fields</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><strong>Client Name:</strong> {userData?.name || 'Your account name'}</div>
                  <div><strong>Provider Name:</strong> Talk to Text</div>
                  <div><strong>Date & Time:</strong> Upload time will be used</div>
                </div>
              </div>
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
                  <span className="text-gray-600">Total Minutes:</span>
                  <span className="font-medium">{totalBillingMinutes} min</span>
                </div>

                {minutesCoveredBySubscription > 0 && (
                  <div className="flex justify-between items-center py-2 text-green-600">
                    <span>Subscription Minutes:</span>
                    <span className="font-medium">-{minutesCoveredBySubscription} min</span>
                  </div>
                )}

                {minutesNeedingCredits > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Minutes Needing Credits:</span>
                      <span className="font-medium">{minutesNeedingCredits} min</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Rate ({selectedMode.name}):</span>
                      <CreditDisplay amount={selectedMode.creditsPerMinute} size="sm" />
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="font-semibold text-[#003366] text-lg">Credits Needed:</span>
                        <CreditDisplay amount={estimatedCredits} size="md" />
                      </div>
                    </div>
                  </>
                )}

                {userData && (
                  <div className="border-t pt-4 space-y-2">
                    {subscriptionMinutesRemaining > 0 && (
                      <div className="flex justify-between items-center py-2 text-sm">
                        <span className="text-gray-600">Available Minutes:</span>
                        <span className="font-medium text-green-600">{subscriptionMinutesRemaining} min</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 text-sm">
                      <span className="text-gray-600">Credit Balance:</span>
                      <CreditDisplay amount={userData.credits || 0} size="sm" />
                    </div>
                  </div>
                )}

                {hasInsufficientBalance && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg mt-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-red-800 mb-2">
                          Insufficient Balance
                        </p>
                        <p className="text-red-700">
                          {subscriptionMinutesRemaining > 0
                            ? `Your subscription covers ${minutesCoveredBySubscription} minutes, but you need ${estimatedCredits} more credits.`
                            : `You need ${estimatedCredits} credits to process these files.`}
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
              disabled={isUploading || uploadedFiles.length === 0 || hasInsufficientBalance}
              className={`text-white px-8 py-3 relative overflow-hidden ${
                isUploading ? 'bg-gray-400' : 'bg-[#003366] hover:bg-[#002244]'
              }`}
            >
              {/* Progress bar fill - completed portion shows normal button color */}
              {isUploading && (
                <div
                  className="absolute inset-0 bg-[#003366] transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              )}

              {/* Button content */}
              <span className="relative z-10 flex items-center">
                {isUploading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Start Transcription'
                )}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}