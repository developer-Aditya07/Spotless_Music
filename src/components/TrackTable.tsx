import React from 'react';
import { Play, Pause, Heart, Clock, PlusCircle } from 'lucide-react';
import { Track } from '../types';

interface TrackTableProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onSelectTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleLike: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
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
  onAddToPlaylist,
}) => {
  return (
    <div id="spotify-track-table-container" className="w-full text-sm select-none">
      {/* Table Header (Desktop Only) */}
      <div
        id="track-table-header"
        className="hidden md:grid grid-cols-[16px_4fr_3fr_2fr_minmax(130px,1fr)] gap-4 px-4 py-2 border-b border-white/10 text-xs text-[#b3b3b3] font-semibold uppercase tracking-wider items-center"
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
      <div id="track-table-rows" className="flex flex-col py-1 md:py-2">
        {tracks.map((track, index) => {
          const isCurrent = currentTrack?.id === track.id || (currentTrack?.youtubeVideoId && currentTrack.youtubeVideoId === track.youtubeVideoId);
          const isLiked = likedTrackIds.includes(track.id);

          return (
            <div
              id={`track-row-${track.id}`}
              key={`${track.id}-${index}`}
              onClick={() => onSelectTrack(track)}
              className={`group rounded-lg transition-colors cursor-pointer select-none ${
                isCurrent ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'
              }`}
            >
              {/* MOBILE ROW (Visible on phones & small screens) */}
              <div className="flex md:hidden items-center justify-between px-3 py-2 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded overflow-hidden flex-shrink-0 bg-[#282828] shadow">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        {isPlaying ? (
                          <div className="w-3.5 h-3.5 text-[#1db954] flex items-center justify-center">
                            <Pause className="w-3.5 h-3.5 fill-[#1db954]" />
                          </div>
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-[#1db954] text-[#1db954] ml-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 pr-1">
                    <span
                      className={`font-semibold text-sm truncate ${
                        isCurrent ? 'text-[#1db954]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[#a7a7a7] truncate">
                      {track.isExplicit && (
                        <span className="text-[9px] font-bold px-1 rounded bg-[#727272]/60 text-white uppercase">
                          E
                        </span>
                      )}
                      <span className="truncate">{track.artist}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {onAddToPlaylist && (
                    <button
                      id={`btn-mobile-add-pl-${track.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlaylist(track);
                      }}
                      className="p-1.5 text-[#a7a7a7] hover:text-white active:scale-90 transition-transform"
                      title="Add to playlist"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    id={`btn-mobile-like-${track.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track);
                    }}
                    className="p-1.5 text-[#a7a7a7] active:scale-90 transition-transform"
                    title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'text-[#1db954] fill-[#1db954]' : ''}`} />
                  </button>
                  <span className="text-xs text-[#a7a7a7] tabular-nums min-w-[32px] text-right">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>

              {/* DESKTOP ROW (Hidden on mobile, 5-column layout on md+) */}
              <div className="hidden md:grid grid-cols-[16px_4fr_3fr_2fr_minmax(130px,1fr)] gap-4 px-4 py-2.5 items-center">
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

                {/* Col 5: Duration & Like & Add to Playlist */}
                <div className="flex items-center justify-end gap-2 text-xs text-[#b3b3b3] pr-4">
                  {onAddToPlaylist && (
                    <button
                      id={`btn-add-pl-row-${track.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlaylist(track);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                      title="Add to playlist"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}

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

                  <span className="tabular-nums min-w-[35px] text-right">{formatDuration(track.duration)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
