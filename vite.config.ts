import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function parseDurationText(durationStr: string): number {
  if (!durationStr) return 210;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function cleanTitleAndArtist(rawTitle: string, channelArtist?: string) {
  if (!rawTitle) return { title: 'Unknown Title', artist: channelArtist || 'Unknown Artist' };
  
  let text = rawTitle.replace(/(&quot;|&#39;|&amp;)/g, (m) => (m === '&quot;' ? '"' : m === '&#39;' ? "'" : '&')).trim();
  let artist = (channelArtist || 'Unknown Artist').replace(/\s*-\s*Topic$/i, '').trim();
  let title = text;

  // Many YouTube music videos are titled "Artist - Song Name" or "Artist: Song Name"
  const splitMatch = text.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
  if (splitMatch && splitMatch[1].trim().length > 0 && splitMatch[2].trim().length > 0) {
    const candidateArtist = splitMatch[1].trim();
    const candidateTitle = splitMatch[2].trim();
    if (candidateArtist.length <= 40 && !candidateArtist.toLowerCase().includes('playlist')) {
      artist = candidateArtist;
      title = candidateTitle;
    }
  }

  // Strip YouTube parenthetical/bracket tags: (Official Music Video), [Audio], (Lyrics), etc.
  title = title
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered)?).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, artist };
}

async function handleYouTubeSearch(query: string, apiKey?: string) {
  // Check if query is direct YouTube link
  const ytMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
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

  // If user provided YouTube Data API Key
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=video&videoCategoryId=10&q=${encodeURIComponent(
        query
      )}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((item: any) => {
            const parsed = cleanTitleAndArtist(item.snippet.title, item.snippet.channelTitle);
            return {
              id: `yt-${item.id.videoId}`,
              title: parsed.title,
              artist: parsed.artist,
              album: 'YouTube Music',
              duration: 210,
              coverUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
              youtubeVideoId: item.id.videoId,
              addedAt: 'Just now',
            };
          });
        }
      }
    } catch (e) {
      console.warn('YouTube API Key search failed:', e);
    }
  }

  // Fast direct YouTube Music search (No API key needed)
  try {
    const isExplicitSearch = /song|music|audio|track|lyrics/i.test(query);
    const searchQuery = isExplicitSearch ? query : `${query} song`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData = ({.*?});/s);

    if (match) {
      const data = JSON.parse(match[1]);
      const contents =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
          ?.contents?.[0]?.itemSectionRenderer?.contents || [];

      const tracks: any[] = [];
      for (const item of contents) {
        const v = item.videoRenderer;
        if (v && v.videoId) {
          const rawTitle = v.title?.runs?.[0]?.text || '';
          const channelArtist = v.ownerText?.runs?.[0]?.text || 'Various Artists';
          const durationStr = v.lengthText?.simpleText || '3:30';
          const durationSec = parseDurationText(durationStr);

          // Filter out short sound effects or clip tests under 45s unless explicitly requested
          if (durationSec < 45 && !query.toLowerCase().includes('effect') && !query.toLowerCase().includes('sound')) {
            continue;
          }

          // Filter out long mixes or full concert uploads if looking for tracks
          if (durationSec > 1200 && !query.toLowerCase().includes('album') && !query.toLowerCase().includes('mix') && !query.toLowerCase().includes('playlist')) {
            continue;
          }

          const parsed = cleanTitleAndArtist(rawTitle, channelArtist);

          const thumbnail =
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          tracks.push({
            id: `yt-${v.videoId}`,
            title: parsed.title,
            artist: parsed.artist,
            album: 'YouTube Music Single',
            duration: durationSec,
            coverUrl: thumbnail,
            youtubeVideoId: v.videoId,
            addedAt: 'Just now',
          });

          if (tracks.length >= 20) break;
        }
      }

      if (tracks.length > 0) {
        return tracks;
      }
    }
  } catch (err) {
    console.error('Direct YouTube search error:', err);
  }

  return [];
}

function searchApiPlugin() {
  return {
    name: 'search-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/search')) {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          const query = parsedUrl.searchParams.get('q') || '';
          const apiKey = parsedUrl.searchParams.get('apiKey') || '';

          if (!query.trim()) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tracks: [] }));
            return;
          }

          try {
            const tracks = await handleYouTubeSearch(query.trim(), apiKey);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tracks }));
          } catch (err) {
            console.error('Search error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tracks: [] }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), searchApiPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
