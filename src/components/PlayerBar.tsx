import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Mic2,
  ListMusic,
  Heart,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Track, RepeatMode } from '../types';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (track: Track) => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleFullscreen: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  isLyricsOpen,
  isQueueOpen,
  isFullscreen,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLyrics,
  onToggleQueue,
  onToggleFullscreen,
}) => {
  const currentVolume = isMuted ? 0 : volume;

  return (
    <footer
      id="spotify-player-bar"
      className="h-20 bg-black border-t border-[#282828] px-4 flex items-center justify-between z-40 select-none"
    >
      {/* Left: Track Details */}
      <div id="player-track-info" className="flex items-center gap-3.5 w-[30%] min-w-[180px]">
        {currentTrack ? (
          <>
            <img
              id="player-track-artwork"
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded object-cover shadow-md flex-shrink-0"
            />
            <div className="flex flex-col min-w-0 pr-2">
              <span
                id="player-track-title"
                className="text-white text-sm font-semibold truncate hover:underline cursor-pointer"
              >
                {currentTrack.title}
              </span>
              <span
                id="player-track-artist"
                className="text-xs text-[#b3b3b3] truncate hover:underline cursor-pointer"
              >
                {currentTrack.artist}
              </span>
            </div>
            <button
              id="btn-player-like"
              onClick={() => onToggleLike(currentTrack)}
              className={`p-1.5 transition-transform active:scale-90 ${
                isLiked ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1db954]' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-xs text-[#727272]">Select a track to play ad-free</div>
        )}
      </div>

      {/* Center: Playback Controls & Scrubber */}
      <div id="player-controls-container" className="flex flex-col items-center gap-2 max-w-[722px] w-[40%]">
        {/* Buttons Row */}
        <div id="player-buttons-row" className="flex items-center gap-4">
          <button
            id="btn-player-shuffle"
            onClick={onToggleShuffle}
            className={`transition-colors p-1 ${
              isShuffle ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title="Enable shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            id="btn-player-prev"
            onClick={onPrev}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            id="btn-player-play-pause"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            id="btn-player-next"
            onClick={onNext}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            id="btn-player-repeat"
            onClick={onToggleRepeat}
            className={`transition-colors p-1 ${
              repeatMode !== 'off' ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrubber Timeline Row */}
        <div id="player-scrubber-row" className="w-full flex items-center gap-2 text-xs text-[#a7a7a7]">
          <span id="player-time-current" className="w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative group flex items-center cursor-pointer">
            <input
              id="player-timeline-slider"
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1 bg-[#4d4d4d] rounded-full appearance-none outline-none cursor-pointer accent-[#1db954] group-hover:bg-[#5e5e5e]"
            />
          </div>
          <span id="player-time-duration" className="w-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Actions, Lyrics, Queue, Volume */}
      <div id="player-right-actions" className="flex items-center justify-end gap-3 w-[30%] min-w-[180px]">
        <button
          id="btn-toggle-lyrics"
          onClick={onToggleLyrics}
          className={`p-1.5 transition-colors ${
            isLyricsOpen ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Lyrics"
        >
          <Mic2 className="w-5 h-5" />
        </button>

        <button
          id="btn-toggle-queue"
          onClick={onToggleQueue}
          className={`p-1.5 transition-colors ${
            isQueueOpen ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>

        {/* Volume controls */}
        <div id="player-volume-group" className="flex items-center gap-2 w-32">
          <button
            id="btn-toggle-mute"
            onClick={onToggleMute}
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : volume < 50 ? (
              <Volume1 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            id="player-volume-slider"
            type="range"
            min={0}
            max={100}
            value={currentVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-20 h-1 bg-[#4d4d4d] rounded-full appearance-none outline-none cursor-pointer accent-[#1db954] hover:bg-[#5e5e5e]"
          />
        </div>

        <button
          id="btn-toggle-fullscreen"
          onClick={onToggleFullscreen}
          className="text-[#b3b3b3] hover:text-white transition-colors p-1"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </footer>
  );
};
