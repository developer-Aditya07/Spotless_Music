import { Track } from '../types';
import { INITIAL_TRACKS } from '../data/musicData';

// Declaring global YT type
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

class YouTubePlayerBridge {
  private player: any = null;
  private isReady = false;
  private queuedVideoId: string | null = null;
  private onStateChangeCallback: ((state: number) => void) | null = null;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private timeInterval: any = null;

  private silentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudioKeepAlive();
    this.loadIframeAPI();
    this.setupVisibilityHandling();
  }

  // A silent audio loop informs Android OS and mobile browsers that audio is active,
  // preventing WebView background lifecycle suspension.
  private initAudioKeepAlive() {
    if (typeof window === 'undefined') return;
    try {
      // 1-second silent WAV data URI
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.silentAudio = new Audio(silentWav);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.001; // nearly silent but non-zero so media subsystem marks it active
    } catch {
      // ignore
    }
  }

  private startKeepAlive() {
    if (this.silentAudio) {
      this.silentAudio.play().catch(() => {});
    }
  }

  private stopKeepAlive() {
    if (this.silentAudio) {
      this.silentAudio.pause();
    }
  }

  private setupVisibilityHandling() {
    if (typeof document === 'undefined') return;

    // 1. Prevent scripts (including YouTube iframe) from detecting when the app is backgrounded
    try {
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true,
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true,
      });
    } catch {
      // ignore
    }

    // 2. Intercept and stop visibilitychange event propagation to iframe
    window.addEventListener(
      'visibilitychange',
      (e) => {
        // If player was playing, force resume immediately
        if (this.player && typeof this.player.playVideo === 'function') {
          setTimeout(() => {
            try {
              this.player.playVideo();
            } catch {
              // ignore
            }
          }, 50);
        }
      },
      true
    );

    // 3. Intercept window blur (when switching apps or locking screen)
    window.addEventListener(
      'blur',
      () => {
        if (this.player && typeof this.player.playVideo === 'function') {
          setTimeout(() => {
            try {
              this.player.playVideo();
            } catch {
              // ignore
            }
          }, 100);
        }
      },
      true
    );
  }

  private loadIframeAPI() {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      this.initPlayer();
      return;
    }

    // Check if tag already injected
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      this.initPlayer();
    };
  }

  private initPlayer() {
    // Create an invisible div for the player if not present.
    // NOTE: In Android WebView & iOS WebKit, elements with 1px / 0.01 opacity / offscreen coordinates
    // are classified as non-visible and Android Chromium aggressively pauses their media when backgrounded.
    // Keeping it 200x200 inside viewport with pointer-events:none and z-index:-1 prevents visibility throttling.
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.position = 'fixed';
      container.style.top = '0px';
      container.style.left = '0px';
      container.style.width = '200px';
      container.style.height = '200px';
      container.style.opacity = '0.001';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
    }

    try {
      this.player = new window.YT.Player('yt-player-container', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            this.isReady = true;
            if (this.queuedVideoId) {
              this.playVideo(this.queuedVideoId);
              this.queuedVideoId = null;
            }
            this.startTimeUpdates();
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              this.startKeepAlive();
            } else if (event.data === 2 || event.data === 0) {
              this.stopKeepAlive();
            }
            if (this.onStateChangeCallback) {
              this.onStateChangeCallback(event.data);
            }
          },
        },
      });
    } catch (e) {
      console.warn('Error initializing YouTube Player:', e);
    }
  }

  private startTimeUpdates() {
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.timeInterval = setInterval(() => {
      if (this.player && this.isReady && typeof this.player.getCurrentTime === 'function') {
        try {
          const current = this.player.getCurrentTime() || 0;
          const total = this.player.getDuration() || 0;
          if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(current, total);
          }
        } catch {
          // ignore
        }
      }
    }, 500);
  }

  public playVideo(videoId: string) {
    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== 'function') {
      this.queuedVideoId = videoId;
      return;
    }
    this.player.loadVideoById({
      videoId: videoId,
      suggestedQuality: 'small',
    });
    this.player.playVideo();
  }

  public pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  public resume() {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  public seekTo(seconds: number) {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
    }
  }

  public setVolume(volume0to100: number) {
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(volume0to100);
    }
  }

  public mute() {
    if (this.player && typeof this.player.mute === 'function') {
      this.player.mute();
    }
  }

  public unMute() {
    if (this.player && typeof this.player.unMute === 'function') {
      this.player.unMute();
    }
  }

  public onStateChange(callback: (state: number) => void) {
    this.onStateChangeCallback = callback;
  }

  public onTimeUpdate(callback: (time: number, duration: number) => void) {
    this.onTimeUpdateCallback = callback;
  }
}

export const youtubePlayer = new YouTubePlayerBridge();

// YouTube Data API and Web Search helper
export async function searchYouTubeMusic(query: string, apiKey?: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check if query is direct YouTube link
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return [
      {
        id: `yt-${videoId}`,
        title: 'YouTube Stream',
        artist: 'Ad-Free Playback',
        album: 'YouTube Music Single',
        duration: 210,
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        youtubeVideoId: videoId,
        addedAt: 'Just now',
      },
    ];
  }

  // 1. Call backend search proxy (/api/search) which has full access to YouTube Music search
  try {
    const params = new URLSearchParams({ q: trimmed });
    if (apiKey) params.append('apiKey', apiKey);
    const res = await fetch(`/api/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data.tracks;
      }
    }
  } catch (err) {
    console.warn('Backend /api/search failed, trying direct fallback:', err);
  }

  // 2. Direct client-side YouTube Data API v3 (if user provided API key)
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&type=video&videoCategoryId=10&q=${encodeURIComponent(
        trimmed
      )}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((item: any) => ({
            id: `yt-${item.id.videoId}`,
            title: item.snippet.title.replace(/(&quot;|&#39;|&amp;)/g, (match: string) => {
              if (match === '&quot;') return '"';
              if (match === '&#39;') return "'";
              if (match === '&amp;') return '&';
              return match;
            }),
            artist: item.snippet.channelTitle,
            album: 'YouTube Music Single',
            duration: 210,
            coverUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            youtubeVideoId: item.id.videoId,
            addedAt: 'Just now',
          }));
        }
      }
    } catch (e) {
      console.warn('Direct YouTube Data API search error:', e);
    }
  }

  // 3. Match against local catalog
  const lower = trimmed.toLowerCase();
  const catalogMatches = INITIAL_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.artist.toLowerCase().includes(lower) ||
      t.album.toLowerCase().includes(lower)
  );

  return catalogMatches;
}
