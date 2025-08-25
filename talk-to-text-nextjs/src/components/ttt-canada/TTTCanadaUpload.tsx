'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  X,
  MapPin
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { getCachedAudioDuration } from '@/lib/client-audio-utils';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTTTCanadaCredits, creditsToCad, TTT_CANADA_PRICING } from '@/lib/stripe';
import { secureApiClient } from '@/lib/secure-api-client';
import { CreditBalanceResponse } from '@/types/credits';

interface TTTCanadaUploadProps {
  selectedService: string | null;
  onUploadSuccess?: (result: any) => void;
}

interface ServiceConfig {
  id: string;
  name: string;
  price: number;
  description: string;
}

const serviceConfigs: Record<string, ServiceConfig> = {
  'ai_human_review': {
    id: 'ai_human_review',
    name: 'AI Draft + Human Review',
    price: 175, // 175 credits per minute
    description: 'AI transcription with professional human editing'
  },
  'verbatim_multispeaker': {
    id: 'verbatim_multispeaker',
    name: 'Verbatim Multi-Speaker',
    price: 225, // 225 credits per minute
    description: 'Complete verbatim with speaker identification'
  },
  'indigenous_oral': {
    id: 'indigenous_oral',
    name: 'Indigenous Oral History',
    price: 250, // 250 credits per minute
    description: 'Culturally aware Indigenous community transcription'
  },
  'legal_dictation': {
    id: 'legal_dictation',
    name: 'Legal Dictation',
    price: 185, // 185 credits per minute
    description: 'Legal document preparation and dictation'
  },
  'copy_typing': {
    id: 'copy_typing',
    name: 'Copy Typing',
    price: 280, // 280 credits per minute
    description: 'Document digitization and copy typing services'
  }
};

const addOnPrices = {
  timestamps: 25,    // 25 credits per minute
  anonymization: 35, // 35 credits per minute
  customTemplate: 2500, // 2500 credits one-time
  rushDelivery: 50   // 50 credits per minute
};

export default function TTTCanadaUpload({ selectedService, onUploadSuccess }: TTTCanadaUploadProps) {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [creditBalance, setCreditBalance] = useState<CreditBalanceResponse | null>(null);
  
  // Form fields
  const [language, setLanguage] = useState<'en-CA' | 'fr-CA' | 'indigenous'>('en-CA');
  const [clientInstructions, setClientInstructions] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  
  // Add-ons
  const [addOns, setAddOns] = useState({
    timestamps: false,
    anonymization: false,
    customTemplate: false,
    rushDelivery: false
  });

  // Load credit balance
  const loadCreditBalance = async () => {
    if (!user) return;
    
    try {
      const data = await secureApiClient.get('/api/credits/balance');
      setCreditBalance(data.balance);
    } catch (error) {
      console.error('Failed to load credit balance:', error);
    }
  };

  useEffect(() => {
    loadCreditBalance();
  }, [user]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError('');
    setUploadedFile(file);
    
    try {
      const detectedDuration = await getCachedAudioDuration(file);
      setDuration(detectedDuration);
    } catch (error) {
      console.error('Duration detection error:', error);
      setDuration(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.mp4', '.flac', '.aac', '.ogg'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxSize: 500 * 1024 * 1024, // 500MB limit
    multiple: false
  });

  const removeFile = () => {
    setUploadedFile(null);
    setDuration(0);
    setError('');
  };

  const toggleAddOn = (addOn: keyof typeof addOns) => {
    setAddOns(prev => ({
      ...prev,
      [addOn]: !prev[addOn]
    }));
  };

  const calculatePricing = () => {
    if (!selectedService || !duration) return null;
    
    const service = serviceConfigs[selectedService];
    if (!service) return null;

    // Calculate credits using the new system
    const creditsCalculation = calculateTTTCanadaCredits(
      selectedService as keyof typeof TTT_CANADA_PRICING,
      duration,
      addOns
    );

    const totalCAD = creditsToCad(creditsCalculation.totalCredits);
    const totalUSD = totalCAD * 0.74;

    return {
      service,
      duration,
      baseCredits: creditsCalculation.baseCredits,
      addOnCredits: creditsCalculation.addOnCredits,
      totalCredits: creditsCalculation.totalCredits,
      totalCAD,
      totalUSD,
      hasEnoughCredits: creditBalance ? creditBalance.balance >= creditsCalculation.totalCredits : false
    };
  };

  const handleSubmit = async () => {
    if (!uploadedFile || !selectedService) {
      setError('Please select a file and service type');
      return;
    }

    if (!user) {
      setError('Please log in to submit transcription orders');
      return;
    }

    const pricing = calculatePricing();
    if (!pricing) {
      setError('Unable to calculate pricing');
      return;
    }

    if (!pricing.hasEnoughCredits) {
      setError(`Insufficient credits. You need ${pricing.totalCredits} credits but only have ${creditBalance?.balance || 0}. Please purchase more credits.`);
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);
    setError('');

    try {
      setUploadProgress(25);
      
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();
      
      // Convert file to buffer for direct processing
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const buffer = Array.from(new Uint8Array(arrayBuffer));
      
      setUploadProgress(50);

      // Submit to TTT Canada processing with file buffer
      const processData = {
        fileName: uploadedFile.name,
        fileBuffer: buffer, // Send buffer directly
        fileSize: uploadedFile.size,
        duration: duration * 60, // Convert to seconds
        serviceType: selectedService,
        language,
        addOns,
        clientInstructions: clientInstructions.trim() || undefined,
        specialRequirements: specialRequirements.trim() || undefined
      };

      setUploadProgress(75);
      const processResponse = await fetch('/api/ttt-canada/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(processData)
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await processResponse.json();
      setUploadProgress(100);

      // Success! Job created and processing in background
      onUploadSuccess?.({
        ...result,
        isProcessing: result.status === 'processing',
        backgroundProcessing: true
      });
      
      // Refresh credit balance
      loadCreditBalance();
      
      // Reset form
      setUploadedFile(null);
      setDuration(0);
      setClientInstructions('');
      setSpecialRequirements('');
      setAddOns({
        timestamps: false,
        anonymization: false,
        customTemplate: false,
        rushDelivery: false
      });

    } catch (error) {
      console.error('TTT Canada upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const pricing = calculatePricing();

  if (!selectedService) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Service First</h3>
          <p className="text-gray-600">
            Choose a TTT Canada service from the options above to begin uploading
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Service Display */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">
                {serviceConfigs[selectedService]?.name}
              </h4>
              <p className="text-sm text-red-700">
                {serviceConfigs[selectedService]?.price} credits per minute
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Audio File</CardTitle>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-red-400 bg-red-50' 
                  : 'border-gray-300 hover:border-red-400 hover:bg-red-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-red-600 font-medium">Drop your file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop your audio file, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    MP3, WAV, M4A, MP4, FLAC and other formats supported (max 500MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                      {duration > 0 && ` • ${duration} minutes`}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Options */}
      {uploadedFile && (
        <>
          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Language & Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Language</Label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="en-CA">English (Canadian)</option>
                  <option value="fr-CA">French (Canadian)</option>
                  <option value="indigenous">Indigenous Languages</option>
                </select>
              </div>

              <div>
                <Label>Client Instructions (Optional)</Label>
                <Textarea
                  value={clientInstructions}
                  onChange={(e) => setClientInstructions(e.target.value)}
                  placeholder="Any specific instructions for the transcriptionist..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Special Requirements (Optional)</Label>
                <Textarea
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="Cultural considerations, technical terms, speaker names, etc..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add-ons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Premium Add-ons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    addOns.timestamps ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleAddOn('timestamps')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Timestamps</p>
                      <p className="text-sm text-gray-600">Precise time markers</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">+25 credits/min</p>
                      {addOns.timestamps && <CheckCircle className="h-4 w-4 text-red-600 mt-1" />}
                    </div>
                  </div>
                </div>

                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    addOns.anonymization ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleAddOn('anonymization')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Anonymization</p>
                      <p className="text-sm text-gray-600">Remove personal identifiers</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">+35 credits/min</p>
                      {addOns.anonymization && <CheckCircle className="h-4 w-4 text-red-600 mt-1" />}
                    </div>
                  </div>
                </div>

                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    addOns.customTemplate ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleAddOn('customTemplate')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Custom Template</p>
                      <p className="text-sm text-gray-600">Branded formatting</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">+2500 credits setup</p>
                      {addOns.customTemplate && <CheckCircle className="h-4 w-4 text-red-600 mt-1" />}
                    </div>
                  </div>
                </div>

                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    addOns.rushDelivery ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleAddOn('rushDelivery')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Rush Delivery</p>
                      <p className="text-sm text-gray-600">24-hour turnaround</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">+50 credits/min</p>
                      {addOns.rushDelivery && <CheckCircle className="h-4 w-4 text-red-600 mt-1" />}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          {pricing && (
            <Card className={`border-2 ${pricing.hasEnoughCredits ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${pricing.hasEnoughCredits ? 'text-green-800' : 'text-red-800'}`}>
                  <DollarSign className="h-5 w-5" />
                  Credit Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className={pricing.hasEnoughCredits ? 'text-green-800' : 'text-red-800'}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Service ({pricing.duration} min)</span>
                    <span>{pricing.baseCredits} credits</span>
                  </div>
                  
                  {Object.entries(pricing.addOnCredits).map(([key, credits]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <span>+{credits} credits</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-2 font-medium">
                    <div className="flex justify-between text-lg">
                      <span>Total Credits</span>
                      <span>{pricing.totalCredits} credits</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Equivalent CAD</span>
                      <span>${pricing.totalCAD.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Current Balance</span>
                      <span>{creditBalance?.balance || 0} credits</span>
                    </div>
                    {!pricing.hasEnoughCredits && (
                      <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-red-300">
                        <span>Credits Needed</span>
                        <span>{pricing.totalCredits - (creditBalance?.balance || 0)} more</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Ready to submit?</p>
                  <p className="text-sm text-gray-600">
                    Your file will be processed securely on Canadian servers
                  </p>
                </div>
                <div className="flex gap-3">
                  {pricing && !pricing.hasEnoughCredits ? (
                    <Button
                      onClick={() => window.open('/credits', '_blank')}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Buy Credits
                    </Button>
                  ) : null}
                  <Button
                    onClick={handleSubmit}
                    disabled={isUploading || !uploadedFile || (pricing && !pricing.hasEnoughCredits)}
                    className="bg-red-600 hover:bg-red-700 min-w-[120px]"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        {uploadProgress > 0 && `${uploadProgress}%`}
                      </div>
                    ) : (
                      `Submit Order ${pricing ? `• ${pricing.totalCredits} credits` : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}