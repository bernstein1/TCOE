import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useStore } from '../store';

interface AudioPlayerProps {
    step: number;
    autoPlay?: boolean;
}

export default function AudioPlayer({ step, autoPlay = false }: AudioPlayerProps) {
    const { language } = useStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Reset state when step or language changes
        setIsPlaying(false);
        setAudioUrl(null);
        setError(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (autoPlay) {
            loadAndPlay();
        }
    }, [step, language]);

    const loadAndPlay = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check if we already have the URL for this step/language
            if (!audioUrl) {
                const data = await api.getStepAudio(step, language);
                if (data.audioUrl) {
                    setAudioUrl(data.audioUrl);
                    // Small delay to ensure audio element is updated
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.play().catch(e => console.error('Play failed:', e));
                            setIsPlaying(true);
                        }
                    }, 100);
                } else {
                    throw new Error('No audio URL returned');
                }
            } else {
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }
        } catch (err) {
            console.error('Failed to load audio:', err);
            setError('Audio unavailable');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
        } else {
            if (!audioUrl) {
                loadAndPlay();
            } else {
                audioRef.current?.play();
                setIsPlaying(true);
            }
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    if (error) return null;

    return (
        <div className="fixed bottom-6 left-6 z-40">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-full p-2 flex items-center gap-3 pr-4 transition-all hover:shadow-xl">
                <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-70"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                    ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                </button>

                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        AI Guide
                    </span>
                    <span className="text-xs text-gray-500">
                        {isPlaying ? 'Speaking...' : 'Click to listen'}
                    </span>
                </div>

                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={handleEnded}
                        className="hidden"
                    />
                )}
            </div>
        </div>
    );
}
