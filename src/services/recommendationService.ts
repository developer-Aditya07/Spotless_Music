import { Track, Playlist } from '../types';
import { searchYouTubeMusic } from './youtubeService';
import { INITIAL_TRACKS } from '../data/musicData';

// Analyzes history and extracts artist listening frequency
export function getTopArtists(history: Track[]): { artist: string; count: number }[] {
  if (!history || history.length === 0) return [];
  const counts: Record<string, number> = {};
  for (const t of history) {
    if (t.artist) {
      counts[t.artist] = (counts[t.artist] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count);
}

// Extract tracks that have been listened to frequently or recently
export function getOnRepeatTracks(history: Track[]): Track[] {
  if (!history || history.length === 0) return [];
  const seen = new Set<string>();
  const uniqueTracks: Track[] = [];
  for (const track of history) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      uniqueTracks.push(track);
    }
    if (uniqueTracks.length >= 10) break;
  }
  return uniqueTracks;
}

// Generate dynamic Suggested Mixes (Daily Mixes) based on history
export function generateSuggestedMixes(history: Track[], localCatalog: Track[] = INITIAL_TRACKS): Playlist[] {
  const topArtists = getTopArtists(history);
  const mixes: Playlist[] = [];

  // Mix 1: Top Artist 1 Mix
  if (topArtists.length > 0) {
    const artist1 = topArtists[0].artist;
    const matching = history.filter((t) => t.artist === artist1);
    const catalogSimilar = localCatalog.filter((t) => t.artist !== artist1);
    const mixTracks = [...matching, ...catalogSimilar].slice(0, 8);

    mixes.push({
      id: 'suggested-daily-mix-1',
      name: `Daily Mix 1 • ${artist1}`,
      description: `Featuring ${artist1} and similar artists you love from your listening history.`,
      coverUrl: matching[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      tracks: mixTracks,
      owner: 'Spotify Made For You',
      isCustom: false,
      likesCount: 342,
    });
  } else {
    mixes.push({
      id: 'suggested-daily-mix-1',
      name: 'Daily Mix 1',
      description: 'Your favorite tracks and fresh discoveries based on your history.',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      tracks: localCatalog.slice(0, 6),
      owner: 'Spotify Made For You',
      isCustom: false,
      likesCount: 120,
    });
  }

  // Mix 2: Chill / Discovery Mix
  if (topArtists.length > 1) {
    const artist2 = topArtists[1].artist;
    const matching = history.filter((t) => t.artist === artist2);
    const otherTracks = localCatalog.filter((t) => t.artist !== artist2);
    const mixTracks = [...matching, ...otherTracks].slice(0, 8);

    mixes.push({
      id: 'suggested-daily-mix-2',
      name: `Daily Mix 2 • ${artist2}`,
      description: `A blend of ${artist2} and fresh recommendations inspired by your recent streams.`,
      coverUrl: matching[0]?.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      tracks: mixTracks,
      owner: 'Spotify Made For You',
      isCustom: false,
      likesCount: 289,
    });
  } else {
    mixes.push({
      id: 'suggested-discover-weekly',
      name: 'Discover Weekly',
      description: 'Your weekly mixtape of fresh music. Constantly refreshed as you listen.',
      coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
      tracks: [...localCatalog].reverse().slice(0, 6),
      owner: 'Spotify Made For You',
      isCustom: false,
      likesCount: 954,
    });
  }

  return mixes;
}

// Function to generate a real new custom playlist from the user's history
export async function createSmartPlaylistFromHistory(
  history: Track[],
  apiKey?: string
): Promise<Playlist> {
  const topArtists = getTopArtists(history);
  const primaryArtist = topArtists[0]?.artist || 'Top Artists';

  // Seed with user's top history tracks (up to 5 unique tracks)
  const existingIds = new Set<string>();
  const curatedTracks: Track[] = [];

  for (const track of history) {
    if (!existingIds.has(track.id)) {
      existingIds.add(track.id);
      curatedTracks.push(track);
    }
    if (curatedTracks.length >= 5) break;
  }

  // Fetch complementary recommended songs from YouTube Music
  try {
    const searchTerms = [
      `${primaryArtist} songs`,
      topArtists[1] ? `${topArtists[1].artist} songs` : 'trending songs',
    ];

    for (const term of searchTerms) {
      if (curatedTracks.length >= 12) break;
      const results = await searchYouTubeMusic(term, apiKey);
      for (const t of results) {
        if (!existingIds.has(t.id) && curatedTracks.length < 12) {
          existingIds.add(t.id);
          curatedTracks.push(t);
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch external recommendations, using catalog fallback:', err);
    for (const t of INITIAL_TRACKS) {
      if (!existingIds.has(t.id) && curatedTracks.length < 10) {
        existingIds.add(t.id);
        curatedTracks.push(t);
      }
    }
  }

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const playlistName = `${primaryArtist} & Similar Mix`;

  return {
    id: `smart-history-${Date.now()}`,
    name: playlistName,
    description: `Auto-generated on ${dateStr} according to your recent watch history. Featuring ${primaryArtist} and personalized recommendations.`,
    coverUrl: curatedTracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    tracks: curatedTracks,
    owner: 'Made For You',
    isCustom: true,
    likesCount: 1,
  };
}

// Artist Vibe & Style Map for Smart Autoplay
const ARTIST_VIBE_MAP: Record<string, string[]> = {
  'the weeknd': ['Post Malone', 'Bruno Mars', 'Daft Punk', 'Khalid', 'SZA'],
  'dua lipa': ['Sabrina Carpenter', 'Calvin Harris', 'Miley Cyrus', 'Katy Perry', 'Charli XCX'],
  'harry styles': ['Taylor Swift', 'Niall Horan', 'Shawn Mendes', 'Ed Sheeran', 'Coldplay'],
  'sabrina carpenter': ['Olivia Rodrigo', 'Chappell Roan', 'Dua Lipa', 'Ariana Grande', 'Billie Eilish'],
  'imagine dragons': ['OneRepublic', 'Coldplay', 'Fall Out Boy', 'The Killers', 'Bastille'],
  'taylor swift': ['Olivia Rodrigo', 'Sabrina Carpenter', 'Lana Del Rey', 'Phoebe Bridgers', 'Gracie Abrams'],
  'billie eilish': ['Lana Del Rey', 'Lorde', 'Olivia Rodrigo', 'FINNEAS', 'Girl in Red'],
  'ed sheeran': ['Shawn Mendes', 'Lewis Capaldi', 'James Arthur', 'Sam Smith', 'Harry Styles'],
  'coldplay': ['OneRepublic', 'The Script', 'Keane', 'Snow Patrol', 'Imagine Dragons'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Juice WRLD', 'Khalid', '21 Savage'],
  'olivia rodrigo': ['Sabrina Carpenter', 'Chappell Roan', 'Taylor Swift', 'Billie Eilish', 'Conan Gray'],
  'chappell roan': ['Sabrina Carpenter', 'Olivia Rodrigo', 'Charli XCX', 'Remi Wolf', 'Rina Sawayama'],
  'drake': ['Travis Scott', '21 Savage', 'Kendrick Lamar', 'Future', 'J. Cole'],
  'kendrick lamar': ['J. Cole', 'Baby Keem', 'Drake', 'A$AP Rocky', 'Tyler, The Creator'],
  'bts': ['Jung Kook', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'TWICE'],
  'ariana grande': ['Sabrina Carpenter', 'Dua Lipa', 'Doja Cat', 'Camila Cabello', 'SZA'],
};

// Autoplay / Radio Engine: Finds fresh tracks with a similar vibe to the current song
export async function fetchSimilarVibeTracks(
  currentTrack: Track,
  excludedIds: Set<string>,
  apiKey?: string
): Promise<Track[]> {
  const artistLower = currentTrack.artist.toLowerCase();

  // Find mapped related artists
  let relatedArtists: string[] = [];
  for (const [key, list] of Object.entries(ARTIST_VIBE_MAP)) {
    if (artistLower.includes(key) || key.includes(artistLower)) {
      relatedArtists = list;
      break;
    }
  }

  // Construct search queries to explore similar vibes
  const queries: string[] = [];
  if (relatedArtists.length > 0) {
    const randomRelated = relatedArtists[Math.floor(Math.random() * relatedArtists.length)];
    queries.push(`${randomRelated} song audio`, `${currentTrack.artist} song audio`);
  } else {
    queries.push(
      `${currentTrack.artist} songs audio`,
      `${currentTrack.title} similar song audio`
    );
  }

  const candidates: Track[] = [];

  // Query YouTube Music search
  for (const q of queries) {
    try {
      const results = await searchYouTubeMusic(q, apiKey);
      for (const t of results) {
        if (
          !excludedIds.has(t.id) &&
          t.youtubeVideoId !== currentTrack.youtubeVideoId &&
          t.title.toLowerCase() !== currentTrack.title.toLowerCase()
        ) {
          candidates.push(t);
        }
      }
      if (candidates.length >= 6) break;
    } catch (e) {
      console.warn('Error querying similar vibe tracks:', q, e);
    }
  }

  // Also pull catalog candidates with matching artist or vibe
  for (const local of INITIAL_TRACKS) {
    if (
      !excludedIds.has(local.id) &&
      local.id !== currentTrack.id &&
      local.youtubeVideoId !== currentTrack.youtubeVideoId
    ) {
      const isArtistMatch = local.artist.toLowerCase() === artistLower;
      const isRelatedMatch = relatedArtists.some((r) =>
        local.artist.toLowerCase().includes(r.toLowerCase())
      );
      if (isArtistMatch || isRelatedMatch) {
        candidates.unshift(local);
      } else {
        candidates.push(local);
      }
    }
  }

  // Deduplicate candidates
  const seenIds = new Set<string>();
  const seenVideos = new Set<string>();
  const uniqueCandidates: Track[] = [];

  for (const c of candidates) {
    if (!seenIds.has(c.id) && !seenVideos.has(c.youtubeVideoId)) {
      seenIds.add(c.id);
      seenVideos.add(c.youtubeVideoId);
      uniqueCandidates.push(c);
    }
  }

  return uniqueCandidates;
}
