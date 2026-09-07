import React from 'react';
import { Play, Pause, Heart, Clock, Music } from 'lucide-react';
import { Track } from '../types';

interface TrackTableProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onSelectTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleLike: (track: Track) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onSelectTrack,
  onTogglePlay,
  onToggleLike,
}) => {
  return (
    <div id="spotify-track-table-container" className="w-full text-sm select-none">
      {/* Table Header */}
      <div
        id="track-table-header"
        className="grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 px-4 py-2 border-b border-white/10 text-xs text-[#b3b3b3] font-semibold uppercase tracking-wider items-center"
      >
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Album</span>
        <span>Date Added</span>
        <div className="flex items-center justify-end pr-4">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Track Rows */}
      <div id="track-table-rows" className="flex flex-col py-2">
        {tracks.map((track, index) => {
          const isCurrent = currentTrack?.id === track.id;
          const isLiked = likedTrackIds.includes(track.id);

          return (
            <div
              id={`track-row-${track.id}`}
              key={track.id}
              onClick={() => onSelectTrack(track)}
              className={`group grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 px-4 py-2.5 rounded-md hover:bg-white/10 items-center transition-colors cursor-pointer ${
                isCurrent ? 'bg-white/5' : ''
              }`}
            >
              {/* Col 1: Index or Play / Equalizer */}
              <div className="flex items-center justify-center text-[#b3b3b3]">
                {isCurrent && isPlaying ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay();
                    }}
                    className="w-4 h-4 flex items-center justify-center text-[#1db954]"
                  >
                    <span className="inline-block w-3.5 h-3.5 animate-pulse">
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </span>
                  </div>
                ) : (
                  <>
                    <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-[#1db954] font-bold' : ''}`}>
                      {index + 1}
                    </span>
                    <button
                      id={`btn-play-row-${track.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) {
                          onTogglePlay();
                        } else {
                          onSelectTrack(track);
                        }
                      }}
                      className="hidden group-hover:flex items-center justify-center text-white hover:scale-110 transition-transform"
                      title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Col 2: Title & Artist Artwork */}
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0 shadow"
                />
                <div className="flex flex-col min-w-0 pr-2">
                  <span
                    className={`font-medium truncate ${
                      isCurrent ? 'text-[#1db954]' : 'text-white group-hover:text-white'
                    }`}
                  >
                    {track.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#b3b3b3]">
                    {track.isExplicit && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#727272]/50 text-white leading-tight uppercase">
                        E
                      </span>
                    )}
                    <span className="truncate hover:underline hover:text-white cursor-pointer">
                      {track.artist}
                    </span>
                  </div>
                </div>
              </div>

              {/* Col 3: Album */}
              <div className="text-xs text-[#b3b3b3] truncate hover:underline hover:text-white cursor-pointer">
                {track.album}
              </div>

              {/* Col 4: Date Added */}
              <div className="text-xs text-[#b3b3b3] truncate">
                {track.addedAt || '1 week ago'}
              </div>

              {/* Col 5: Duration & Like */}
              <div className="flex items-center justify-end gap-3 text-xs text-[#b3b3b3] pr-4">
                <button
                  id={`btn-like-row-${track.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(track);
                  }}
                  className={`p-1 transition-colors ${
                    isLiked
                      ? 'text-[#1db954]'
                      : 'text-[#b3b3b3] opacity-0 group-hover:opacity-100 hover:text-white'
                  }`}
                  title={isLiked ? 'Remove from Your Library' : 'Save to Your Library'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1db954]' : ''}`} />
                </button>
                <span className="tabular-nums">{formatDuration(track.duration)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
