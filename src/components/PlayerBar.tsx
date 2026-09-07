import React, { useState } from 'react';
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
  ChevronDown,
  MoreVertical,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const currentVolume = isMuted ? 0 : volume;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MOBILE FULL-SCREEN NOW PLAYING OVERLAY (Spotify Native) */}
      {/* ======================================================== */}
      {isMobileExpanded && currentTrack && (
        <div
          id="spotify-mobile-fullscreen-player"
          className="md:hidden fixed inset-0 z-50 bg-gradient-to-b from-[#333333] via-[#181818] to-[#121212] flex flex-col justify-between p-6 select-none overflow-y-auto"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-close-mobile-fullscreen"
              onClick={() => setIsMobileExpanded(false)}
              className="p-2 -ml-2 text-white/80 hover:text-white active:scale-95 transition-transform"
              title="Minimize"
            >
              <ChevronDown className="w-7 h-7" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-widest text-[#a7a7a7] uppercase">
                Playing from playlist
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[200px]">
                {currentTrack.album || 'Ad-Free Music'}
              </span>
            </div>

            <button
              onClick={() => onToggleLike(currentTrack)}
              className="p-2 -mr-2 text-white/80 hover:text-white"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'text-[#1db954] fill-[#1db954]' : ''}`} />
            </button>
          </div>

          {/* Center Album Art */}
          <div className="my-auto py-6 flex items-center justify-center">
            <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bottom Track Meta & Controls */}
          <div className="flex flex-col gap-5 pb-6">
            {/* Title & Artist Row */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0 pr-4">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate leading-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm sm:text-base text-[#b3b3b3] truncate mt-0.5 font-medium">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Scrubber Timeline */}
            <div className="flex flex-col gap-1.5">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-[#4d4d4d] rounded-full appearance-none outline-none cursor-pointer accent-white hover:accent-[#1db954]"
              />
              <div className="flex items-center justify-between text-xs text-[#a7a7a7] font-medium tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                onClick={onToggleShuffle}
                className={`p-2 transition-colors ${
                  isShuffle ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={onPrev}
                className="p-2 text-white active:scale-90 transition-transform"
                title="Previous"
              >
                <SkipBack className="w-8 h-8 fill-current" />
              </button>

              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center active:scale-95 shadow-2xl transition-transform"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black ml-1" />
                )}
              </button>

              <button
                onClick={onNext}
                className="p-2 text-white active:scale-90 transition-transform"
                title="Next"
              >
                <SkipForward className="w-8 h-8 fill-current" />
              </button>

              <button
                onClick={onToggleRepeat}
                className={`p-2 transition-colors ${
                  repeatMode !== 'off' ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
                }`}
                title="Repeat"
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Mobile Footer Drawer Actions */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#a7a7a7]">
              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  onToggleLyrics();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 ${
                  isLyricsOpen ? 'bg-[#1db954] text-black font-bold' : 'bg-white/5 text-white'
                }`}
              >
                <Mic2 className="w-4 h-4" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  onToggleQueue();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 ${
                  isQueueOpen ? 'bg-[#1db954] text-black font-bold' : 'bg-white/5 text-white'
                }`}
              >
                <ListMusic className="w-4 h-4" />
                <span>Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MOBILE DOCKED MINI-PLAYER (Floating above bottom nav) */}
      {/* ======================================================== */}
      {currentTrack && (
        <div
          id="spotify-mobile-mini-player"
          onClick={() => setIsMobileExpanded(true)}
          className="md:hidden mx-2 mb-1 bg-[#282828]/95 backdrop-blur-md rounded-lg p-2 flex items-center justify-between shadow-2xl relative overflow-hidden border border-white/10 cursor-pointer active:opacity-95 select-none z-30"
        >
          {/* Bottom green track progress indicator */}
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-[#1db954] transition-all duration-300 pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />

          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-10 h-10 rounded object-cover shadow flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-bold truncate">
                {currentTrack.title}
              </span>
              <span className="text-[11px] text-[#a7a7a7] truncate font-medium">
                {currentTrack.artist}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(currentTrack);
              }}
              className="p-2 text-[#b3b3b3] active:scale-90"
              title="Like"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'text-[#1db954] fill-[#1db954]' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center active:scale-95 shadow transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="p-2 text-[#b3b3b3] active:scale-90"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DESKTOP FULL PLAYER BAR (Hidden on mobile)            */}
      {/* ======================================================== */}
      <footer
        id="spotify-player-bar"
        className="hidden md:flex h-20 bg-black border-t border-[#282828] px-4 items-center justify-between z-40 select-none"
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
    </>
  );
};
