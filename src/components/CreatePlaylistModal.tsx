import React, { useState } from 'react';
import { X, Music } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div
      id="create-playlist-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div
        id="create-playlist-modal"
        className="bg-[#282828] text-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-white/10 flex flex-col gap-5 animate-fadeIn"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-bold text-lg">Create Playlist</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="playlist-name-input" className="text-xs font-semibold text-[#b3b3b3]">
              Playlist Name
            </label>
            <input
              id="playlist-name-input"
              type="text"
              placeholder="My awesome playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="bg-[#121212] border border-white/15 rounded-md p-2.5 text-sm text-white placeholder-[#727272] outline-none focus:border-[#1db954]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="playlist-desc-input" className="text-xs font-semibold text-[#b3b3b3]">
              Description (Optional)
            </label>
            <textarea
              id="playlist-desc-input"
              rows={3}
              placeholder="Give your playlist a catchy description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#121212] border border-white/15 rounded-md p-2.5 text-sm text-white placeholder-[#727272] outline-none focus:border-[#1db954] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#b3b3b3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 rounded-full bg-[#1db954] hover:bg-[#1ed760] disabled:opacity-50 text-black text-xs font-bold transition-transform active:scale-95"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
