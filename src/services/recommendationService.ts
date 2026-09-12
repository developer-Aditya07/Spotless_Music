import { Track, Playlist } from '../types';
import { searchYouTubeMusic, fetchYouTubeRadio } from './youtubeService';
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

// Clean and normalize song titles to detect duplicate versions of the same song
export function normalizeSongTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    // Remove featured artists and remix notations
    .replace(/\s*(?:\[|\()(?:feat\.?|ft\.?|featuring|with)[^\]\)]*(?:\]|\))/gi, '')
    // Remove parenthetical video/audio descriptors
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit|slowed\s*\+\s*reverb|slowed|reverb|karaoke(?:\s*version)?|live(?:\s*on[^\]\)]*)?|live|cover(?:\s*by[^\]\)]*)?)[^\]\)]*(?:\]|\))/gi, '')
    // Remove common trailing markers like "- Official Music Video"
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered|slowed|live)?).*/gi, '')
    // Replace non-alphanumeric with spaces and trim
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Compare two track titles to see if they are the same core song
export function areTitlesEffectivelySame(titleA: string, titleB: string): boolean {
  const normA = normalizeSongTitle(titleA);
  const normB = normalizeSongTitle(titleB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  // If one title starts with or contains the exact normalized title of the other
  if (normA.length >= 4 && normB.length >= 4) {
    if (normA.startsWith(normB) || normB.startsWith(normA)) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  return false;
}

// Artist Vibe & Style Map for Smart Autoplay and recommendations
const ARTIST_VIBE_MAP: Record<string, string[]> = {
  'the weeknd': ['Post Malone', 'Bruno Mars', 'Daft Punk', 'Khalid', 'SZA', 'Frank Ocean'],
  'dua lipa': ['Sabrina Carpenter', 'Calvin Harris', 'Miley Cyrus', 'Katy Perry', 'Charli XCX'],
  'harry styles': ['Taylor Swift', 'Niall Horan', 'Shawn Mendes', 'Ed Sheeran', 'Coldplay'],
  'sabrina carpenter': ['Olivia Rodrigo', 'Chappell Roan', 'Dua Lipa', 'Ariana Grande', 'Billie Eilish'],
  'imagine dragons': ['OneRepublic', 'Coldplay', 'Fall Out Boy', 'The Killers', 'Bastille', 'Twenty One Pilots'],
  'taylor swift': ['Olivia Rodrigo', 'Sabrina Carpenter', 'Lana Del Rey', 'Phoebe Bridgers', 'Gracie Abrams'],
  'billie eilish': ['Lana Del Rey', 'Lorde', 'Olivia Rodrigo', 'FINNEAS', 'Girl in Red'],
  'ed sheeran': ['Shawn Mendes', 'Lewis Capaldi', 'James Arthur', 'Sam Smith', 'Harry Styles'],
  'coldplay': ['OneRepublic', 'The Script', 'Keane', 'Snow Patrol', 'Imagine Dragons'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Juice WRLD', 'Khalid', '21 Savage', 'Morgan Wallen'],
  'olivia rodrigo': ['Sabrina Carpenter', 'Chappell Roan', 'Taylor Swift', 'Billie Eilish', 'Conan Gray'],
  'chappell roan': ['Sabrina Carpenter', 'Olivia Rodrigo', 'Charli XCX', 'Remi Wolf', 'Rina Sawayama'],
  'drake': ['Travis Scott', '21 Savage', 'Kendrick Lamar', 'Future', 'J. Cole', 'Lil Baby'],
  'kendrick lamar': ['J. Cole', 'Baby Keem', 'Drake', 'A$AP Rocky', 'Tyler, The Creator'],
  'bts': ['Jung Kook', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'TWICE', 'SEVENTEEN'],
  'ariana grande': ['Sabrina Carpenter', 'Dua Lipa', 'Doja Cat', 'Camila Cabello', 'SZA'],
  'eminem': ['Dr. Dre', '50 Cent', 'Snoop Dogg', 'Tupac', 'Kendrick Lamar', 'Logic'],
  'travis scott': ['Drake', 'Playboi Carti', 'Future', 'Don Toliver', 'Lil Uzi Vert'],
  'justin bieber': ['Shawn Mendes', 'Charlie Puth', 'Zayn', 'The Weeknd', 'Ed Sheeran'],
  'bruno mars': ['Anderson .Paak', 'The Weeknd', 'Silk Sonic', 'Michael Jackson', 'Mark Ronson'],
  'bad bunny': ['Rauw Alejandro', 'J Balvin', 'Ozuna', 'Anuel AA', 'Feid', 'Daddy Yankee'],
  'arijit singh': ['Atif Aslam', 'Mohit Chauhan', 'Jubin Nautiyal', 'Armaan Malik', 'Pritam', 'KK'],
  'sidhu moose wala': ['Karan Aujla', 'Diljit Dosanjh', 'Shubh', 'AP Dhillon', 'Amrit Maan'],
  'karan aujla': ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Shubh', 'AP Dhillon', 'Ikky'],
  'diljit dosanjh': ['Karan Aujla', 'Sidhu Moose Wala', 'AP Dhillon', 'Badshah', 'Guru Randhawa'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Karan Aujla', 'Diljit Dosanjh', 'Talwiinder'],
  'shubh': ['AP Dhillon', 'Karan Aujla', 'Sidhu Moose Wala', 'Talwiinder'],
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
    queries.push(`${randomRelated} official audio`, `${currentTrack.artist} official audio`);
  } else {
    queries.push(
      `${currentTrack.artist} official audio`,
      `${currentTrack.title} radio music`
    );
  }

  const candidates: Track[] = [];

  // Query YouTube Music search
  for (const q of queries) {
    try {
      const results = await searchYouTubeMusic(q, apiKey);
      for (const t of results) {
        // Strict duplicate check: ID, video ID, and normalized title
        if (
          !excludedIds.has(t.id) &&
          !excludedIds.has(t.youtubeVideoId) &&
          !excludedIds.has(normalizeSongTitle(t.title)) &&
          t.youtubeVideoId !== currentTrack.youtubeVideoId &&
          !areTitlesEffectivelySame(t.title, currentTrack.title)
        ) {
          candidates.push(t);
        }
      }
      if (candidates.length >= 8) break;
    } catch (e) {
      console.warn('Error querying similar vibe tracks:', q, e);
    }
  }

  // Also pull catalog candidates with matching artist or vibe
  for (const local of INITIAL_TRACKS) {
    if (
      !excludedIds.has(local.id) &&
      !excludedIds.has(local.youtubeVideoId) &&
      !excludedIds.has(normalizeSongTitle(local.title)) &&
      local.id !== currentTrack.id &&
      local.youtubeVideoId !== currentTrack.youtubeVideoId &&
      !areTitlesEffectivelySame(local.title, currentTrack.title)
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

  // Deduplicate candidates by ID, Video ID, and core normalized Title
  const seenIds = new Set<string>();
  const seenVideos = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueCandidates: Track[] = [];

  for (const c of candidates) {
    const norm = normalizeSongTitle(c.title);
    if (!seenIds.has(c.id) && !seenVideos.has(c.youtubeVideoId) && !seenTitles.has(norm)) {
      seenIds.add(c.id);
      seenVideos.add(c.youtubeVideoId);
      seenTitles.add(norm);
      uniqueCandidates.push(c);
    }
  }

  return uniqueCandidates;
}

export interface SearchCategorizedResults {
  topResult: Track | null;
  songs: Track[];
  moreByArtist: Track[];
  similarVibe: Track[];
  allTracks: Track[];
}

// Spotify/YouTube Music-Style Search Engine:
// 1. Identifies the primary "Top Result"
// 2. Filters out duplicates/covers/clones of the queried track
// 3. Fetches other popular songs by the same artist ("More by [Artist]")
// 4. Fetches complementary recommendations matching the music style ("Fans Also Like / Similar Vibe")
export async function searchTracksCategorized(
  query: string,
  apiKey?: string
): Promise<SearchCategorizedResults> {
  const primaryResults = await searchYouTubeMusic(query, apiKey);
  if (!primaryResults || primaryResults.length === 0) {
    return {
      topResult: null,
      songs: [],
      moreByArtist: [],
      similarVibe: [],
      allTracks: [],
    };
  }

  const isExplicitLong = /mix|album|playlist|compilation|loop|hour|set|podcast/i.test(query);

  // Filter out any abnormal 10+ minute / 17-minute videos if searching for a standard song
  const filteredPrimary = primaryResults.filter((track) => {
    if (track.duration > 600 && !isExplicitLong) return false;
    if (
      /1\s*hour\s*loop|10\s*hours?|you\s*will\s*ascend|extended\s*(?:loop|1\s*hour)|hour\s*version/i.test(track.title) &&
      !isExplicitLong
    ) {
      return false;
    }
    return true;
  });

  const candidatesToUse = filteredPrimary.length > 0 ? filteredPrimary : primaryResults;

  // Deduplicate primary results: keep the best version of each distinct song
  const deduplicatedPrimary: Track[] = [];
  const seenSongKeys = new Set<string>();
  const seenVideoIds = new Set<string>();

  for (const track of candidatesToUse) {
    if (seenVideoIds.has(track.youtubeVideoId)) continue;

    const norm = normalizeSongTitle(track.title);
    let isDuplicate = false;
    for (const seen of seenSongKeys) {
      if (seen === norm || areTitlesEffectivelySame(track.title, seen)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seenVideoIds.add(track.youtubeVideoId);
      seenSongKeys.add(norm || track.title);
      deduplicatedPrimary.push(track);
    }
  }

  // Prioritize topResult: if the first item has a generic artist ("Video", "Various Artists") or is an odd duration,
  // look for the best candidate with a verified artist name and reasonable song duration
  let topResultIndex = 0;
  if (deduplicatedPrimary.length > 1) {
    const first = deduplicatedPrimary[0];
    const isFirstGenericArtist = !first.artist || /^(video|song|single|various\s*artists)$/i.test(first.artist.trim());
    if (isFirstGenericArtist) {
      const betterIndex = deduplicatedPrimary.findIndex(
        (t) => t.artist && !/^(video|song|single|various\s*artists)$/i.test(t.artist.trim()) && t.duration <= 480
      );
      if (betterIndex > 0) {
        topResultIndex = betterIndex;
      }
    }
  }

  const topResult = deduplicatedPrimary[topResultIndex] || deduplicatedPrimary[0] || null;
  const songs = deduplicatedPrimary.filter((_, idx) => idx !== topResultIndex);
  const moreByArtist: Track[] = [];
  const similarVibe: Track[] = [];

  // If top result is found with a videoId, fetch genuine YouTube Music watch-next recommendations
  if (topResult && topResult.youtubeVideoId) {
    const artistName = topResult.artist || '';
    const artistLower = artistName.toLowerCase();
    const isGenericArtist = !artistName || /^(video|song|single|various\s*artists)$/i.test(artistName.trim());

    // 1. Fetch authentic YouTube Music Watch-Next / Radio recommendations for this exact track!
    // This gives genuine matching-vibe tracks (e.g. Haryanvi/Desi hip-hop for Russian Bandana)
    // rather than naive text search which matches words like "Russian"!
    try {
      const radioTracks = await fetchYouTubeRadio(topResult.youtubeVideoId, undefined, apiKey);

      for (const t of radioTracks) {
        if (t.duration > 600 && !isExplicitLong) continue;
        if (seenVideoIds.has(t.youtubeVideoId)) continue;

        const norm = normalizeSongTitle(t.title);
        let isDup = false;
        for (const seen of seenSongKeys) {
          if (seen === norm || areTitlesEffectivelySame(t.title, seen)) {
            isDup = true;
            break;
          }
        }
        if (isDup) continue;

        const isSameArtist =
          !isGenericArtist &&
          (t.artist.toLowerCase().includes(artistLower) || artistLower.includes(t.artist.toLowerCase()));

        if (isSameArtist && moreByArtist.length < 8) {
          seenVideoIds.add(t.youtubeVideoId);
          seenSongKeys.add(norm || t.title);
          moreByArtist.push(t);
        } else if (!isSameArtist && similarVibe.length < 12) {
          seenVideoIds.add(t.youtubeVideoId);
          seenSongKeys.add(norm || t.title);
          similarVibe.push(t);
        }
      }
    } catch (err) {
      console.warn('Error fetching YouTube radio recommendations for similar vibe:', err);
    }

    // 2. Ensure "More by [Artist]" has enough tracks (up to 8) by searching artist catalog if needed
    if (!isGenericArtist && moreByArtist.length < 5) {
      try {
        const artistTracks = await searchYouTubeMusic(`${artistName} official audio`, apiKey);
        for (const t of artistTracks) {
          if (t.duration > 600 && !isExplicitLong) continue;
          if (seenVideoIds.has(t.youtubeVideoId)) continue;

          const norm = normalizeSongTitle(t.title);
          let isDup = false;
          for (const seen of seenSongKeys) {
            if (seen === norm || areTitlesEffectivelySame(t.title, seen)) {
              isDup = true;
              break;
            }
          }
          if (!isDup) {
            seenVideoIds.add(t.youtubeVideoId);
            seenSongKeys.add(norm || t.title);
            moreByArtist.push(t);
          }
          if (moreByArtist.length >= 8) break;
        }
      } catch (e) {
        console.warn('Error fetching additional tracks by artist:', e);
      }
    }

    // 3. Fallback for similarVibe if needed: query YouTube for related music, NEVER static local catalog
    if (similarVibe.length < 5) {
      try {
        const queryTerm = !isGenericArtist ? `${artistName} radio` : `${topResult.title} song`;
        const ytFallback = await searchYouTubeMusic(queryTerm, apiKey);
        for (const t of ytFallback) {
          if (t.duration > 600 && !isExplicitLong) continue;
          if (seenVideoIds.has(t.youtubeVideoId)) continue;
          const norm = normalizeSongTitle(t.title);
          let isDup = false;
          for (const seen of seenSongKeys) {
            if (seen === norm || areTitlesEffectivelySame(t.title, seen)) {
              isDup = true;
              break;
            }
          }
          if (!isDup) {
            seenVideoIds.add(t.youtubeVideoId);
            seenSongKeys.add(norm || t.title);
            similarVibe.push(t);
          }
          if (similarVibe.length >= 10) break;
        }
      } catch (err) {
        console.warn('Fallback YouTube search error for similar vibe:', err);
      }
    }
  }

  // All tracks unified list for seamless sequential playback (Top Result -> Songs -> Similar Vibe -> More by Artist)
  const allTracks: Track[] = [];
  if (topResult) allTracks.push(topResult);
  allTracks.push(...songs);
  allTracks.push(...similarVibe);
  allTracks.push(...moreByArtist);

  return {
    topResult,
    songs,
    moreByArtist,
    similarVibe,
    allTracks,
  };
}

// Backwards-compatible flat search with recommendations
export async function searchTracksWithRecommendations(
  query: string,
  apiKey?: string
): Promise<Track[]> {
  const categorized = await searchTracksCategorized(query, apiKey);
  return categorized.allTracks;
}
