import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Heart, Sparkles, Plus, Compass, Music, Disc, History, Wand2, Trash2, CheckCircle2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { PlayerBar } from './components/PlayerBar';
import { TrackTable } from './components/TrackTable';
import { BottomNav } from './components/BottomNav';
import { LyricsModal } from './components/LyricsModal';
import { QueueDrawer } from './components/QueueDrawer';
import { SettingsModal } from './components/SettingsModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { Track, Playlist, RepeatMode, UserSettings } from './types';
import { INITIAL_TRACKS, INITIAL_PLAYLISTS, CATEGORIES } from './data/musicData';
import { youtubePlayer, searchYouTubeMusic } from './services/youtubeService';
import { generateSuggestedMixes, createSmartPlaylistFromHistory, getTopArtists, fetchSimilarVibeTracks } from './services/recommendationService';

export const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'liked' | 'playlist' | 'history'>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Music & Playlists Data
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('spotify_playlists');
    return saved ? JSON.parse(saved) : INITIAL_PLAYLISTS;
  });

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('spotify_liked_tracks');
    return saved ? JSON.parse(saved) : [INITIAL_TRACKS[0].id, INITIAL_TRACKS[2].id];
  });

  // Watch / Listening History Data
  const [history, setHistory] = useState<Track[]>(() => {
    const saved = localStorage.getItem('spotify_watch_history');
    return saved ? JSON.parse(saved) : [INITIAL_TRACKS[0], INITIAL_TRACKS[1], INITIAL_TRACKS[2]];
  });

  // Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('spotify_user_settings');
    return saved ? JSON.parse(saved) : {
      youtubeApiKey: '',
      audioQuality: 'auto',
      normalizeVolume: true,
    };
  });

  // Player State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(INITIAL_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INITIAL_TRACKS[0].duration);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>([]);

  // Mutable refs to prevent stale closure in YouTube event callbacks
  const currentTrackRef = useRef<Track | null>(currentTrack);
  currentTrackRef.current = currentTrack;

  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  const settingsRef = useRef<UserSettings>(settings);
  settingsRef.current = settings;

  const contextTracksRef = useRef<Track[]>(INITIAL_TRACKS);
  const playedTrackIdsRef = useRef<Set<string>>(new Set([INITIAL_TRACKS[0].id, INITIAL_TRACKS[0].youtubeVideoId]));
  const handleNextTrackRef = useRef<() => void>(() => {});

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>(INITIAL_TRACKS);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Panels
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingSmartPlaylist, setIsGeneratingSmartPlaylist] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Persistent storage hooks
  useEffect(() => {
    localStorage.setItem('spotify_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('spotify_liked_tracks', JSON.stringify(likedTrackIds));
  }, [likedTrackIds]);

  useEffect(() => {
    localStorage.setItem('spotify_watch_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('spotify_user_settings', JSON.stringify(settings));
  }, [settings]);

  // Setup YouTube audio sync
  useEffect(() => {
    youtubePlayer.setVolume(volume);

    youtubePlayer.onTimeUpdate((time, total) => {
      setCurrentTime(time);
      if (total > 0 && !isNaN(total)) {
        setDuration(total);
      }
    });

    youtubePlayer.onStateChange((state) => {
      // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
      if (state === 1) {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      } else if (state === 2) {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      } else if (state === 0) {
        // Song ended, automatically advance to next or play a song with a similar vibe
        handleNextTrackRef.current();
      }
    });
  }, [volume]);

  // Hook into native MediaSession API (Lock screen, Android Notification Player, Background Playback)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Spotify Ad-Free',
        artwork: [
          { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }

    const handlePlayAction = () => {
      youtubePlayer.resume();
      setIsPlaying(true);
      navigator.mediaSession.playbackState = 'playing';
    };

    const handlePauseAction = () => {
      youtubePlayer.pause();
      setIsPlaying(false);
      navigator.mediaSession.playbackState = 'paused';
    };

    const handleNextAction = () => {
      handleNextTrackRef.current();
    };

    const handlePrevAction = () => {
      handlePrevTrackRef.current();
    };

    const handleSeekToAction = (details: any) => {
      if (details.seekTime != null) {
        youtubePlayer.seekTo(details.seekTime);
        setCurrentTime(details.seekTime);
      }
    };

    try {
      navigator.mediaSession.setActionHandler('play', handlePlayAction);
      navigator.mediaSession.setActionHandler('pause', handlePauseAction);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevAction);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextAction);
      navigator.mediaSession.setActionHandler('seekto', handleSeekToAction);
    } catch {
      // Some browsers might not support all action handlers
    }
  }, [currentTrack]);

  // Handle Search queries with race condition protection
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(INITIAL_TRACKS);
      setIsSearching(false);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchYouTubeMusic(searchQuery, settings.youtubeApiKey);
        if (isCurrent) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery, settings.youtubeApiKey]);

  // Player controls
  const handleSelectTrack = (track: Track, contextTracks?: Track[]) => {
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setCurrentTime(0);
    setDuration(track.duration);
    setIsPlaying(true);
    youtubePlayer.playVideo(track.youtubeVideoId);

    // Keep track of played song IDs so similar vibe engine doesn't repeat songs
    playedTrackIdsRef.current.add(track.id);
    if (track.youtubeVideoId) {
      playedTrackIdsRef.current.add(track.youtubeVideoId);
    }

    if (contextTracks && contextTracks.length > 0) {
      contextTracksRef.current = contextTracks;
    }

    // Record into watch/listening history (keep last 50, move current to top)
    setHistory((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 50);
    });
  };

  const handleGeneratePlaylistFromHistory = async () => {
    if (history.length === 0) {
      showToast('Listen to some tracks first to build your history!');
      return;
    }

    setIsGeneratingSmartPlaylist(true);
    showToast('Analyzing your history and generating smart playlist...');
    try {
      const newPlaylist = await createSmartPlaylistFromHistory(history, settings.youtubeApiKey);
      setPlaylists((prev) => [newPlaylist, ...prev]);
      setActivePlaylistId(newPlaylist.id);
      setCurrentView('playlist');
      showToast(`Created "${newPlaylist.name}" from your history!`);
    } catch (e) {
      console.error('Failed to create smart playlist:', e);
      showToast('Could not generate playlist from history');
    } finally {
      setIsGeneratingSmartPlaylist(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    showToast('Listening history cleared');
  };

  const suggestedMixes = useMemo(() => {
    return generateSuggestedMixes(history, INITIAL_TRACKS);
  }, [history]);

  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (INITIAL_TRACKS.length > 0) {
        handleSelectTrack(INITIAL_TRACKS[0]);
      }
      return;
    }

    if (isPlaying) {
      youtubePlayer.pause();
      setIsPlaying(false);
    } else {
      youtubePlayer.resume();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = async () => {
    const current = currentTrackRef.current;
    const repeat = repeatModeRef.current;
    const isShuff = isShuffleRef.current;
    const currentQueue = queueRef.current;
    const contextList = contextTracksRef.current;

    // 1. Repeat current song if repeatMode is 'one'
    if (repeat === 'one' && current) {
      youtubePlayer.seekTo(0);
      youtubePlayer.resume();
      setIsPlaying(true);
      return;
    }

    // 2. Play next queued track if user or autoplay enqueued songs
    if (currentQueue.length > 0) {
      const [nextQueued, ...remainingQueue] = currentQueue;
      setQueue(remainingQueue);
      handleSelectTrack(nextQueued);
      return;
    }

    // 3. Play next track from the active context (playlist, album, search, or table)
    if (current && contextList && contextList.length > 0) {
      const currentIndex = contextList.findIndex(
        (t) => t.id === current.id || t.youtubeVideoId === current.youtubeVideoId
      );

      if (isShuff) {
        const remaining = contextList.filter(
          (t) => t.id !== current.id && !playedTrackIdsRef.current.has(t.id)
        );
        const candidates = remaining.length > 0 ? remaining : contextList.filter((t) => t.id !== current.id);
        if (candidates.length > 0) {
          const randomTrack = candidates[Math.floor(Math.random() * candidates.length)];
          handleSelectTrack(randomTrack, contextList);
          return;
        }
      } else if (currentIndex !== -1 && currentIndex + 1 < contextList.length) {
        // Next song in playlist
        const nextInList = contextList[currentIndex + 1];
        handleSelectTrack(nextInList, contextList);
        return;
      } else if (repeat === 'all' && contextList.length > 0) {
        // Loop back to start of playlist
        handleSelectTrack(contextList[0], contextList);
        return;
      }
    }

    // 4. End of playlist, or single track completed -> AUTOPLAY SIMILAR VIBE TRACK
    if (current) {
      showToast(`Discovering music with a similar vibe to ${current.title}...`);

      try {
        const similarTracks = await fetchSimilarVibeTracks(
          current,
          playedTrackIdsRef.current,
          settingsRef.current.youtubeApiKey
        );

        if (similarTracks && similarTracks.length > 0) {
          const [nextVibeTrack, ...upcomingVibeTracks] = similarTracks;

          // Mark as played to prevent infinite looping
          playedTrackIdsRef.current.add(nextVibeTrack.id);
          if (nextVibeTrack.youtubeVideoId) {
            playedTrackIdsRef.current.add(nextVibeTrack.youtubeVideoId);
          }

          // Pre-populate upcoming similar tracks into queue
          if (upcomingVibeTracks.length > 0) {
            setQueue(upcomingVibeTracks.slice(0, 4));
          }

          showToast(`Autoplaying similar vibe: ${nextVibeTrack.title} • ${nextVibeTrack.artist}`);
          handleSelectTrack(nextVibeTrack, similarTracks);
          return;
        }
      } catch (err) {
        console.warn('Could not load similar vibe tracks:', err);
      }

      // Fallback: Pick an unplayed track from the catalog that is not the current song
      const unplayed = INITIAL_TRACKS.filter(
        (t) => !playedTrackIdsRef.current.has(t.id) && t.id !== current.id
      );

      if (unplayed.length > 0) {
        const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
        playedTrackIdsRef.current.add(pick.id);
        showToast(`Playing next: ${pick.title} • ${pick.artist}`);
        handleSelectTrack(pick);
        return;
      }

      // Reset played cache if all played, and pick another track
      playedTrackIdsRef.current = new Set([current.id]);
      const otherTracks = INITIAL_TRACKS.filter((t) => t.id !== current.id);
      if (otherTracks.length > 0) {
        const fallback = otherTracks[Math.floor(Math.random() * otherTracks.length)];
        handleSelectTrack(fallback);
      }
    }
  };

  // Always keep handleNextTrackRef updated
  handleNextTrackRef.current = handleNextTrack;

  const handlePrevTrack = () => {
    if (currentTime > 3 && currentTrack) {
      youtubePlayer.seekTo(0);
      setCurrentTime(0);
      return;
    }

    const contextList = contextTracksRef.current || INITIAL_TRACKS;
    if (currentTrack && contextList.length > 0) {
      const currentIndex = contextList.findIndex(
        (t) => t.id === currentTrack.id || t.youtubeVideoId === currentTrack.youtubeVideoId
      );
      const prevIndex = currentIndex <= 0 ? contextList.length - 1 : currentIndex - 1;
      handleSelectTrack(contextList[prevIndex], contextList);
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    youtubePlayer.seekTo(seconds);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
    youtubePlayer.setVolume(newVolume);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      youtubePlayer.unMute();
      youtubePlayer.setVolume(volume);
    } else {
      setIsMuted(true);
      youtubePlayer.mute();
    }
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleToggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleToggleLike = (track: Track) => {
    setLikedTrackIds((prev) =>
      prev.includes(track.id) ? prev.filter((id) => id !== track.id) : [...prev, track.id]
    );
  };

  const handleCreatePlaylist = (name: string, description: string) => {
    const newPlaylist: Playlist = {
      id: `custom-pl-${Date.now()}`,
      name,
      description: description || 'Created by you',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      tracks: [INITIAL_TRACKS[0], INITIAL_TRACKS[1]],
      owner: 'User',
      isCustom: true,
      likesCount: 1,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
    setCurrentView('playlist');
  };

  // Greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Active playlist data
  const currentPlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0];
  const likedTracks = INITIAL_TRACKS.filter((t) => likedTrackIds.includes(t.id));

  return (
    <div id="spotify-app-root" className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      {/* Top Main Section (Sidebar + Content + Optional Queue Drawer) */}
      <div id="main-layout-container" className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView === 'playlist' ? `playlist-${activePlaylistId}` : currentView}
          onNavigate={(view, playlistId) => {
            if (view === 'playlist' && playlistId) {
              setActivePlaylistId(playlistId);
              setCurrentView('playlist');
            } else {
              setCurrentView(view as any);
            }
          }}
          playlists={playlists}
          likedCount={likedTrackIds.length}
          historyCount={history.length}
          openCreatePlaylistModal={() => setIsCreatePlaylistOpen(true)}
        />

        {/* Center Main Scrollable Panel */}
        <main
          id="spotify-main-content"
          className="flex-1 bg-[#121212] md:rounded-lg m-0 md:my-2 md:mr-2 flex flex-col min-w-0 overflow-y-auto relative pb-32 md:pb-8"
        >
          {/* Top Bar */}
          <TopNav
            currentView={currentView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* VIEW: HOME */}
          {currentView === 'home' && (
            <div id="view-home" className="p-3.5 sm:p-6 flex flex-col gap-6 sm:gap-8">
              {/* Header Greeting */}
              <div>
                <h1 id="home-greeting" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3 sm:mb-4">
                  {greeting}
                </h1>

                {/* 6 Quick Access Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <div
                    id="quick-card-liked"
                    onClick={() => setCurrentView('liked')}
                    className="group bg-white/5 hover:bg-white/20 transition-all rounded flex items-center gap-2.5 sm:gap-4 overflow-hidden cursor-pointer shadow relative"
                  >
                    <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 sm:w-8 sm:h-8 text-white fill-white" />
                    </div>
                    <span className="font-bold text-white text-xs sm:text-sm truncate flex-1 pr-1">Liked Songs</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (likedTracks.length > 0) handleSelectTrack(likedTracks[0], likedTracks);
                      }}
                      className="hidden sm:flex w-11 h-11 rounded-full bg-[#1db954] text-black items-center justify-center mr-4 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-xl"
                    >
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </button>
                  </div>

                  {playlists.slice(0, 5).map((pl) => (
                    <div
                      id={`quick-card-${pl.id}`}
                      key={pl.id}
                      onClick={() => {
                        setActivePlaylistId(pl.id);
                        setCurrentView('playlist');
                      }}
                      className="group bg-white/5 hover:bg-white/20 transition-all rounded flex items-center gap-2.5 sm:gap-4 overflow-hidden cursor-pointer shadow relative"
                    >
                      <img src={pl.coverUrl} alt={pl.name} className="w-12 h-12 sm:w-20 sm:h-20 object-cover flex-shrink-0" />
                      <span className="font-bold text-white text-xs sm:text-sm truncate flex-1 pr-1">{pl.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pl.tracks.length > 0) handleSelectTrack(pl.tracks[0], pl.tracks);
                        }}
                        className="hidden sm:flex w-11 h-11 rounded-full bg-[#1db954] text-black items-center justify-center mr-4 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-xl"
                      >
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Made For You (Suggested from Listening History) */}
              <section id="section-made-for-you">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#1db954]" />
                      <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                        Made For You
                      </h2>
                    </div>
                    <p className="text-xs text-[#a7a7a7] mt-0.5">
                      Personalized mixes generated from your listening history
                    </p>
                  </div>

                  <button
                    id="btn-magic-playlist-home"
                    onClick={handleGeneratePlaylistFromHistory}
                    disabled={history.length === 0 || isGeneratingSmartPlaylist}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#1db954] to-[#10b981] hover:from-[#1ed760] hover:to-[#059669] text-black px-4 py-2 rounded-full text-xs font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isGeneratingSmartPlaylist ? 'Creating...' : 'Create Playlist from History'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {/* Smart Generator Promo Card */}
                  <div
                    onClick={handleGeneratePlaylistFromHistory}
                    className="group bg-gradient-to-br from-[#4f46e5]/30 to-[#9333ea]/30 border border-white/10 hover:border-[#1db954]/50 p-4 rounded-lg flex flex-col justify-between transition-all cursor-pointer relative shadow-xl"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white shadow-lg mb-2 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-white text-base">Magic History Mix</span>
                      <p className="text-xs text-[#b3b3b3] leading-relaxed">
                        Curates a brand new custom playlist from your watch history and complementary YouTube Music tracks.
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#1db954] group-hover:underline">
                      <span>Click to Auto-Generate</span>
                      <span>→</span>
                    </div>
                  </div>

                  {/* Suggested Dynamic Mixes */}
                  {suggestedMixes.map((mix) => (
                    <div
                      id={`mix-card-${mix.id}`}
                      key={mix.id}
                      onClick={() => {
                        setActivePlaylistId(mix.id);
                        setCurrentView('playlist');
                      }}
                      className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-lg flex flex-col gap-3 transition-all cursor-pointer relative shadow"
                    >
                      <div className="relative aspect-square w-full rounded overflow-hidden shadow-lg">
                        <img src={mix.coverUrl} alt={mix.name} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mix.tracks.length > 0) handleSelectTrack(mix.tracks[0], mix.tracks);
                          }}
                          className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1db954] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all shadow-2xl"
                        >
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{mix.name}</span>
                        <span className="text-xs text-[#a7a7a7] line-clamp-2 mt-1">{mix.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Recently Played (Watch History) */}
              {history.length > 0 && (
                <section id="section-recently-played">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-[#38bdf8]" />
                      <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                        Recently Played
                      </h2>
                    </div>
                    <span
                      onClick={() => setCurrentView('history')}
                      className="text-xs font-bold text-[#b3b3b3] hover:underline cursor-pointer"
                    >
                      View all history ({history.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {history.slice(0, 5).map((track) => (
                      <div
                        id={`history-card-${track.id}`}
                        key={`recent-${track.id}`}
                        onClick={() => handleSelectTrack(track, history)}
                        className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-lg flex flex-col gap-3 transition-all cursor-pointer relative shadow"
                      >
                        <div className="relative aspect-square w-full rounded overflow-hidden shadow-lg">
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                          <button
                            className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1db954] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all shadow-2xl"
                          >
                            <Play className="w-5 h-5 fill-black ml-0.5" />
                          </button>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white text-sm truncate">{track.title}</span>
                          <span className="text-xs text-[#a7a7a7] truncate mt-1">{track.artist}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Section: Today's Top Hits */}
              <section id="section-top-hits">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                    Today's Top Hits
                  </h2>
                  <span
                    onClick={() => {
                      setActivePlaylistId('playlist-top-hits');
                      setCurrentView('playlist');
                    }}
                    className="text-xs font-bold text-[#b3b3b3] hover:underline cursor-pointer"
                  >
                    Show all
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {INITIAL_TRACKS.slice(0, 5).map((track) => (
                    <div
                      id={`track-card-${track.id}`}
                      key={track.id}
                      onClick={() => handleSelectTrack(track, INITIAL_TRACKS)}
                      className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-lg flex flex-col gap-3 transition-all cursor-pointer relative"
                    >
                      <div className="relative aspect-square w-full rounded overflow-hidden shadow-lg">
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        <button
                          className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1db954] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all shadow-2xl"
                        >
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{track.title}</span>
                        <span className="text-xs text-[#a7a7a7] truncate mt-1">{track.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Featured Playlists */}
              <section id="section-featured-playlists">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
                    Featured Playlists
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {playlists.map((pl) => (
                    <div
                      id={`featured-card-${pl.id}`}
                      key={pl.id}
                      onClick={() => {
                        setActivePlaylistId(pl.id);
                        setCurrentView('playlist');
                      }}
                      className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-lg flex flex-col gap-3 transition-all cursor-pointer relative"
                    >
                      <div className="relative aspect-square w-full rounded overflow-hidden shadow-lg">
                        <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pl.tracks.length > 0) handleSelectTrack(pl.tracks[0], pl.tracks);
                          }}
                          className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1db954] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all shadow-2xl"
                        >
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </button>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{pl.name}</span>
                        <span className="text-xs text-[#a7a7a7] line-clamp-2 mt-1">{pl.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* VIEW: SEARCH */}
          {currentView === 'search' && (
            <div id="view-search" className="p-6 flex flex-col gap-6">
              {searchQuery.trim() ? (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">
                    {isSearching ? 'Searching YouTube Music...' : `Results for "${searchQuery}"`}
                  </h2>
                  <TrackTable
                    tracks={searchResults}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedTrackIds={likedTrackIds}
                    onSelectTrack={(t) => handleSelectTrack(t, searchResults)}
                    onTogglePlay={handleTogglePlay}
                    onToggleLike={handleToggleLike}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Browse all</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {CATEGORIES.map((cat) => (
                      <div
                        id={`category-card-${cat.id}`}
                        key={cat.id}
                        onClick={() => {
                          setSearchQuery(cat.name);
                        }}
                        style={{ backgroundColor: cat.color }}
                        className="h-40 rounded-lg p-4 relative overflow-hidden cursor-pointer hover:scale-102 transition-transform shadow"
                      >
                        <h3 className="text-xl font-bold text-white leading-tight max-w-[80%]">
                          {cat.name}
                        </h3>
                        <img
                          src={cat.coverUrl}
                          alt={cat.name}
                          className="w-20 h-20 object-cover absolute -right-2 -bottom-2 rotate-[25deg] shadow-xl rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: PLAYLIST DETAIL */}
          {currentView === 'playlist' && (
            <div id="view-playlist" className="flex flex-col">
              {/* Header Hero Banner */}
              <div className="bg-gradient-to-b from-[#404040] to-[#121212] p-4 sm:p-6 pt-6 sm:pt-12 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
                <img
                  src={currentPlaylist.coverUrl}
                  alt={currentPlaylist.name}
                  className="w-36 h-36 sm:w-52 sm:h-52 object-cover rounded-lg shadow-2xl flex-shrink-0"
                />
                <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/80">Playlist</span>
                  <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white tracking-tight">
                    {currentPlaylist.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1 line-clamp-2">{currentPlaylist.description}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-white/80 mt-1 sm:mt-2">
                    <span className="font-bold text-white">{currentPlaylist.owner}</span>
                    <span>•</span>
                    <span>{currentPlaylist.tracks.length} songs</span>
                  </div>
                </div>
              </div>

              {/* Action Bar (Big Green Play Button) */}
              <div className="p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
                <button
                  id="btn-play-playlist-hero"
                  onClick={() => {
                    if (currentPlaylist.tracks.length > 0) {
                      handleSelectTrack(currentPlaylist.tracks[0], currentPlaylist.tracks);
                    }
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                  title="Play playlist"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black ml-0.5" />
                </button>
              </div>

              {/* Track Table */}
              <div className="px-2 sm:px-6 pb-12">
                <TrackTable
                  tracks={currentPlaylist.tracks}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  likedTrackIds={likedTrackIds}
                  onSelectTrack={(t) => handleSelectTrack(t, currentPlaylist.tracks)}
                  onTogglePlay={handleTogglePlay}
                  onToggleLike={handleToggleLike}
                />
              </div>
            </div>
          )}

          {/* VIEW: LIKED SONGS */}
          {currentView === 'liked' && (
            <div id="view-liked" className="flex flex-col">
              <div className="bg-gradient-to-b from-[#450af5] to-[#121212] p-4 sm:p-6 pt-6 sm:pt-12 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
                <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-lg bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center flex-shrink-0 shadow-2xl">
                  <Heart className="w-16 h-16 sm:w-24 sm:h-24 text-white fill-white" />
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/80">Playlist</span>
                  <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight">Liked Songs</h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-white/80 mt-1 sm:mt-2">
                    <span className="font-bold text-white">Your Library</span>
                    <span>•</span>
                    <span>{likedTracks.length} songs</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
                <button
                  onClick={() => {
                    if (likedTracks.length > 0) handleSelectTrack(likedTracks[0], likedTracks);
                  }}
                  disabled={likedTracks.length === 0}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] disabled:opacity-40 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black ml-0.5" />
                </button>
              </div>

              <div className="px-2 sm:px-6 pb-12">
                {likedTracks.length === 0 ? (
                  <div className="text-center py-16 text-[#b3b3b3]">
                    <Heart className="w-12 h-12 mx-auto mb-3 text-[#4d4d4d]" />
                    <h3 className="text-lg font-bold text-white mb-1">Songs you like will appear here</h3>
                    <p className="text-sm">Save songs by tapping the heart icon on any track.</p>
                  </div>
                ) : (
                  <TrackTable
                    tracks={likedTracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedTrackIds={likedTrackIds}
                    onSelectTrack={(t) => handleSelectTrack(t, likedTracks)}
                    onTogglePlay={handleTogglePlay}
                    onToggleLike={handleToggleLike}
                  />
                )}
              </div>
            </div>
          )}

          {/* VIEW: LIBRARY */}
          {currentView === 'library' && (
            <div id="view-library" className="p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Your Library</h1>
                <button
                  onClick={() => setIsCreatePlaylistOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold bg-white text-black px-4 py-2 rounded-full hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Playlist</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {/* Liked Songs Tile */}
                <div
                  onClick={() => setCurrentView('liked')}
                  className="bg-gradient-to-br from-[#450af5] to-[#8e8ee5] p-5 rounded-lg flex flex-col justify-end h-56 cursor-pointer hover:scale-102 transition-transform shadow"
                >
                  <Heart className="w-10 h-10 text-white fill-white mb-4" />
                  <span className="font-extrabold text-white text-xl">Liked Songs</span>
                  <span className="text-xs text-white/80 mt-1">{likedTracks.length} liked songs</span>
                </div>

                {/* Listening History Tile */}
                <div
                  onClick={() => setCurrentView('history')}
                  className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/5 p-5 rounded-lg flex flex-col justify-end h-56 cursor-pointer hover:scale-102 transition-transform shadow"
                >
                  <History className="w-10 h-10 text-[#38bdf8] mb-4" />
                  <span className="font-extrabold text-white text-xl">Listening History</span>
                  <span className="text-xs text-white/80 mt-1">{history.length} songs streamed</span>
                </div>

                {/* Auto Smart Mix Generator Tile */}
                <div
                  onClick={handleGeneratePlaylistFromHistory}
                  className="bg-gradient-to-br from-[#4f46e5] to-[#9333ea] p-5 rounded-lg flex flex-col justify-end h-56 cursor-pointer hover:scale-102 transition-transform shadow relative group"
                >
                  <Sparkles className="w-10 h-10 text-white mb-4 group-hover:rotate-12 transition-transform" />
                  <span className="font-extrabold text-white text-xl">Create Mix From History</span>
                  <span className="text-xs text-white/80 mt-1">Smart AI & YouTube curation</span>
                </div>

                {/* Playlist Tiles */}
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      setCurrentView('playlist');
                    }}
                    className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-lg flex flex-col gap-3 transition-all cursor-pointer"
                  >
                    <img src={pl.coverUrl} alt={pl.name} className="w-full aspect-square object-cover rounded shadow" />
                    <span className="font-bold text-white text-sm truncate">{pl.name}</span>
                    <span className="text-xs text-[#a7a7a7] truncate">By {pl.owner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: LISTENING HISTORY */}
          {currentView === 'history' && (
            <div id="view-history" className="flex flex-col">
              {/* Header Hero Banner */}
              <div className="bg-gradient-to-b from-[#1e293b] to-[#121212] p-4 sm:p-6 pt-6 sm:pt-12 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
                <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-lg bg-[#0f172a] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-2xl">
                  <History className="w-16 h-16 sm:w-24 sm:h-24 text-[#38bdf8]" />
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/80">Listening Activity</span>
                  <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white tracking-tight">Listening History</h1>
                  <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1">
                    Songs you've streamed ad-free. Used to suggest daily mixes and generate custom playlists based on your taste.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-white/80 mt-1 sm:mt-2">
                    <span>{history.length} {history.length === 1 ? 'song streamed' : 'songs streamed'}</span>
                    <span>•</span>
                    <span className="text-[#1db954] font-semibold">100% Ad-Free YouTube Music</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 sm:p-6 flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => {
                      if (history.length > 0) handleSelectTrack(history[0]);
                    }}
                    disabled={history.length === 0}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] disabled:opacity-40 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                    title="Play from start of history"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black ml-0.5" />
                  </button>

                  <button
                    id="btn-create-playlist-from-history"
                    onClick={handleGeneratePlaylistFromHistory}
                    disabled={history.length === 0 || isGeneratingSmartPlaylist}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea] text-white font-bold text-xs sm:text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingSmartPlaylist ? 'Creating...' : 'Create Playlist from History'}</span>
                  </button>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 text-xs font-semibold text-[#a7a7a7] hover:text-white px-3 py-1.5 rounded border border-white/10 hover:border-white/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Track Table */}
              <div className="px-2 sm:px-6 pb-12">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-[#b3b3b3]">
                    <History className="w-12 h-12 mx-auto mb-3 text-[#4d4d4d]" />
                    <h3 className="text-lg font-bold text-white mb-1">No listening history yet</h3>
                    <p className="text-sm">Start listening to songs and we'll automatically generate personalized playlists and daily mixes!</p>
                  </div>
                ) : (
                  <TrackTable
                    tracks={history}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedTrackIds={likedTrackIds}
                    onSelectTrack={(t) => handleSelectTrack(t, history)}
                    onTogglePlay={handleTogglePlay}
                    onToggleLike={handleToggleLike}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Play Queue Drawer */}
        <QueueDrawer
          currentTrack={currentTrack}
          queue={queue}
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
          onPlayTrack={handleSelectTrack}
          onRemoveFromQueue={(idx) => setQueue((prev) => prev.filter((_, i) => i !== idx))}
          onClearQueue={() => setQueue([])}
        />
      </div>

      {/* Bottom Sticky Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={Boolean(currentTrack && likedTrackIds.includes(currentTrack.id))}
        isLyricsOpen={isLyricsOpen}
        isQueueOpen={isQueueOpen}
        isFullscreen={isFullscreen}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      {/* Mobile Bottom Navigation Bar (Spotify Native style) */}
      <BottomNav
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'playlist') {
            setCurrentView('playlist');
          } else {
            setCurrentView(view as any);
          }
        }}
        likedCount={likedTrackIds.length}
      />

      {/* Synchronized Karaoke Lyrics Overlay */}
      <LyricsModal
        currentTrack={currentTrack}
        currentTime={currentTime}
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        onSeek={handleSeek}
      />

      {/* Settings Modal (YouTube API Key & Audio Quality) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          id="spotify-toast-notification"
          className="fixed bottom-24 right-6 z-50 bg-[#282828] text-white border border-[#1db954] shadow-2xl px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in text-sm font-medium"
        >
          <CheckCircle2 className="w-5 h-5 text-[#1db954] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
