"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Edit3, 
  Save, 
  Volume2,
  Clock,
  FileText,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getTranscriptionById, updateTranscriptionStatus, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';
import { formatTime, formatDuration } from '@/lib/utils';

export default function TranscriptViewerPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [transcription, setTranscription] = useState<TranscriptionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (id && user) {
      loadTranscription();
    }
  }, [id, user]);

  const loadTranscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const transcriptionData = await getTranscriptionById(id as string);
      
      if (!transcriptionData) {
        setError('Transcription not found');
        return;
      }

      // Check if user owns this transcription or is admin
      if (transcriptionData.userId !== user?.uid && userData?.role !== 'admin') {
        setError('You do not have permission to view this transcription');
        return;
      }

      setTranscription(transcriptionData);
      setEditedTranscript(transcriptionData.transcript || '');
      
    } catch (err) {
      console.error('Error loading transcription:', err);
      setError('Failed to load transcription');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWordCount = (text: string) => {
    return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  const formatTranscriptText = (text: string) => {
    if (!text) return text;
    // Remove spaces before commas and periods
    return text.replace(/\s+([,.!?;:])/g, '$1');
  };

  const handlePlayPause = () => {
    if (audioRef.current && transcription?.downloadURL) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          toast({
            title: 'Audio Error',
            description: 'Unable to play audio file',
            variant: 'destructive'
          });
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
    }
  };

  const saveEdits = async () => {
    if (!transcription || !editedTranscript.trim()) return;

    try {
      setSaving(true);
      
      await updateTranscriptionStatus(transcription.id!, 'complete', {
        transcript: editedTranscript.trim()
      });
      
      // Update local state
      setTranscription(prev => prev ? { ...prev, transcript: editedTranscript.trim() } : null);
      setIsEditing(false);
      
      toast({
        title: 'Changes saved',
        description: 'Transcript has been updated successfully'
      });
      
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const exportTranscript = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!transcription) return;
    
    const rawContent = isEditing ? editedTranscript : (transcription.transcript || '');
    const content = formatTranscriptText(rawContent);
    const filename = `${transcription.originalFilename.split('.')[0]}_transcript`;
    
    try {
      if (format === 'txt') {
        // Simple text file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
      } else if (format === 'pdf') {
        // Generate PDF using jsPDF
        const pdf = new jsPDF();
        
        // Add title
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TRANSCRIPT', 105, 20, { align: 'center' });
        
        // Add metadata
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        let yPos = 35;
        
        pdf.text(`File: ${transcription.originalFilename}`, 20, yPos);
        yPos += 8;
        pdf.text(`Mode: ${transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}`, 20, yPos);
        yPos += 8;
        pdf.text(`Status: ${transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}`, 20, yPos);
        yPos += 8;
        pdf.text(`Duration: ${formatDuration(transcription.duration)}`, 20, yPos);
        yPos += 8;
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
        yPos += 15;
        
        // Add a line separator
        pdf.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Add transcript content
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(content, 170);
        
        for (let i = 0; i < lines.length; i++) {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(lines[i], 20, yPos);
          yPos += 6;
        }
        
        // Add footer on all pages
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.text('Generated by TTT Transcription Service', 105, 285, { align: 'center' });
          pdf.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
        }
        
        pdf.save(`${filename}.pdf`);
        
      } else if (format === 'docx') {
        // Generate DOCX using docx library
        const doc = new Document({
          sections: [
            {
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "TRANSCRIPT",
                      bold: true,
                      size: 32,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 400 },
                }),
                
                // Metadata
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `File: ${transcription.originalFilename}`,
                      size: 22,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Mode: ${transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}`,
                      size: 22,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Status: ${transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}`,
                      size: 22,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Duration: ${formatDuration(transcription.duration)}`,
                      size: 22,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Generated: ${new Date().toLocaleString()}`,
                      size: 22,
                    }),
                  ],
                  spacing: { after: 400 },
                }),
                
                // Transcript content
                new Paragraph({
                  children: [
                    new TextRun({
                      text: content,
                      size: 22,
                    }),
                  ],
                  spacing: { line: 276 },
                }),
                
                // Footer
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Generated by TTT Transcription Service",
                      size: 18,
                      italics: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 600 },
                }),
              ],
            },
          ],
        });
        
        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      toast({
        title: 'Download started',
        description: `Transcript downloaded as ${format.toUpperCase()}`
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export transcript. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const shareTranscript = () => {
    if (!transcription) return;
    
    if (navigator.share) {
      navigator.share({
        title: `Transcript: ${transcription.originalFilename}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: 'Link copied',
          description: 'Transcript link copied to clipboard'
        });
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-gray-600">Loading transcript...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !transcription) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transcriptions
          </Button>
          
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {error || 'Transcript not found'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {error === 'You do not have permission to view this transcription' 
                    ? 'You can only view transcriptions that belong to you.'
                    : 'The transcript you\'re looking for doesn\'t exist or has been removed.'
                  }
                </p>
                <Button onClick={() => router.push('/transcriptions')}>
                  View All Transcriptions
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transcriptions
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#003366] mb-2">
                {transcription.originalFilename}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <StatusBadge status={transcription.status} />
                <Badge variant="outline">{transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}</Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(transcription.duration)}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {getWordCount(transcription.transcript || '')} words
                </div>
                <CreditDisplay amount={transcription.creditsUsed} size="sm" />
                <span>Completed: {formatDate(transcription.completedAt || transcription.updatedAt)}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Only show edit button for completed transcriptions */}
              {transcription.status === 'complete' && (
                <Button
                  variant="outline"
                  onClick={isEditing ? saveEdits : () => setIsEditing(true)}
                  disabled={saving}
                  className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={shareTranscript}
                className="border-gray-300"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <div className="flex">
                <Button
                  variant="outline"
                  onClick={() => exportTranscript('txt')}
                  className="border-gray-300 rounded-r-none border-r-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <select 
                  onChange={(e) => exportTranscript(e.target.value as 'txt' | 'pdf' | 'docx')}
                  className="border border-gray-300 rounded-l-none rounded-r-md px-2 py-2 text-sm bg-white hover:bg-gray-50"
                  defaultValue=""
                >
                  <option value="" disabled>Format</option>
                  <option value="txt">TXT</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audio Player Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#003366]">Audio Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Player */}
                {transcription.downloadURL ? (
                  <audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (audioRef.current) {
                        audioRef.current.volume = volume;
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  >
                    <source src={transcription.downloadURL} type="audio/mpeg" />
                    <source src={transcription.downloadURL} type="audio/wav" />
                    <source src={transcription.downloadURL} type="audio/mp4" />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-gray-500 mb-2">🎵</div>
                    <div className="text-sm text-gray-600">
                      Audio file not available for playback
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePlayPause}
                    disabled={!transcription.downloadURL}
                    className="bg-[#003366] text-white hover:bg-[#004080] disabled:bg-gray-400"
                    size="sm"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      {formatTime(currentTime)} / {formatTime(transcription.duration)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#b29dd9] h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: transcription.duration > 0 
                            ? `${(currentTime / transcription.duration) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-gray-600" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setVolume(newVolume);
                        if (audioRef.current) {
                          audioRef.current.volume = newVolume;
                        }
                      }}
                      className="w-16"
                    />
                  </div>
                </div>

                {/* File Info */}
                <div className="text-sm space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode:</span>
                    <span className="font-medium">{transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(transcription.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credits Used:</span>
                    <CreditDisplay amount={transcription.creditsUsed} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span>{formatDate(transcription.createdAt)}</span>
                  </div>
                  {transcription.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span>{formatDate(transcription.completedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transcript Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#003366]">Transcript</CardTitle>
                  {isEditing && (
                    <Button
                      onClick={saveEdits}
                      disabled={saving}
                      className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                      size="sm"
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {transcription.status !== 'complete' && !transcription.transcript ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {transcription.status === 'processing' ? 'Transcription in Progress' : 
                       transcription.status === 'pending-review' ? 'Awaiting Review' :
                       transcription.status === 'pending-transcription' ? 'Awaiting Transcription' :
                       transcription.status === 'failed' ? 'Transcription Failed' : 'No Transcript Available'}
                    </h3>
                    <p className="text-gray-600">
                      {transcription.status === 'processing' ? 'Your transcript is being generated and will appear here when ready.' :
                       transcription.status === 'pending-review' ? 'The AI transcript is being reviewed by our team.' :
                       transcription.status === 'pending-transcription' ? 'This file is queued for manual transcription.' :
                       transcription.status === 'failed' ? 'The transcription process encountered an error. Please try again or contact support.' :
                       'The transcript is not available yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editedTranscript}
                          onChange={(e) => setEditedTranscript(e.target.value)}
                          className="w-full p-4 border rounded-md resize-none focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                          rows={20}
                          placeholder="Enter or edit the transcript content here..."
                        />
                        <div className="mt-2 text-sm text-gray-500">
                          Word count: {getWordCount(editedTranscript)}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="prose max-w-none">
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                            {formatTranscriptText(transcription.transcript || '') || 'No transcript content available.'}
                          </div>
                        </div>
                        {transcription.transcript && (
                          <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                            Word count: {getWordCount(transcription.transcript)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {transcription.specialInstructions && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-blue-900 mb-2">Special Instructions:</h4>
                        <p className="text-blue-800">{transcription.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}