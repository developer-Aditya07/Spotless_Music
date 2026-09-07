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

  constructor() {
    this.loadIframeAPI();
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
    // Create an invisible div for the player if not present
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.position = 'fixed';
      container.style.bottom = '-9999px';
      container.style.right = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    try {
      this.player = new window.YT.Player('yt-player-container', {
        height: '100',
        width: '100',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
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
