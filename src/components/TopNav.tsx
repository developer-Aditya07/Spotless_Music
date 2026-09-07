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
      className="h-14 sm:h-16 px-3 sm:px-6 bg-[#101010]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 select-none"
    >
      {/* Navigation history controls & Mobile Logo */}
      <div id="nav-history-buttons" className="flex items-center gap-2">
        {/* Mobile brand mark */}
        <div className="md:hidden flex items-center gap-1.5 font-black text-sm text-white mr-1">
          <div className="w-6 h-6 rounded-full bg-[#1db954] flex items-center justify-center text-black">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.217.355-.678.47-1.033.253-2.827-1.727-6.385-2.117-10.575-1.16-.407.094-.813-.16-.906-.566-.094-.408.16-.813.567-.906 4.587-1.047 8.528-.604 11.694 1.346.354.217.47.678.253 1.033zm1.47-3.266c-.273.444-.855.586-1.299.313-3.235-1.988-8.167-2.564-11.994-1.401-.5.152-1.033-.13-1.185-.63-.153-.5.13-1.033.63-1.185 4.382-1.33 9.814-.688 13.535 1.604.444.273.586.855.313 1.299zm.126-3.41c-3.88-2.304-10.278-2.516-13.987-1.39-.594.18-1.228-.155-1.408-.748-.18-.594.155-1.228.748-1.408 4.258-1.293 11.317-1.043 15.787 1.61.534.317.708 1.01.39 1.545-.317.534-1.01.708-1.545.39z" />
            </svg>
          </div>
          <span className="hidden xs:inline tracking-tight font-extrabold text-sm">Spotify</span>
        </div>

        <button
          id="btn-history-back"
          className="hidden sm:flex w-8 h-8 rounded-full bg-black/70 items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-black transition-colors"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          id="btn-history-forward"
          className="hidden sm:flex w-8 h-8 rounded-full bg-black/70 items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-black transition-colors"
          title="Go forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dynamic Search Bar */}
      <div id="top-nav-center" className="flex-1 max-w-md mx-1 sm:mx-0">
        {currentView === 'search' ? (
          <div id="search-input-wrapper" className="relative flex items-center">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 text-[#757575] pointer-events-none" />
            <input
              id="main-search-input"
              type="text"
              placeholder="Search songs, artists, or paste YouTube link"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="w-full bg-[#242424] text-white placeholder-[#757575] text-xs sm:text-sm rounded-full py-2 sm:py-2.5 pl-8 sm:pl-10 pr-3 sm:pr-4 outline-none border border-transparent focus:border-white transition-all shadow-inner"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full bg-[#242424] text-[#a7a7a7] flex items-center gap-1.5 font-medium border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1db954] flex-shrink-0" />
              <span className="hidden sm:inline">Zero Advertisements Mode Active</span>
              <span className="sm:hidden font-semibold text-white">Ad-Free</span>
            </span>
          </div>
        )}
      </div>

      {/* Right Action Items */}
      <div id="top-nav-actions" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#242424] hover:bg-[#2a2a2a] px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/10 hover:border-white/25 transition-all shadow-sm"
          title="Configure Settings"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1db954]" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <div
          id="user-profile-button"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#282828] border border-white/10 flex items-center justify-center text-white hover:scale-105 cursor-pointer transition-transform"
          title="User Profile"
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#b3b3b3]" />
        </div>
      </div>
    </header>
  );
};
