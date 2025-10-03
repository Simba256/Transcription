'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { TranscriptSegment } from '@/lib/firebase/transcriptions';
import { AudioPlayer, AudioPlayerRef } from '@/components/ui/AudioPlayer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';

interface SharedTranscription {
  id: string;
  originalFilename: string;
  downloadURL: string;
  transcript?: string;
  timestampedTranscript?: TranscriptSegment[];
  transcriptStoragePath?: string;
  sharedAt?: string;
}

export default function SharedTranscriptPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [transcription, setTranscription] = useState<SharedTranscription | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  useEffect(() => {
    const loadSharedTranscript = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch transcript via API route
        const response = await fetch(`/api/share/${shareId}`);

        if (!response.ok) {
          setError('This shared transcript does not exist or is no longer available.');
          return;
        }

        const transcript = await response.json();
        setTranscription(transcript);

        // Load timestamped transcript
        if (transcript.timestampedTranscript && transcript.timestampedTranscript.length > 0) {
          setSegments(transcript.timestampedTranscript);
        } else if (transcript.transcriptStoragePath) {
          // Fetch transcript data from storage via API
          try {
            const transcriptResponse = await fetch(`/api/share/${shareId}/transcript`);
            if (transcriptResponse.ok) {
              const data = await transcriptResponse.json();
              setSegments(data.timestampedTranscript || []);
            }
          } catch (err) {
            console.error('Error loading transcript from storage:', err);
            setSegments([]);
          }
        }
      } catch (err) {
        console.error('Error loading shared transcript:', err);
        setError('Failed to load shared transcript. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedTranscript();
    }
  }, [shareId]);

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const jumpToTime = (seconds: number) => {
    audioPlayerRef.current?.seekTo(seconds);
    setCurrentTime(seconds);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading shared transcript...</p>
        </div>
      </div>
    );
  }

  if (error || !transcription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Transcript Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'This shared transcript does not exist or is no longer available.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shared Transcript</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {transcription.originalFilename}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyShareLink}
              className="gap-2"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Audio Player */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Audio Player</h2>
          <AudioPlayer
            ref={audioPlayerRef}
            src={transcription.downloadURL}
            onTimeUpdate={handleTimeUpdate}
            standalone={true}
          />
        </div>

        {/* Transcript */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <Card className="p-6">
            {segments.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  // Process segments to group by speaker with periodic timestamps
                  const processedSegments: Array<{
                    speaker: string;
                    paragraphs: Array<Array<{ type: 'text' | 'timestamp'; content: string; time?: number }>>
                  }> = [];

                  let currentSpeaker: string | null = null;
                  let accumulatedText = '';
                  let textParts: Array<{ type: 'text' | 'timestamp'; content: string; time?: number }> = [];
                  let paragraphParts: Array<Array<{ type: 'text' | 'timestamp'; content: string; time?: number }>> = [];
                  let nextTimestampTarget = 60; // Show timestamp every 60 seconds
                  let pendingTimestamp: { time: number; content: string } | null = null;

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
                    addCurrentParagraph();
                    if (paragraphParts.length > 0) {
                      processedSegments.push({
                        speaker: currentSpeaker || 'Unknown',
                        paragraphs: [...paragraphParts]
                      });
                    }
                    paragraphParts = [];
                  };

                  const endsWithSentence = (text: string): boolean => {
                    return /[.!?]$/.test(text.trim());
                  };

                  for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const speakerChanged = currentSpeaker !== null && currentSpeaker !== (segment.speaker || 'Unknown');

                    if (speakerChanged) {
                      addCurrentSegment();
                      currentSpeaker = segment.speaker || 'Unknown';
                    } else if (currentSpeaker === null) {
                      currentSpeaker = segment.speaker || 'Unknown';
                    }

                    // Check if we need to insert a timestamp
                    if (segment.start >= nextTimestampTarget && !pendingTimestamp) {
                      pendingTimestamp = {
                        time: nextTimestampTarget,
                        content: formatTime(nextTimestampTarget)
                      };
                      nextTimestampTarget += 60;
                    }

                    // Add text, inserting timestamp if at sentence end
                    accumulatedText += (accumulatedText ? ' ' : '') + segment.text;

                    if (pendingTimestamp && endsWithSentence(accumulatedText)) {
                      textParts.push({ type: 'text', content: accumulatedText.trim() });
                      textParts.push({
                        type: 'timestamp',
                        content: pendingTimestamp.content,
                        time: pendingTimestamp.time
                      });
                      accumulatedText = '';
                      pendingTimestamp = null;
                    }

                    // Break paragraph on questions or long segments
                    if (endsWithSentence(segment.text) && (
                      /[?!]$/.test(segment.text.trim()) ||
                      accumulatedText.split(/\s+/).length > 30
                    )) {
                      addCurrentParagraph();
                    }
                  }

                  // Add final segment
                  addCurrentSegment();

                  const getSpeakerColor = (speaker: string): string => {
                    if (!speaker || speaker === 'UU' || speaker === 'Unknown') {
                      return 'text-gray-600 bg-gray-100 border border-gray-300';
                    }

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

                    // Extract speaker number (S1, S2, etc.) or use hash for consistent coloring
                    const speakerMatch = speaker.match(/\d+/);
                    if (speakerMatch) {
                      const speakerNum = parseInt(speakerMatch[0]);
                      return colors[(speakerNum - 1) % colors.length];
                    }

                    // Fallback: use character hash
                    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    return colors[hash % colors.length];
                  };

                  const getSpeakerDisplayName = (speaker: string): string => {
                    // Convert S1, S2, etc. to Speaker 1, Speaker 2, etc.
                    const match = speaker.match(/^S(\d+)$/);
                    if (match) {
                      return `Speaker ${match[1]}`;
                    }
                    // For UU (unidentified), show "Unknown"
                    if (speaker === 'UU') {
                      return 'Unknown';
                    }
                    return speaker;
                  };

                  return processedSegments.map((speakerSegment, index) => (
                    <div key={index} className="group">
                      {speakerSegment.speaker && (
                        <div className="flex items-center mb-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speakerSegment.speaker)}`}>
                            {getSpeakerDisplayName(speakerSegment.speaker)}
                          </div>
                        </div>
                      )}
                      <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                        {speakerSegment.paragraphs.map((paragraph, paragraphIndex) => (
                          <div key={paragraphIndex} className="text-gray-800 leading-relaxed">
                            {paragraph.map((part, partIndex) => (
                              <span key={partIndex}>
                                {part.type === 'text' ? (
                                  part.content
                                ) : (
                                  <button
                                    onClick={() => jumpToTime(part.time!)}
                                    className="inline-flex items-center mx-2 text-blue-600 hover:text-blue-800 font-mono text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
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
                  ));
                })()}
              </div>
            ) : transcription.transcript ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{transcription.transcript}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No transcript available
              </p>
            )}
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {transcription.sharedAt && (
            <p>
              Shared on {new Date(transcription.sharedAt).toLocaleDateString()}
            </p>
          )}
          <p className="mt-2">
            Want to create your own transcripts?{' '}
            <a href="/" className="text-primary hover:underline">
              Get started
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
