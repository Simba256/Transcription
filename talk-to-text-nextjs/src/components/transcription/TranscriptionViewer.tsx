'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Edit3, 
  Save, 
  X,
  Search,
  Volume2,
  FileText,
  Clock,
  User,
  Type,
  Share
} from 'lucide-react';
import { TranscriptionJobData } from '@/lib/transcription-queue';

interface TranscriptionViewerProps {
  transcription: TranscriptionJobData;
  audioUrl?: string;
  onSave?: (editedTranscript: string) => void;
  onDownload?: (format: 'txt' | 'json' | 'srt') => void;
  showEdit?: boolean;
  showAudioPlayer?: boolean;
}

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  content: string;
  speaker?: string;
  confidence?: number;
}

export default function TranscriptionViewer({
  transcription,
  audioUrl,
  onSave,
  onDownload,
  showEdit = true,
  showAudioPlayer = true
}: TranscriptionViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcription.transcript || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<number>(-1);
  const [view, setView] = useState<'formatted' | 'raw' | 'segments'>('formatted');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Parse transcript segments from full transcript
  const segments: TranscriptSegment[] = React.useMemo(() => {
    if (!transcription.fullTranscript?.results) return [];
    
    const results = transcription.fullTranscript.results;
    const segments: TranscriptSegment[] = [];
    let currentSegment: TranscriptSegment | null = null;
    
    for (const result of results) {
      if (result.type === 'word' && result.alternatives[0]) {
        const word = result.alternatives[0];
        const speaker = word.speaker || 'Unknown';
        
        if (!currentSegment || currentSegment.speaker !== speaker || 
            result.start_time - currentSegment.end_time > 2) {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            start_time: result.start_time,
            end_time: result.end_time,
            content: word.content + ' ',
            speaker,
            confidence: word.confidence
          };
        } else {
          currentSegment.content += word.content + ' ';
          currentSegment.end_time = result.end_time;
        }
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }, [transcription.fullTranscript]);

  // Update current segment based on audio time
  useEffect(() => {
    if (segments.length === 0) return;
    
    const activeIndex = segments.findIndex(segment => 
      currentTime >= segment.start_time && currentTime <= segment.end_time
    );
    
    setActiveSegment(activeIndex);
  }, [currentTime, segments]);

  // Audio player handlers
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const seekToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle save
  const handleSave = () => {
    if (onSave) {
      onSave(editedTranscript);
    }
    setIsEditing(false);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcription.transcript || '');
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Highlight search terms
  const highlightSearchTerm = (text: string): string => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // Get speaker color
  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const renderFormattedView = () => {
    const text = transcription.transcript || '';
    const highlightedText = highlightSearchTerm(text);
    
    return (
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    );
  };

  const renderSegmentView = () => {
    return (
      <div className="space-y-3">
        {segments.map((segment, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeSegment === index
                ? 'bg-blue-50 border-blue-200 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => seekToTime(segment.start_time)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={getSpeakerColor(segment.speaker || 'Unknown')}>
                  <User className="h-3 w-3 mr-1" />
                  {segment.speaker || 'Unknown'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                </Badge>
                {segment.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(segment.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
            </div>
            <p 
              className="text-sm"
              dangerouslySetInnerHTML={{ 
                __html: highlightSearchTerm(segment.content.trim()) 
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderRawView = () => {
    const jsonData = transcription.fullTranscript || { transcript: transcription.transcript };
    
    return (
      <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {transcription.fileName}
              </CardTitle>
              <CardDescription>
                Transcription completed on {transcription.completedAt && 
                  new Date(transcription.completedAt.seconds * 1000).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onDownload && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => onDownload('txt')}>
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDownload('json')}>
                    JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDownload('srt')}>
                    SRT
                  </Button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Audio Player */}
      {showAudioPlayer && audioUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Audio Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />
              
              <div className="flex items-center gap-4">
                <Button onClick={handlePlayPause} size="sm">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                <span className="text-sm text-gray-600">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transcript</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-md text-sm w-64"
                />
              </div>
              
              {/* View Toggle */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={view === 'formatted' ? 'default' : 'outline'}
                  onClick={() => setView('formatted')}
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={view === 'segments' ? 'default' : 'outline'}
                  onClick={() => setView('segments')}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={view === 'raw' ? 'default' : 'outline'}
                  onClick={() => setView('raw')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Edit Toggle */}
              {showEdit && !isEditing && (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Edit the transcript..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditedTranscript(transcription.transcript || '');
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div ref={transcriptRef} className="min-h-[400px]">
              {view === 'formatted' && renderFormattedView()}
              {view === 'segments' && renderSegmentView()}
              {view === 'raw' && renderRawView()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Word Count</p>
              <p className="text-2xl font-bold text-gray-900">
                {transcription.transcript?.split(' ').length || 0}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {transcription.duration ? formatTime(transcription.duration) : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Speakers</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(segments.map(s => s.speaker)).size || 1}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Language</p>
              <p className="text-2xl font-bold text-gray-900">
                {transcription.language?.toUpperCase() || 'EN'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}