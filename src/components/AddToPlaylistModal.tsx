import React, { useState } from 'react';
import { X, Plus, Check, Music2 } from 'lucide-react';
import { Track, Playlist } from '../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onCreateAndAdd: (playlistName: string, track: Track) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onAddToPlaylist,
  onCreateAndAdd,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  if (!isOpen || !track) return null;

  const handleSelectPlaylist = (playlistId: string) => {
    onAddToPlaylist(playlistId, track);
    setAddedMap((prev) => ({ ...prev, [playlistId]: true }));
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreateAndAdd(newPlaylistName.trim(), track);
    setNewPlaylistName('');
    setIsCreatingNew(false);
    onClose();
  };

  return (
    <div
      id="add-to-playlist-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="add-to-playlist-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#282828] text-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-white/10 flex flex-col gap-4 max-h-[85vh] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex flex-col min-w-0 pr-2">
            <h3 className="font-bold text-base text-white truncate">Add to playlist</h3>
            <span className="text-xs text-[#a7a7a7] truncate">
              {track.title} • {track.artist}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new playlist quick action */}
        {!isCreatingNew ? (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors"
          >
            <div className="w-9 h-9 rounded bg-[#1db954] flex items-center justify-center text-black flex-shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <span>New playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreateNew} className="flex flex-col gap-2 p-3 bg-[#181818] rounded-lg border border-white/10">
            <span className="text-xs text-[#b3b3b3] font-semibold">New Playlist Name</span>
            <input
              type="text"
              placeholder="e.g. Road Trip Vibes"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              className="bg-[#242424] border border-white/15 rounded p-2 text-sm text-white placeholder-[#727272] outline-none focus:border-[#1db954]"
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1 text-xs text-[#b3b3b3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-4 py-1.5 rounded-full bg-[#1db954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold"
              >
                Create & Add
              </button>
            </div>
          </form>
        )}

        {/* Existing Playlists List */}
        <div className="flex flex-col gap-1 overflow-y-auto max-h-60 pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#b3b3b3] px-1 mb-1">
            Your Playlists
          </span>
          {playlists.map((pl) => {
            const hasTrack = pl.tracks.some((t) => t.id === track.id || t.youtubeVideoId === track.youtubeVideoId);
            const isAddedJustNow = addedMap[pl.id];

            return (
              <button
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <img
                    src={pl.coverUrl}
                    alt={pl.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-white text-sm font-medium truncate group-hover:text-[#1db954] transition-colors">
                      {pl.name}
                    </span>
                    <span className="text-xs text-[#a7a7a7] truncate">
                      {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {hasTrack || isAddedJustNow ? (
                    <div className="flex items-center gap-1 text-[#1db954] text-xs font-bold">
                      <Check className="w-4 h-4" />
                      <span>Added</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#b3b3b3] opacity-0 group-hover:opacity-100 transition-opacity">
                      Add
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
