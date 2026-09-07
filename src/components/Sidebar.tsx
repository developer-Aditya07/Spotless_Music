import React from 'react';
import { Home, Search, Library, Plus, Heart, Music2, ShieldCheck, Sparkles, History } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, playlistId?: string) => void;
  playlists: Playlist[];
  likedCount: number;
  historyCount: number;
  openCreatePlaylistModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  playlists,
  likedCount,
  historyCount,
  openCreatePlaylistModal,
}) => {
  return (
    <aside
      id="spotify-sidebar"
      className="w-64 bg-black flex flex-col h-full flex-shrink-0 text-[#b3b3b3] p-3 gap-2 select-none"
    >
      {/* Brand & Top Navigation Box */}
      <div id="sidebar-nav-container" className="bg-[#121212] rounded-lg p-5 flex flex-col gap-5">
        <div
          id="spotify-logo-button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center text-black font-black">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.217.355-.678.47-1.033.253-2.827-1.727-6.385-2.117-10.575-1.16-.407.094-.813-.16-.906-.566-.094-.408.16-.813.567-.906 4.587-1.047 8.528-.604 11.694 1.346.354.217.47.678.253 1.033zm1.47-3.266c-.273.444-.855.586-1.299.313-3.235-1.988-8.167-2.564-11.994-1.401-.5.152-1.033-.13-1.185-.63-.153-.5.13-1.033.63-1.185 4.382-1.33 9.814-.688 13.535 1.604.444.273.586.855.313 1.299zm.126-3.41c-3.88-2.304-10.278-2.516-13.987-1.39-.594.18-1.228-.155-1.408-.748-.18-.594.155-1.228.748-1.408 4.258-1.293 11.317-1.043 15.787 1.61.534.317.708 1.01.39 1.545-.317.534-1.01.708-1.545.39z" />
            </svg>
          </div>
          <span className="tracking-tight text-white font-extrabold text-lg">Spotify</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] uppercase tracking-wider ml-auto">
            Ad-Free
          </span>
        </div>

        <nav id="sidebar-main-nav" className="flex flex-col gap-3 font-semibold text-sm">
          <button
            id="nav-btn-home"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-4 transition-colors hover:text-white py-1 ${
              currentView === 'home' ? 'text-white' : ''
            }`}
          >
            <Home className={`w-6 h-6 ${currentView === 'home' ? 'text-[#1db954]' : ''}`} />
            <span>Home</span>
          </button>
          <button
            id="nav-btn-search"
            onClick={() => onNavigate('search')}
            className={`flex items-center gap-4 transition-colors hover:text-white py-1 ${
              currentView === 'search' ? 'text-white' : ''
            }`}
          >
            <Search className={`w-6 h-6 ${currentView === 'search' ? 'text-[#1db954]' : ''}`} />
            <span>Search</span>
          </button>
        </nav>
      </div>

      {/* Library Section Box */}
      <div id="sidebar-library-container" className="bg-[#121212] rounded-lg p-3 flex-1 flex flex-col min-h-0">
        <div id="library-header" className="flex items-center justify-between px-2 py-2 mb-2">
          <button
            id="nav-btn-library"
            onClick={() => onNavigate('library')}
            className="flex items-center gap-3 font-semibold text-sm hover:text-white transition-colors group"
          >
            <Library className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors" />
            <span>Your Library</span>
          </button>
          <button
            id="create-playlist-btn"
            onClick={openCreatePlaylistModal}
            className="p-1.5 hover:bg-[#282828] rounded-full hover:text-white transition-colors"
            title="Create playlist or folder"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Liked Songs Row */}
        <div
          id="sidebar-liked-songs-row"
          onClick={() => onNavigate('liked')}
          className={`flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
            currentView === 'liked' ? 'bg-[#282828] text-white' : ''
          }`}
        >
          <div className="w-12 h-12 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-medium truncate">Liked Songs</span>
            <span className="text-xs text-[#a7a7a7] flex items-center gap-1">
              Playlist • {likedCount} {likedCount === 1 ? 'song' : 'songs'}
            </span>
          </div>
        </div>

        {/* Listening History Row */}
        <div
          id="sidebar-history-row"
          onClick={() => onNavigate('history')}
          className={`flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
            currentView === 'history' ? 'bg-[#282828] text-white' : ''
          }`}
        >
          <div className="w-12 h-12 rounded bg-[#1e293b] flex items-center justify-center flex-shrink-0 border border-white/5">
            <History className="w-5 h-5 text-[#38bdf8]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-medium truncate">Listening History</span>
            <span className="text-xs text-[#a7a7a7] flex items-center gap-1">
              {historyCount} {historyCount === 1 ? 'recent song' : 'recent songs'}
            </span>
          </div>
        </div>

        {/* Playlists List */}
        <div id="sidebar-playlists-list" className="flex-1 overflow-y-auto mt-2 flex flex-col gap-1 pr-1">
          {playlists.map((playlist) => (
            <div
              id={`sidebar-playlist-item-${playlist.id}`}
              key={playlist.id}
              onClick={() => onNavigate('playlist', playlist.id)}
              className={`flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer transition-colors group ${
                currentView === `playlist-${playlist.id}` ? 'bg-[#282828] text-white' : ''
              }`}
            >
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate group-hover:text-white">
                  {playlist.name}
                </span>
                <span className="text-xs text-[#a7a7a7] truncate">
                  Playlist • {playlist.owner}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Ad-Free Protection Banner */}
        <div id="sidebar-adfree-badge" className="mt-auto pt-3 border-t border-[#282828] px-2 flex items-center gap-2 text-xs text-[#1db954]">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold truncate">100% Ad-Free YouTube Engine</span>
        </div>
      </div>
    </aside>
  );
};
