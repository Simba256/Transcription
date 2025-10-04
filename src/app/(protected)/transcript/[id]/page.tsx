"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateTemplateData, exportTranscriptPDF, exportTranscriptDOCX } from '@/lib/utils/transcriptTemplate';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Download,
  Share2,
  Edit3,
  Save,
  Clock,
  FileText,
  ArrowLeft,
  AlertCircle,
  Link2,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getTranscriptionById, updateTranscriptionStatus, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';
import { formatTime, formatDuration } from '@/lib/utils';
import { AudioPlayer, AudioPlayerRef } from '@/components/ui/AudioPlayer';

// Types for Speechmatics transcript data
interface SpeechmaticsAlternative {
  content: string;
  confidence?: number;
}

interface SpeechmaticsResult {
  type: 'word' | 'punctuation';
  alternatives: SpeechmaticsAlternative[];
  attaches_to?: 'previous' | 'next';
  start_time?: number;
  end_time?: number;
}

interface SpeechmaticsTranscript {
  results: SpeechmaticsResult[];
}

type TranscriptData = string | SpeechmaticsTranscript | unknown;

export default function TranscriptViewerPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [transcription, setTranscription] = useState<TranscriptionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf');
  const [timestampFrequency, setTimestampFrequency] = useState<30 | 60 | 300>(60); // 30s, 60s, 5min (300s)
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [speakerOrder, setSpeakerOrder] = useState<string[]>([]);
  const [draggedSpeaker, setDraggedSpeaker] = useState<string | null>(null);

  const audioPlayerRef = useRef<AudioPlayerRef>(null);

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

      console.log(`[TranscriptViewer] Loaded transcription ${id}:`, {
        hasTimestampedTranscript: !!transcriptionData?.timestampedTranscript,
        timestampedSegmentsCount: transcriptionData?.timestampedTranscript?.length || 0,
        hasTranscript: !!transcriptionData?.transcript,
        transcriptLength: transcriptionData?.transcript?.length || 0,
        hasTranscriptStoragePath: !!transcriptionData?.transcriptStoragePath,
        status: transcriptionData?.status,
        timestampedTranscriptSample: transcriptionData?.timestampedTranscript?.slice(0, 2),
        allKeys: Object.keys(transcriptionData || {})
      });

      if (!transcriptionData) {
        setError('Transcription not found');
        return;
      }

      // Check if user owns this transcription or is admin
      if (transcriptionData.userId !== user?.uid && userData?.role !== 'admin') {
        setError('You do not have permission to view this transcription');
        return;
      }

      // If transcript is stored in Storage (for large files), fetch it
      if (transcriptionData.transcriptStoragePath && !transcriptionData.transcript) {
        console.log(`[TranscriptViewer] Fetching large transcript from Storage: ${transcriptionData.transcriptStoragePath}`);

        try {
          const response = await fetch(`/api/transcriptions/${id}/transcript`);
          if (response.ok) {
            const { transcript, timestampedTranscript } = await response.json();
            transcriptionData.transcript = transcript;
            transcriptionData.timestampedTranscript = timestampedTranscript;
            console.log(`[TranscriptViewer] Loaded transcript from Storage, segments: ${timestampedTranscript?.length || 0}`);
          } else {
            console.error('[TranscriptViewer] Failed to fetch transcript from Storage');
          }
        } catch (fetchError) {
          console.error('[TranscriptViewer] Error fetching transcript from Storage:', fetchError);
        }
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

  // Helper function to extract plain text from transcript data
  const extractPlainText = (transcript: TranscriptData): string => {
    if (!transcript) return '';

    // If it's already a string, return it
    if (typeof transcript === 'string') {
      return transcript;
    }

    // If it's a Speechmatics format with results array
    if (typeof transcript === 'object' && transcript !== null && 'results' in transcript) {
      const speechmaticsData = transcript as SpeechmaticsTranscript;
      const tokens = speechmaticsData.results
        .filter((result) => result.type === 'word' || result.type === 'punctuation')
        .map((result) => {
          const content = result.alternatives?.[0]?.content || '';
          return {
            content,
            type: result.type,
            attachesToPrevious: result.attaches_to === 'previous'
          };
        });

      let text = '';
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'punctuation' && token.attachesToPrevious) {
          // Attach punctuation directly to previous word
          text += token.content;
        } else {
          // Add space before word (except for first word)
          if (text && token.type === 'word') {
            text += ' ';
          }
          text += token.content;
        }
      }

      return text.trim();
    }

    // Fallback: try to convert to string
    return String(transcript);
  };

  const getWordCount = (transcript: TranscriptData) => {
    const text = extractPlainText(transcript);
    return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  const formatTranscriptText = (text: string) => {
    if (!text) return text;
    // Remove spaces before commas and periods
    return text.replace(/\s+([,.!?;:])/g, '$1');
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
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

  const exportTranscript = async (format: 'pdf' | 'docx') => {
    if (!transcription) return;

    try {
      // Generate template data with current transcript content
      const templateData = generateTemplateData({
        ...transcription,
        transcript: isEditing ? editedTranscript : (transcription.transcript || '')
      }, userData);

      console.log('Export templateData:', templateData);
      console.log('Transcription data:', transcription);
      console.log('User data:', userData);

      // Use the new template functions with UI state
      if (format === 'pdf') {
        await exportTranscriptPDF(templateData, {
          timestampFrequency,
          speakerNames,
          getSpeakerColor,
          getSpeakerDisplayName
        });
      } else if (format === 'docx') {
        await exportTranscriptDOCX(templateData, {
          timestampFrequency,
          speakerNames,
          getSpeakerDisplayName
        });
      }

      toast({
        title: 'Download started',
        description: `Transcript downloaded as ${format.toUpperCase()} using professional template`
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

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const jumpToTime = (seconds: number) => {
    // Use the audio player's imperative API to seek
    audioPlayerRef.current?.seekTo(seconds);
    setCurrentTime(seconds);
  };

  // Speaker color mapping for visual differentiation
  const getSpeakerColor = (speaker: string | undefined): string => {
    if (!speaker || speaker === 'UU') return 'text-gray-600 bg-gray-100 border border-gray-300';

    const colors = [
      'text-blue-700 bg-blue-100 border border-blue-200',      // Speaker 1 - Blue
      'text-green-700 bg-green-100 border border-green-200',    // Speaker 2 - Green
      'text-purple-700 bg-purple-100 border border-purple-200',  // Speaker 3 - Purple
      'text-orange-700 bg-orange-100 border border-orange-200',  // Speaker 4 - Orange
      'text-red-700 bg-red-100 border border-red-200',        // Speaker 5 - Red
      'text-indigo-700 bg-indigo-100 border border-indigo-200',  // Speaker 6 - Indigo
      'text-pink-700 bg-pink-100 border border-pink-200',      // Speaker 7 - Pink
      'text-teal-700 bg-teal-100 border border-teal-200',      // Speaker 8 - Teal
      'text-yellow-700 bg-yellow-100 border border-yellow-200',  // Speaker 9 - Yellow
      'text-cyan-700 bg-cyan-100 border border-cyan-200',      // Speaker 10 - Cyan
    ];

    // Extract speaker number (e.g., "S1" -> 1, "S2" -> 2)
    const speakerNum = parseInt(speaker.replace('S', '')) || 1;
    return colors[(speakerNum - 1) % colors.length];
  };

  // Format speaker display name
  const getSpeakerDisplayName = (speaker: string | undefined): string => {
    if (!speaker || speaker === 'UU') return 'Speaker';
    // Check if there's a custom name for this speaker
    if (speakerNames[speaker]) {
      return speakerNames[speaker];
    }
    return `Speaker ${speaker.replace('S', '')}`;
  };

  // Update speaker name
  const updateSpeakerName = (speaker: string, newName: string) => {
    setSpeakerNames(prev => ({
      ...prev,
      [speaker]: newName
    }));
    setEditingSpeaker(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, speaker: string) => {
    setDraggedSpeaker(speaker);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSpeaker: string) => {
    e.preventDefault();

    if (!draggedSpeaker || draggedSpeaker === targetSpeaker) {
      setDraggedSpeaker(null);
      return;
    }

    setSpeakerOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedSpeaker);
      const targetIndex = newOrder.indexOf(targetSpeaker);

      // Remove dragged speaker from old position
      newOrder.splice(draggedIndex, 1);
      // Insert at new position
      newOrder.splice(targetIndex, 0, draggedSpeaker);

      return newOrder;
    });

    setDraggedSpeaker(null);
  };

  const handleDragEnd = () => {
    setDraggedSpeaker(null);
  };

  const renderTimestampedTranscript = () => {
    if (!transcription?.timestampedTranscript || transcription.timestampedTranscript.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {formatTranscriptText(extractPlainText(transcription?.transcript)) || 'No transcript content available.'}
        </div>
      );
    }

    // Get unique speakers from the transcript
    const allSpeakers = [...new Set(
      transcription.timestampedTranscript
        .map(segment => segment.speaker)
        .filter(speaker => speaker)
    )];

    const identifiedSpeakers = allSpeakers.filter(speaker => speaker !== 'UU').sort();
    const hasUnknownSpeakers = allSpeakers.includes('UU');

    // Initialize speaker order if not set
    if (speakerOrder.length === 0 && identifiedSpeakers.length > 0) {
      setSpeakerOrder(identifiedSpeakers);
    }

    // Use speakerOrder for display, fallback to identifiedSpeakers if order not set
    const orderedSpeakers = speakerOrder.length > 0 ? speakerOrder : identifiedSpeakers;

    // Helper function to detect paragraph breaks based on context
    const shouldBreakParagraph = (text: string, nextText?: string): boolean => {
      if (!text) return false;

      // Break after questions
      if (/[?!]$/.test(text.trim())) return true;

      // Break after long pauses (if we had pause data)
      // Break after certain phrases that indicate topic changes
      const topicChangeIndicators = [
        /\b(now|so|anyway|well|alright|okay)\b[.,]?\s*$/i,
        /\b(moving on|next|let me)\b/i,
        /\b(in conclusion|to summarize|finally)\b/i,
        /\b(first|second|third|meanwhile|however|therefore)\b[.,]?\s*$/i
      ];

      if (topicChangeIndicators.some(pattern => pattern.test(text))) return true;

      // Break if text is getting quite long (> 150 words approximately)
      const wordCount = text.split(/\s+/).length;
      if (wordCount > 30 && /[.!]$/.test(text.trim())) return true;

      return false;
    };

    // Process segments to create continuous text flow with intelligent paragraph breaks
    const processedSpeakerSegments = [];
    let currentSpeaker = null;
    let accumulatedText = '';
    let nextTimestampTarget = timestampFrequency; // First target at the frequency interval
    let pendingTimestamp = null; // Store timestamp to be inserted at next sentence end
    let textParts = [];
    let paragraphParts = [];

    const addCurrentParagraph = () => {
      if (accumulatedText.trim()) {
        textParts.push({ type: 'text', content: accumulatedText.trim() });
        accumulatedText = '';
      }

      if (textParts.length > 0) {
        paragraphParts.push([...textParts]);
        textParts = [];
      }
    };

    const addCurrentSegment = () => {
      // Add any remaining text as final paragraph
      addCurrentParagraph();

      // Only add segments that have actual content
      if (paragraphParts.length > 0) {
        processedSpeakerSegments.push({
          speaker: currentSpeaker,
          paragraphs: [...paragraphParts]
        });
      }

      // Reset for next segment - but DON'T reset timestamp target, keep global timeline
      paragraphParts = [];
      // nextTimestampTarget stays the same to maintain continuous timeline
      // pendingTimestamp also stays the same if there's one waiting
    };

    // Helper to check if text ends a sentence
    const endsWithSentence = (text: string): boolean => {
      return /[.!?]$/.test(text.trim());
    };

    for (let i = 0; i < transcription.timestampedTranscript.length; i++) {
      const segment = transcription.timestampedTranscript[i];
      const speakerChanged = currentSpeaker !== null && currentSpeaker !== segment.speaker;

      // If speaker changed, finalize current segment and start new one
      if (speakerChanged) {
        addCurrentSegment();
        currentSpeaker = segment.speaker;
      } else if (currentSpeaker === null) {
        // First segment
        currentSpeaker = segment.speaker;
      }

      // Check if we've passed a timestamp target and need to mark for insertion
      if (segment.start >= nextTimestampTarget && !pendingTimestamp) {
        pendingTimestamp = {
          time: nextTimestampTarget,
          content: formatTimestamp(nextTimestampTarget)
        };
        // Move to next target interval
        nextTimestampTarget += timestampFrequency;
      }

      // Add the current segment text
      const newText = (accumulatedText ? ' ' : '') + segment.text;

      // Check if we should insert the pending timestamp at this sentence end
      if (pendingTimestamp && endsWithSentence(newText)) {
        // Add accumulated text before timestamp
        if (accumulatedText.trim()) {
          textParts.push({ type: 'text', content: accumulatedText.trim() });
          accumulatedText = '';
        }

        // Add the exact interval timestamp
        textParts.push({
          type: 'timestamp',
          time: pendingTimestamp.time,
          content: pendingTimestamp.content
        });

        // Clear pending timestamp
        pendingTimestamp = null;
      }

      // Check if we should break into a new paragraph
      if (accumulatedText && shouldBreakParagraph(accumulatedText + newText)) {
        // Complete current paragraph
        addCurrentParagraph();
      }

      accumulatedText += newText;
    }

    // Add the final segment
    addCurrentSegment();

    return (
      <div className="space-y-4">
        {/* Timestamp Frequency Control */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Timestamp Frequency:</span>
          </div>
          <select
            value={timestampFrequency}
            onChange={(e) => setTimestampFrequency(Number(e.target.value) as 30 | 60 | 300)}
            className="border border-blue-300 rounded-md px-3 py-1 text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={30}>Every 30 seconds</option>
            <option value={60}>Every 60 seconds</option>
            <option value={300}>Every 5 minutes</option>
          </select>
        </div>

        {/* Speaker Legend */}
        {(identifiedSpeakers.length > 0 || hasUnknownSpeakers) && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">
                🎤 Speaker Detection Results
              </h4>
              <p className="text-xs text-gray-500 italic">
                Click to edit • Drag to reorder
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {orderedSpeakers.map(speaker => (
                <div
                  key={speaker}
                  className="relative group"
                  draggable={editingSpeaker !== speaker}
                  onDragStart={(e) => handleDragStart(e, speaker)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, speaker)}
                  onDragEnd={handleDragEnd}
                >
                  {editingSpeaker === speaker ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={getSpeakerDisplayName(speaker)}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (newName) {
                          updateSpeakerName(speaker, newName);
                        } else {
                          setEditingSpeaker(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newName = e.currentTarget.value.trim();
                          if (newName) {
                            updateSpeakerName(speaker, newName);
                          } else {
                            setEditingSpeaker(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingSpeaker(null);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speaker)} border-2 border-blue-500 outline-none min-w-[100px]`}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSpeaker(speaker)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speaker)} hover:ring-2 hover:ring-blue-400 transition-all ${draggedSpeaker === speaker ? 'opacity-50' : 'opacity-100'} ${editingSpeaker !== speaker ? 'cursor-move' : 'cursor-text'}`}
                      title="Click to edit • Drag to reorder"
                    >
                      {getSpeakerDisplayName(speaker)}
                      <Edit3 className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              ))}
              {hasUnknownSpeakers && (
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor('UU')}`}>
                  Unidentified Speech
                </div>
              )}
            </div>
            {identifiedSpeakers.length === 0 && hasUnknownSpeakers && (
              <p className="text-xs text-gray-600 mt-2">
                ℹ️ Speaker identification was not possible for this audio. This may be due to audio quality, single speaker, or processing limitations.
              </p>
            )}
          </div>
        )}

        {/* Transcript with Intelligent Paragraphs and Inline Timestamps */}
        <div className="space-y-6">
          {processedSpeakerSegments.map((speakerSegment, index) => (
            <div key={index} className="group">
              {/* Speaker Label */}
              {speakerSegment.speaker && (
                <div className="flex items-center mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speakerSegment.speaker)}`}>
                    {getSpeakerDisplayName(speakerSegment.speaker)}
                  </div>
                </div>
              )}

              {/* Paragraphs with Inline Timestamps */}
              <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                {speakerSegment.paragraphs.map((paragraph, paragraphIndex) => (
                  <div key={paragraphIndex} className="text-gray-800 leading-relaxed">
                    {paragraph.map((part, partIndex) => (
                      <span key={partIndex}>
                        {part.type === 'text' ? (
                          part.content
                        ) : (
                          <button
                            onClick={() => jumpToTime(part.time)}
                            className="inline-flex items-center mx-2 text-[#003366] hover:text-[#004080] font-mono text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
                            title={`Jump to ${part.content}`}
                          >
                            [{part.content}]
                          </button>
                        )}
                        {part.type === 'timestamp' && partIndex < paragraph.length - 1 && ' '}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const shareTranscript = async () => {
    if (!transcription || !user) return;

    try {
      // Toggle sharing status
      const newSharingState = !transcription.isShared;

      // Get auth token
      const token = await user.getIdToken();

      // Call API to toggle sharing
      const response = await fetch(`/api/transcriptions/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isShared: newSharingState })
      });

      if (!response.ok) {
        throw new Error('Failed to update sharing settings');
      }

      const data = await response.json();

      // Update local state
      setTranscription({
        ...transcription,
        isShared: data.isShared,
        shareId: data.shareId,
        sharedAt: data.isShared ? Timestamp.now() : undefined
      });

      if (data.isShared && data.shareUrl) {
        // Copy share link to clipboard
        await navigator.clipboard.writeText(data.shareUrl);
        toast({
          title: 'Sharing enabled',
          description: 'Share link copied to clipboard!',
        });
      } else {
        toast({
          title: 'Sharing disabled',
          description: 'This transcript is now private',
        });
      }
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sharing settings',
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = async () => {
    if (!transcription?.shareId) return;

    const shareUrl = `${window.location.origin}/share/${transcription.shareId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'Transcript link copied to clipboard'
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
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
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-[#003366] mb-2 truncate" title={transcription.originalFilename}>
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
                  {getWordCount(transcription.transcript)} words
                </div>
                <CreditDisplay amount={transcription.creditsUsed} size="sm" />
                <span>Completed: {formatDate(transcription.completedAt || transcription.updatedAt)}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {/* Only show edit button for completed transcriptions */}
              {transcription.status === 'complete' && (
                <Button
                  variant="outline"
                  onClick={isEditing ? saveEdits : () => setIsEditing(true)}
                  disabled={saving}
                  className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white w-full sm:w-auto"
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

              {transcription.isShared ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={copyShareLink}
                    className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 w-full sm:w-auto"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={shareTranscript}
                    className="border-gray-300 w-full sm:w-auto"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Disable Sharing
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={shareTranscript}
                  className="border-gray-300 w-full sm:w-auto"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}

              <div className="flex w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => exportTranscript(selectedFormat)}
                  className="border-gray-300 rounded-r-none border-r-0 flex-1 sm:flex-initial"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export </span>{selectedFormat.toUpperCase()}
                </Button>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'docx')}
                  className="border border-gray-300 rounded-l-none rounded-r-md px-2 py-2 text-sm bg-white hover:bg-gray-50"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Audio Player Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#003366]">Audio Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transcription.downloadURL ? (
                  <AudioPlayer
                    ref={audioPlayerRef}
                    src={transcription.downloadURL}
                    onTimeUpdate={handleTimeUpdate}
                    standalone={false}
                  />
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-gray-500 mb-2">🎵</div>
                    <div className="text-sm text-gray-600">
                      Audio file not available for playback
                    </div>
                  </div>
                )}

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
                          {renderTimestampedTranscript()}
                        </div>
                        {transcription.transcript && (
                          <div className="mt-4 pt-4 border-t text-sm text-gray-500 flex justify-between items-center">
                            <span>Word count: {getWordCount(transcription.transcript)}</span>
                            {transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0 && (
                              <span className="text-[#003366]">
                                📍 {transcription.timestampedTranscript.length} timestamped segments
                              </span>
                            )}
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