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

function cleanTitle(rawTitle: string): string {
  if (!rawTitle) return 'Unknown Title';
  return rawTitle
    .replace(/(\(|\[)(Official|Music Video|Audio|Lyric Video|Video|HD|HQ|Visualizer|Lyrics)(\)|\])/gi, '')
    .replace(/(&quot;|&#39;|&amp;)/g, (m) => (m === '&quot;' ? '"' : m === '&#39;' ? "'" : '&'))
    .trim();
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
          return data.items.map((item: any) => ({
            id: `yt-${item.id.videoId}`,
            title: cleanTitle(item.snippet.title),
            artist: item.snippet.channelTitle,
            album: 'YouTube Music',
            duration: 210,
            coverUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            youtubeVideoId: item.id.videoId,
            addedAt: 'Just now',
          }));
        }
      }
    } catch (e) {
      console.warn('YouTube API Key search failed:', e);
    }
  }

  // Fast direct YouTube Music search (No API key needed)
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`;
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
          const artist = v.ownerText?.runs?.[0]?.text || 'Various Artists';
          const durationStr = v.lengthText?.simpleText || '3:30';
          const thumbnail =
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          tracks.push({
            id: `yt-${v.videoId}`,
            title: cleanTitle(rawTitle),
            artist: artist,
            album: 'YouTube Music Single',
            duration: parseDurationText(durationStr),
            coverUrl: thumbnail,
            youtubeVideoId: v.videoId,
            addedAt: 'Just now',
          });

          if (tracks.length >= 15) break;
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
