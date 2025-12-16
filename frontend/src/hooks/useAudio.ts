import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

interface AudioState {
  isLoading: boolean;
  isPlaying: boolean;
  progress: number;
  duration: number;
  error: string | null;
}

export function useAudio(step: number, enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    isLoading: false,
    isPlaying: false,
    progress: 0,
    duration: 0,
    error: null,
  });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load audio when step changes
  useEffect(() => {
    if (!enabled) return;

    const loadAudio = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const response = await api.getStepAudio(step);
        
        if (response.narration?.audioUrl) {
          setAudioUrl(response.narration.audioUrl);
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to load audio',
          isLoading: false 
        }));
      }
    };

    loadAudio();
  }, [step, enabled]);

  // Setup audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setState(prev => ({ 
        ...prev, 
        duration: audio.duration,
        isLoading: false 
      }));
    });

    audio.addEventListener('timeupdate', () => {
      setState(prev => ({ 
        ...prev, 
        progress: audio.currentTime 
      }));
    });

    audio.addEventListener('ended', () => {
      setState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
    });

    audio.addEventListener('error', () => {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to play audio',
        isLoading: false 
      }));
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, progress: time }));
    }
  }, []);

  const restart = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    restart,
  };
}

export default useAudio;
