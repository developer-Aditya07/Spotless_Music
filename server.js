import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: Radio / Up Next Recommendations from YouTube Music
  if (req.url && (req.url.startsWith('/api/radio') || req.url.startsWith('/api/related') || req.url.startsWith('/api/next'))) {
    const parsedUrl = new URL(req.url, 'http://localhost:3000');
    const videoId = parsedUrl.searchParams.get('videoId') || parsedUrl.searchParams.get('v') || '';
    const query = parsedUrl.searchParams.get('q') || '';
    const apiKey = parsedUrl.searchParams.get('apiKey') || '';

    handleYouTubeRadio(videoId, query, apiKey)
      .then((tracks) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tracks }));
      })
      .catch((err) => {
        console.error('Radio API error:', err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tracks: [] }));
      });
    return;
  }

  // API Endpoint: Search YouTube Music
  if (req.url && req.url.startsWith('/api/search')) {
    const parsedUrl = new URL(req.url, 'http://localhost:3000');
    const query = parsedUrl.searchParams.get('q') || '';
    const apiKey = parsedUrl.searchParams.get('apiKey') || '';

    if (!query.trim()) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tracks: [] }));
      return;
    }

    handleYouTubeSearch(query.trim(), apiKey)
      .then((tracks) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tracks }));
      })
      .catch((err) => {
        console.error('Search API error:', err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tracks: [] }));
      });
    return;
  }

  let reqPath = req.url ? req.url.split('?')[0] : '/';
  let filePath = path.join(DIST_DIR, reqPath);

  // If path is a directory or ends in /, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback: if file doesn't exist, serve index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Spotify Ad-Free Web Server] Listening on http://0.0.0.0:${PORT}`);
});

function parseDurationText(durationStr) {
  if (!durationStr) return 210;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function extractArtistAlbumDuration(runs) {
  let artist = '';
  let album = 'YouTube Music';
  let durationSec = 210;
  if (!runs || !Array.isArray(runs)) return { artist: 'Various Artists', album, durationSec };

  // 1. Extract duration by scanning backward from the end (avoids misidentifying titles like "9:45" as duration)
  for (let i = runs.length - 1; i >= 0; i--) {
    const txt = runs[i].text ? runs[i].text.trim() : '';
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(txt)) {
      durationSec = parseDurationText(txt);
      break;
    }
  }

  // 2. Identify bullet "•" separators
  const bulletIndices = [];
  runs.forEach((r, idx) => {
    if (r.text?.trim() === '•') bulletIndices.push(idx);
  });

  if (bulletIndices.length > 0) {
    // Section before first bullet contains artist(s)
    const artistRuns = runs.slice(0, bulletIndices[0]);
    const artistText = artistRuns.map((r) => r.text || '').join('').trim();
    if (artistText && !/^(Song|Video|Single|Album|EP|Artist|Playlist|Podcast|Episode)$/i.test(artistText)) {
      artist = artistText;
    }

    // Section between first and second bullet is usually the album/single
    if (bulletIndices.length >= 2) {
      const albumRuns = runs.slice(bulletIndices[0] + 1, bulletIndices[1]);
      const albumText = albumRuns.map((r) => r.text || '').join('').trim();
      if (albumText && !/^\d{1,2}:\d{2}/.test(albumText) && !/^\d+(\.\d+)?(K|M|B)?\s*(views|plays)/i.test(albumText)) {
        album = albumText;
      }
    }
  }

  // Fallback extraction if no bullets were present
  if (!artist) {
    const meaningful = [];
    for (const r of runs) {
      const txt = r.text ? r.text.trim() : '';
      if (!txt || txt === '•') continue;
      if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(txt)) continue;
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
  }

  return { artist: artist || 'Various Artists', album, durationSec };
}

function cleanTitleAndArtist(rawTitle, channelArtist) {
  if (!rawTitle) return { title: 'Unknown Title', artist: channelArtist || 'Unknown Artist' };
  
  const text = rawTitle.replace(/(&quot;|&#39;|&amp;)/g, (m) => (m === '&quot;' ? '"' : m === '&#39;' ? "'" : '&')).trim();
  let artist = (channelArtist || '').replace(/\s*-\s*Topic$/i, '').trim();
  let title = text;

  const isGenericArtist = !artist || /^(unknown\s*artist|various\s*artists|artist|topic)$/i.test(artist);

  if (!isGenericArtist) {
    const esc = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const artistPrefixRegex = new RegExp(`^${esc}\\s*[-–—:]\\s*`, 'i');
    if (artistPrefixRegex.test(title)) {
      title = title.replace(artistPrefixRegex, '').trim();
    }
  } else {
    // Only split on space-padded separator ` - `, ` – `, ` — `, or `: ` outside parentheses
    // Never split unpadded hyphens inside words like "Lo-Fi", "Sci-Fi", or "9:45"
    const splitMatch = title.match(/^(.+?)\s+(?:[-–—]|\:)\s+(.+)$/);
    if (splitMatch) {
      const candidateArtist = splitMatch[1].trim();
      const candidateTitle = splitMatch[2].trim();
      const openArtist = (candidateArtist.match(/\(/g) || []).length;
      const closeArtist = (candidateArtist.match(/\)/g) || []).length;
      const openTitle = (candidateTitle.match(/\(/g) || []).length;
      const closeTitle = (candidateTitle.match(/\)/g) || []).length;

      if (
        openArtist === closeArtist &&
        openTitle === closeTitle &&
        candidateArtist.length <= 40 &&
        !candidateArtist.toLowerCase().includes('playlist')
      ) {
        artist = candidateArtist;
        title = candidateTitle;
      }
    }
  }

  if (!artist) {
    artist = 'Various Artists';
  }

  // Strip promotional pipe suffixes (e.g. "| Mirzapur The Movie | In Cinemas...")
  title = title.replace(/\s*\|\s*.*$/g, '');

  // Strip YouTube parenthetical/bracket tags: (Official Music Video), [Audio], (Lyrics), etc.
  // Note: keeps stylistic genre tags like (Lo-Fi) or (Slowed + Reverb) intact!
  title = title
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit|audio|full\s*song|in\s*cinemas)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered|full\s*song)?).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    title = text;
  }

  return { title, artist };
}

function cleanRadioTrackTitle(rawTitle, artist) {
  if (!rawTitle) return 'Unknown Title';
  let t = rawTitle
    .replace(/(&quot;|&#39;|&amp;)/g, (m) => (m === '&quot;' ? '"' : m === '&#39;' ? "'" : '&'))
    .replace(/\s*\|\s*.*$/g, '')
    .replace(/\s*(?:explicit\s*version\s*\/?\s*closed\s*captioned|closed\s*captioned|explicit\s*version)/gi, '')
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit|audio|full\s*song|in\s*cinemas)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered|full\s*song)?).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (artist && artist !== 'Unknown Artist' && artist !== 'Various Artists') {
    const esc = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pfx = new RegExp(`^${esc}\\s*[-–—:]\\s*`, 'i');
    if (pfx.test(t)) {
      t = t.replace(pfx, '').trim();
    }
  }

  return t || rawTitle;
}

async function handleYouTubeRadio(videoId, query, apiKey) {
  // If videoId is provided, fetch watch-next radio playlist from YouTube Music
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

        const tracks = [];
        const seen = new Set();
        for (const item of items) {
          const v = item.playlistPanelVideoRenderer;
          if (!v || !v.videoId) continue;
          if (seen.has(v.videoId)) continue;
          if (v.videoId === videoId) continue; // Skip seed track

          const rawTitle = v.title?.runs?.[0]?.text || '';
          let artist = '';
          if (v.shortBylineText?.runs && v.shortBylineText.runs.length > 0) {
            artist = v.shortBylineText.runs.map((r) => r.text || '').join('').trim();
          } else if (v.longBylineText?.runs) {
            const bulletIdx = v.longBylineText.runs.findIndex((r) => r.text && r.text.includes('•'));
            const artistRuns = bulletIdx !== -1 ? v.longBylineText.runs.slice(0, bulletIdx) : v.longBylineText.runs;
            artist = artistRuns.map((r) => r.text || '').join('').trim();
          }
          artist = (artist || 'Various Artists').replace(/\s*-\s*Topic$/i, '').trim();

          const durationStr = v.lengthText?.runs?.[0]?.text || '3:30';
          const durationSec = parseDurationText(durationStr);
          if (durationSec > 720) continue; // Filter out extended 1h loops/mixes

          const cleanTitle = cleanRadioTrackTitle(rawTitle, artist);
          const thumbnail =
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          seen.add(v.videoId);
          tracks.push({
            id: `yt-${v.videoId}`,
            title: cleanTitle,
            artist: artist,
            album: cleanTitle,
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

async function handleYouTubeSearch(query, apiKey) {
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

  // 1. Try YouTube Data API Key if provided by user
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video&videoCategoryId=10&q=${encodeURIComponent(
        query
      )}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((item) => {
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
      console.warn('YouTube API Key search failed, falling back to direct search:', e);
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

    const tracks = [];
    const seenIds = new Set();
    const isExplicitLong = /mix|album|playlist|compilation|loop|hour|set|podcast/i.test(query);

    function addTrack(item) {
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

  // 3. Secondary Fallback: Direct YouTube HTML Search with consent cookie and redirect protection
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

        const tracks = [];
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
    console.error('Direct YouTube fallback search error:', err);
  }

  return [];
}

