import React from 'react';
import { X, Play, Trash2, ListMusic, Music } from 'lucide-react';
import { Track } from '../types';

interface QueueDrawerProps {
  currentTrack: Track | null;
  queue: Track[];
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  currentTrack,
  queue,
  isOpen,
  onClose,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      id="spotify-queue-drawer"
      className="w-80 bg-[#121212] border-l border-[#282828] flex flex-col h-full flex-shrink-0 select-none z-20"
    >
      {/* Drawer Header */}
      <div id="queue-header" className="p-4 flex items-center justify-between border-b border-[#282828]">
        <div className="flex items-center gap-2 text-white font-bold">
          <ListMusic className="w-5 h-5 text-[#1db954]" />
          <span>Play Queue</span>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              id="btn-clear-queue"
              onClick={onClearQueue}
              className="text-xs text-[#b3b3b3] hover:text-white transition-colors"
              title="Clear queue"
            >
              Clear
            </button>
          )}
          <button
            id="btn-close-queue"
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div id="queue-content-scroll" className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Now Playing Section */}
        {currentTrack && (
          <div id="queue-now-playing-section">
            <h4 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider mb-3">
              Now Playing
            </h4>
            <div className="flex items-center gap-3 p-2 rounded-md bg-[#282828]/60">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-[#1db954] truncate">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next In Queue Section */}
        <div id="queue-up-next-section">
          <h4 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider mb-3">
            Next In Queue ({queue.length})
          </h4>

          {queue.length === 0 ? (
            <div className="text-xs text-[#727272] py-4 text-center">
              Queue is empty. Add songs from any album or playlist!
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {queue.map((track, idx) => (
                <div
                  id={`queue-item-${idx}`}
                  key={`${track.id}-${idx}`}
                  className="group flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] transition-colors"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-white truncate">{track.title}</span>
                    <span className="text-xs text-[#b3b3b3] truncate">{track.artist}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="p-1 text-[#b3b3b3] hover:text-white"
                      title="Play now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFromQueue(idx)}
                      className="p-1 text-[#b3b3b3] hover:text-red-400"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
