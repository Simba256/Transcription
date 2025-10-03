"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  src: string;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void; // Explicit seek callback
  standalone?: boolean; // Whether to show card styling
}

export interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({
  src,
  className = '',
  onTimeUpdate,
  onSeek,
  standalone = true
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Use ref to track if we're programmatically seeking to prevent feedback
  const isSeekingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (audioRef.current) {
        isSeekingRef.current = true;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        onSeek?.(time);

        setTimeout(() => {
          isSeekingRef.current = false;
        }, 100);
      }
    },
    play: () => {
      audioRef.current?.play();
    },
    pause: () => {
      audioRef.current?.pause();
    }
  }), [onSeek]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Throttle time updates to prevent excessive re-renders and feedback loops
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !isDragging && !isSeekingRef.current) {
      const time = audioRef.current.currentTime;
      const now = Date.now();

      // Throttle updates to max once per 100ms to reduce re-renders
      if (now - lastUpdateTimeRef.current >= 100) {
        setCurrentTime(time);
        onTimeUpdate?.(time);
        lastUpdateTimeRef.current = now;
      }
    }
  }, [isDragging, onTimeUpdate]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      isSeekingRef.current = true;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onSeek?.(newTime); // Use explicit seek callback instead of onTimeUpdate

      // Reset seeking flag after a short delay to allow audio to settle
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [onSeek]);

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
    }
  };

  const skipTime = useCallback((seconds: number) => {
    if (audioRef.current) {
      isSeekingRef.current = true;
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onSeek?.(newTime); // Use explicit seek callback

      // Reset seeking flag after a short delay
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [duration, onSeek]);

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
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

  return (
    <div className={standalone ? `bg-card border rounded-lg p-4 ${className}` : className}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Progress Bar */}
      <div className="mb-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          onPointerDown={handleSeekStart}
          onPointerUp={handleSeekEnd}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Top: Playback controls */}
        <div className="flex items-center justify-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipTime(-5)}
            title="Rewind 5 seconds"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipTime(5)}
            title="Forward 5 seconds"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={changePlaybackRate}
            className="min-w-[60px]"
            title="Change playback speed"
          >
            {playbackRate}x
          </Button>
        </div>

        {/* Bottom: Volume controls */}
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="flex-shrink-0"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';
