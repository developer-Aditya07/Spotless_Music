import React from 'react';
import { Home, Search, Library, History } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: 'home' | 'search' | 'library' | 'history') => void;
  likedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
}) => {
  const isHome = currentView === 'home';
  const isSearch = currentView === 'search';
  const isLibrary = currentView === 'library' || currentView === 'liked' || currentView.startsWith('playlist');
  const isHistory = currentView === 'history';

  return (
    <nav
      id="spotify-mobile-bottom-nav"
      className="md:hidden flex items-center justify-around bg-[#121212]/95 backdrop-blur-lg border-t border-[#282828] pt-2 pb-8 px-3 z-40 select-none"
    >
      <button
        id="btn-mobile-nav-home"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center gap-1 transition-colors py-1 flex-1 ${
          isHome ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
        }`}
      >
        <Home className={`w-5 h-5 ${isHome ? 'text-white stroke-[2.5]' : ''}`} />
        <span className={`text-[11px] font-medium ${isHome ? 'text-white font-bold' : ''}`}>Home</span>
      </button>

      <button
        id="btn-mobile-nav-search"
        onClick={() => onNavigate('search')}
        className={`flex flex-col items-center gap-1 transition-colors py-1 flex-1 ${
          isSearch ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
        }`}
      >
        <Search className={`w-5 h-5 ${isSearch ? 'text-white stroke-[2.5]' : ''}`} />
        <span className={`text-[11px] font-medium ${isSearch ? 'text-white font-bold' : ''}`}>Search</span>
      </button>

      <button
        id="btn-mobile-nav-library"
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center gap-1 transition-colors py-1 flex-1 ${
          isLibrary ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
        }`}
      >
        <Library className={`w-5 h-5 ${isLibrary ? 'text-white stroke-[2.5]' : ''}`} />
        <span className={`text-[11px] font-medium ${isLibrary ? 'text-white font-bold' : ''}`}>Your Library</span>
      </button>

      <button
        id="btn-mobile-nav-history"
        onClick={() => onNavigate('history')}
        className={`flex flex-col items-center gap-1 transition-colors py-1 flex-1 ${
          isHistory ? 'text-white' : 'text-[#a7a7a7] hover:text-white'
        }`}
      >
        <History className={`w-5 h-5 ${isHistory ? 'text-white stroke-[2.5]' : ''}`} />
        <span className={`text-[11px] font-medium ${isHistory ? 'text-white font-bold' : ''}`}>History</span>
      </button>
    </nav>
  );
};