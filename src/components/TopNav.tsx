import React from 'react';
import { ChevronLeft, ChevronRight, Search, Settings, ShieldCheck, Sparkles, User } from 'lucide-react';

interface TopNavProps {
  currentView: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  searchQuery,
  onSearchChange,
  onOpenSettings,
}) => {
  return (
    <header
      id="spotify-top-nav"
      className="h-16 px-6 bg-[#101010]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4 select-none"
    >
      {/* Navigation history controls */}
      <div id="nav-history-buttons" className="flex items-center gap-2">
        <button
          id="btn-history-back"
          className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-black transition-colors"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          id="btn-history-forward"
          className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-black transition-colors"
          title="Go forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dynamic Search Bar */}
      <div id="top-nav-center" className="flex-1 max-w-md">
        {currentView === 'search' ? (
          <div id="search-input-wrapper" className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3 text-[#757575] pointer-events-none" />
            <input
              id="main-search-input"
              type="text"
              placeholder="What do you want to play? (Search songs, artists, or paste YouTube link)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="w-full bg-[#242424] text-white placeholder-[#757575] text-sm rounded-full py-2.5 pl-10 pr-4 outline-none border border-transparent focus:border-white transition-all shadow-inner"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-[#242424] text-[#a7a7a7] flex items-center gap-1.5 font-medium border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1db954]" />
              Zero Advertisements Mode Active
            </span>
          </div>
        )}
      </div>

      {/* Right Action Items */}
      <div id="top-nav-actions" className="flex items-center gap-3">
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-xs font-bold text-white bg-[#242424] hover:bg-[#2a2a2a] px-3.5 py-1.5 rounded-full border border-white/10 hover:border-white/25 transition-all shadow-sm"
          title="Configure YouTube Music API Key & Audio Settings"
        >
          <Settings className="w-4 h-4 text-[#1db954]" />
          <span>YT Music API</span>
        </button>

        <div
          id="user-profile-button"
          className="w-9 h-9 rounded-full bg-[#282828] border border-white/10 flex items-center justify-center text-white hover:scale-105 cursor-pointer transition-transform"
          title="User Profile"
        >
          <User className="w-5 h-5 text-[#b3b3b3]" />
        </div>
      </div>
    </header>
  );
};
