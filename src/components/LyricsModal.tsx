import React, { useEffect, useRef } from 'react';
import { X, Mic2, Sparkles } from 'lucide-react';
import { Track } from '../types';

interface LyricsModalProps {
  currentTrack: Track | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSeek: (seconds: number) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  currentTrack,
  currentTime,
  isOpen,
  onClose,
  onSeek,
}) => {
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  if (!isOpen || !currentTrack) return null;

  const lyrics = currentTrack.lyrics || [
    { time: 0, text: `♪ ${currentTrack.title} ♪` },
    { time: 10, text: `Performing artist: ${currentTrack.artist}` },
    { time: 20, text: "Streaming in high fidelity ad-free via YouTube Music" },
    { time: 35, text: "Sing along and enjoy pure music with no commercial interruptions" },
    { time: 60, text: "♪ Instrumental breakdown ♪" },
    { time: 100, text: "Pure Spotify Experience • Ad-Free Always" },
  ];

  // Find index of active line
  let activeIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    }
  }

  return (
    <div
      id="spotify-lyrics-view"
      className="fixed inset-0 z-50 bg-[#163b28]/95 backdrop-blur-2xl flex flex-col p-8 overflow-hidden select-none animate-fadeIn"
    >
      {/* Header */}
      <div id="lyrics-header" className="flex items-center justify-between max-w-4xl w-full mx-auto pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1db954]/20 flex items-center justify-center text-[#1db954]">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white text-lg font-bold">{currentTrack.title}</h2>
            <p className="text-sm text-[#b3b3b3]">{currentTrack.artist}</p>
          </div>
        </div>

        <button
          id="btn-close-lyrics"
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 hover:bg-black/80 text-white transition-colors"
          title="Close lyrics"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Lyrics lines */}
      <div
        id="lyrics-scroll-container"
        className="flex-1 max-w-4xl w-full mx-auto overflow-y-auto py-12 flex flex-col gap-8 scroll-smooth"
      >
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;

          return (
            <p
              id={`lyric-line-${index}`}
              key={index}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek(line.time)}
              className={`cursor-pointer transition-all duration-300 font-bold text-2xl md:text-3xl lg:text-4xl ${
                isActive
                  ? 'text-white scale-105 origin-left'
                  : isPassed
                  ? 'text-white/40 hover:text-white/70'
                  : 'text-white/30 hover:text-white/70'
              }`}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Footer hint */}
      <div id="lyrics-footer" className="max-w-4xl w-full mx-auto pt-4 text-xs text-white/50 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#1db954]" />
        <span>Click any lyric line to jump playback directly to that timestamp</span>
      </div>
    </div>
  );
};
