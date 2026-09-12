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

function extractArtistAlbumDuration(runs: any[]) {
  let artist = '';
  let album = 'YouTube Music';
  let durationSec = 210;
  if (!runs || !Array.isArray(runs)) return { artist: 'Various Artists', album, durationSec };

  const meaningful: { text: string; pageType?: string }[] = [];
  for (const r of runs) {
    const txt = r.text ? r.text.trim() : '';
    if (!txt || txt === '•') continue;
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(txt)) {
      durationSec = parseDurationText(txt);
      continue;
    }
    if (/^\d+(\.\d+)?(K|M|B)?\s*(views|plays|subscribers)$/i.test(txt)) continue;
    if (/^(Song|Video|Single|Album|EP|Artist|Playlist|Podcast|Episode)$/i.test(txt)) continue;
    if (/^\d{4}$/.test(txt)) continue;

    const pageType = r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    meaningful.push({ text: txt, pageType });
  }

  const artistItem = meaningful.find((m) => m.pageType === 'MUSIC_PAGE_TYPE_ARTIST');
  const albumItem = meaningful.find((m) => m.pageType === 'MUSIC_PAGE_TYPE_ALBUM');

  if (artistItem) {
    artist = artistItem.text;
  } else if (meaningful.length >= 1) {
    artist = meaningful[0].text;
  }

  if (albumItem) {
    album = albumItem.text;
  } else if (meaningful.length >= 2) {
    const nonArtist = meaningful.filter((m) => m.text !== artist);
    if (nonArtist.length > 0) album = nonArtist[0].text;
  }

  return { artist: artist || 'Various Artists', album, durationSec };
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

function cleanRadioTrackTitle(rawTitle: string) {
  if (!rawTitle) return 'Unknown Title';
  return rawTitle
    .replace(/(&quot;|&#39;|&amp;)/g, (m) => (m === '&quot;' ? '"' : m === '&#39;' ? "'" : '&'))
    .replace(/\s*(?:explicit\s*version\s*\/?\s*closed\s*captioned|closed\s*captioned|explicit\s*version)/gi, '')
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit|audio)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered)?).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function handleYouTubeRadio(videoId: string, query?: string, apiKey?: string) {
  // 1. If videoId is provided, fetch watch-next radio playlist from YouTube Music
  if (videoId) {
    try {
      const res = await fetch('https://music.youtube.com/youtubei/v1/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://music.youtube.com/',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          videoId: videoId,
          playlistId: `RDAMVM${videoId}`,
          isAudioOnly: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const watchNext = data?.contents?.singleColumnMusicWatchNextResultsRenderer;
        const tabs = watchNext?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
        const queueRenderer = tabs[0]?.tabRenderer?.content?.musicQueueRenderer;
        const items = queueRenderer?.content?.playlistPanelRenderer?.contents || queueRenderer?.items || [];

        const tracks: any[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const v = item.playlistPanelVideoRenderer;
          if (!v || !v.videoId) continue;
          if (seen.has(v.videoId)) continue;
          if (v.videoId === videoId) continue; // Skip seed track

          const rawTitle = v.title?.runs?.[0]?.text || '';
          let artist = v.shortBylineText?.runs?.[0]?.text;
          if (!artist) {
            const artistRun = v.longBylineText?.runs?.find(
              (r: any) =>
                r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_ARTIST'
            );
            artist = artistRun?.text || v.longBylineText?.runs?.[0]?.text || 'Various Artists';
          }
          artist = (artist || 'Various Artists').replace(/\s*-\s*Topic$/i, '').trim();

          const durationStr = v.lengthText?.runs?.[0]?.text || '3:30';
          const durationSec = parseDurationText(durationStr);
          if (durationSec > 720) continue; // Filter out extended 1h loops/mixes

          const cleanTitle = cleanRadioTrackTitle(rawTitle);
          const thumbnail =
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          seen.add(v.videoId);
          tracks.push({
            id: `yt-${v.videoId}`,
            title: cleanTitle,
            artist: artist,
            album: 'YouTube Music Up Next',
            duration: durationSec,
            coverUrl: thumbnail,
            youtubeVideoId: v.videoId,
            addedAt: 'Up Next',
          });
        }

        if (tracks.length > 0) {
          return tracks;
        }
      }
    } catch (e) {
      console.warn('YouTube Music Next Radio fetch error:', e);
    }
  }

  // Fallback: If no videoId or radio endpoint returned empty, search YouTube Music with the query
  const fallbackQuery = query || 'top music hits';
  return handleYouTubeSearch(fallbackQuery, apiKey);
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

  // 1. If user provided YouTube Data API Key
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video&videoCategoryId=10&q=${encodeURIComponent(
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

  // 2. Primary: Dual-channel YouTube Music Search (Songs catalog + Top Result General)
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://music.youtube.com/',
    };
    const clientContext = {
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
    };

    // Parallel fetch: General search (for Top Result Hero card) + Songs filtered search (for clean studio tracks)
    const [generalRes, songsRes] = await Promise.all([
      fetch('https://music.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...clientContext, query }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),

      fetch('https://music.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...clientContext, query, params: 'EgWKAQIIAWoKEAkQChAFEAMQBA%3D%3D' }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const tracks: any[] = [];
    const seenIds = new Set<string>();
    const isExplicitLong = /mix|album|playlist|compilation|loop|hour|set|podcast/i.test(query);

    function addTrack(item: any) {
      if (!item || !item.youtubeVideoId) return;
      if (seenIds.has(item.youtubeVideoId)) return;

      // Filter out > 10 min (600s) videos unless user searched for long format/mix/album
      if (item.duration > 600 && !isExplicitLong) {
        return;
      }

      // Filter out troll/meme/hour-loop videos unless explicitly requested
      if (
        /1\s*hour\s*loop|10\s*hours?|you\s*will\s*ascend|extended\s*(?:loop|1\s*hour)|hour\s*version/i.test(item.title) &&
        !isExplicitLong
      ) {
        return;
      }

      seenIds.add(item.youtubeVideoId);
      tracks.push(item);
    }

    // A. Check Top Result card from general search (official music video or hero song)
    const generalSections =
      generalRes?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
      [];
    for (const s of generalSections) {
      if (s.musicCardShelfRenderer) {
        const card = s.musicCardShelfRenderer;
        const rawTitle = card.title?.runs?.[0]?.text;
        const videoId =
          card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
          card.buttons?.[0]?.buttonRenderer?.command?.watchEndpoint?.videoId ||
          card.buttons?.[0]?.buttonRenderer?.navigationEndpoint?.watchEndpoint?.videoId ||
          card.onTap?.watchEndpoint?.videoId;

        const { artist, album, durationSec } = extractArtistAlbumDuration(card.subtitle?.runs);
        const thumb =
          card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

        if (videoId && rawTitle) {
          const cleaned = cleanTitleAndArtist(rawTitle, artist);
          addTrack({
            id: `yt-${videoId}`,
            title: cleaned.title,
            artist: cleaned.artist,
            album: album || 'Top Result',
            duration: durationSec,
            coverUrl: thumb,
            youtubeVideoId: videoId,
            addedAt: 'Top Result',
          });
        }
      }
    }

    // B. Extract official studio songs from YouTube Music's dedicated Songs catalog
    const songsSections =
      songsRes?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
      [];
    const songsShelf = songsSections?.[0]?.musicShelfRenderer;
    if (songsShelf?.contents) {
      for (const it of songsShelf.contents) {
        const r = it.musicResponsiveListItemRenderer;
        if (!r) continue;

        const videoId =
          r.playlistItemData?.videoId ||
          r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
        const rawTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const { artist, album, durationSec } = extractArtistAlbumDuration(runs);

        const thumb =
          r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

        if (videoId && rawTitle) {
          const cleaned = cleanTitleAndArtist(rawTitle, artist);
          addTrack({
            id: `yt-${videoId}`,
            title: cleaned.title,
            artist: cleaned.artist,
            album: album || 'YouTube Music',
            duration: durationSec,
            coverUrl: thumb,
            youtubeVideoId: videoId,
            addedAt: 'Song',
          });
        }
      }
    }

    // C. Extract from general items (musicShelfRenderer or itemSectionRenderer)
    for (const s of generalSections) {
      const items = s.musicShelfRenderer?.contents || s.itemSectionRenderer?.contents || [];
      for (const it of items) {
        const r = it.musicResponsiveListItemRenderer;
        if (!r) continue;

        const videoId =
          r.playlistItemData?.videoId ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
          r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

        const rawTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const itemType = runs[0]?.text || '';
        if (/^(Artist|Profile|Podcast|Episode|Playlist)$/i.test(itemType)) continue;

        const { artist, album, durationSec } = extractArtistAlbumDuration(runs);
        const thumb =
          r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

        if (videoId && rawTitle) {
          const cleaned = cleanTitleAndArtist(rawTitle, artist);
          addTrack({
            id: `yt-${videoId}`,
            title: cleaned.title,
            artist: cleaned.artist,
            album: album || 'YouTube Music',
            duration: durationSec,
            coverUrl: thumb,
            youtubeVideoId: videoId,
            addedAt: 'Search Result',
          });
        }
      }
    }

    if (tracks.length > 0) {
      return tracks.slice(0, 25);
    }
  } catch (innertubeErr) {
    console.warn('YouTube Music Innertube search error:', innertubeErr);
  }

  // 3. Fallback: Direct YouTube HTML Search with consent cookie and redirect protection
  try {
    const isExplicitSearch = /song|music|audio|track|lyrics/i.test(query);
    const searchQuery = isExplicitSearch ? query : `${query} song`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=PENDING+999; SOCS=CAESEwgDEgk2MTQ5Mzc3MzgaAmVuIAEaBgiA_LyaBg;',
      },
    });

    if (res.ok) {
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

            if (durationSec < 45 && !query.toLowerCase().includes('effect') && !query.toLowerCase().includes('sound')) {
              continue;
            }
            if (
              durationSec > 600 &&
              !query.toLowerCase().includes('album') &&
              !query.toLowerCase().includes('mix') &&
              !query.toLowerCase().includes('playlist') &&
              !query.toLowerCase().includes('set') &&
              !query.toLowerCase().includes('podcast')
            ) {
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
    }
  } catch (err) {
    console.error('Direct YouTube search fallback error:', err);
  }

  return [];
}

function searchApiPlugin() {
  return {
    name: 'search-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // Handle /api/radio or /api/related
        if (req.url && (req.url.startsWith('/api/radio') || req.url.startsWith('/api/related') || req.url.startsWith('/api/next'))) {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          const videoId = parsedUrl.searchParams.get('videoId') || parsedUrl.searchParams.get('v') || '';
          const query = parsedUrl.searchParams.get('q') || '';
          const apiKey = parsedUrl.searchParams.get('apiKey') || '';

          try {
            const tracks = await handleYouTubeRadio(videoId, query, apiKey);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tracks }));
          } catch (err) {
            console.error('Radio API error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tracks: [] }));
          }
          return;
        }

        // Handle /api/search
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
