'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  AlertCircle
} from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  title?: string;
  onError?: (error: string) => void;
}

export default function AudioPlayer({ audioUrl, fileName, title, onError }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: any) => {
      console.error('Audio playback error:', e);
      const errorMessage = 'Failed to load audio file. The file may be corrupted or inaccessible.';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Set initial volume
    audio.volume = volume;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, volume, onError]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio');
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download audio file');
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Try Download
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Audio Info */}
      <div className="text-center">
        <h4 className="font-medium text-sm text-gray-900 truncate">
          {title || fileName}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          {isLoading ? 'Loading...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          disabled={isLoading}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={skipBackward}
          disabled={isLoading}
          title="Skip backward 10s"
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="px-4"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={stopAudio}
          disabled={isLoading}
        >
          <Square className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={skipForward}
          disabled={isLoading}
          title="Skip forward 10s"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Volume and Speed Controls */}
      <div className="flex items-center justify-between space-x-4">
        {/* Volume Control */}
        <div className="flex items-center space-x-2 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            disabled={isLoading}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={isLoading}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-600 min-w-[35px]">Speed:</span>
          <select
            value={playbackRate}
            onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
            disabled={isLoading}
            className="text-xs border rounded px-2 py-1"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Download Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
          title="Download audio file"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}