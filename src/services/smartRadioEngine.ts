import { Track, UserListeningProfile, RadioMode, RecommendationScoreBreakdown } from '../types';
import { searchYouTubeMusic, fetchYouTubeRadio } from './youtubeService';
import { INITIAL_TRACKS } from '../data/musicData';

// ---------------------------------------------------------------------------
// 1. MUSIC PROVIDER ABSTRACTION
// ---------------------------------------------------------------------------
export interface MusicProvider {
  search(query: string, apiKey?: string): Promise<Track[]>;
  getRelatedCandidates(currentTrack: Track, mode: RadioMode, apiKey?: string): Promise<Track[]>;
}

// Memory cache for recommendations (songId -> candidate array) with 10-minute TTL
interface CacheEntry {
  timestamp: number;
  tracks: Track[];
}
const recommendationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Artist Vibe & Style Map for smart clustering and adjacent genres
export const ARTIST_VIBE_MAP: Record<string, string[]> = {
  'the weeknd': ['Post Malone', 'Bruno Mars', 'Daft Punk', 'Khalid', 'SZA', 'Frank Ocean', 'Kendrick Lamar', 'M83'],
  'dua lipa': ['Sabrina Carpenter', 'Calvin Harris', 'Miley Cyrus', 'Katy Perry', 'Charli XCX', 'Ava Max'],
  'harry styles': ['Taylor Swift', 'Niall Horan', 'Shawn Mendes', 'Ed Sheeran', 'Coldplay', 'LANY'],
  'sabrina carpenter': ['Olivia Rodrigo', 'Chappell Roan', 'Dua Lipa', 'Ariana Grande', 'Billie Eilish', 'Tate McRae'],
  'imagine dragons': ['OneRepublic', 'Coldplay', 'Fall Out Boy', 'The Killers', 'Bastille', 'Twenty One Pilots', 'Walk The Moon'],
  'taylor swift': ['Olivia Rodrigo', 'Sabrina Carpenter', 'Lana Del Rey', 'Phoebe Bridgers', 'Gracie Abrams', 'Kacey Musgraves'],
  'billie eilish': ['Lana Del Rey', 'Lorde', 'Olivia Rodrigo', 'FINNEAS', 'Girl in Red', 'Clairo'],
  'ed sheeran': ['Shawn Mendes', 'Lewis Capaldi', 'James Arthur', 'Sam Smith', 'Harry Styles', 'George Ezra'],
  'coldplay': ['OneRepublic', 'The Script', 'Keane', 'Snow Patrol', 'Imagine Dragons', 'U2'],
  'post malone': ['The Weeknd', 'Swae Lee', 'Juice WRLD', 'Khalid', '21 Savage', 'Morgan Wallen', 'Don Toliver'],
  'olivia rodrigo': ['Sabrina Carpenter', 'Chappell Roan', 'Taylor Swift', 'Billie Eilish', 'Conan Gray', 'Paramore'],
  'chappell roan': ['Sabrina Carpenter', 'Olivia Rodrigo', 'Charli XCX', 'Remi Wolf', 'Rina Sawayama', 'Troye Sivan'],
  'drake': ['Travis Scott', '21 Savage', 'Kendrick Lamar', 'Future', 'J. Cole', 'Lil Baby', 'Gunna'],
  'kendrick lamar': ['J. Cole', 'Baby Keem', 'Drake', 'A$AP Rocky', 'Tyler, The Creator', 'Childish Gambino'],
  'bts': ['Jung Kook', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'TWICE', 'SEVENTEEN', 'TOMORROW X TOGETHER'],
  'ariana grande': ['Sabrina Carpenter', 'Dua Lipa', 'Doja Cat', 'Camila Cabello', 'SZA', 'Selena Gomez'],
  'eminem': ['Dr. Dre', '50 Cent', 'Snoop Dogg', 'Tupac', 'Kendrick Lamar', 'Logic', 'NF'],
  'travis scott': ['Drake', 'Playboi Carti', 'Future', 'Don Toliver', 'Lil Uzi Vert', 'Metro Boomin'],
  'justin bieber': ['Shawn Mendes', 'Charlie Puth', 'Zayn', 'The Weeknd', 'Ed Sheeran', 'Austin Mahone'],
  'bruno mars': ['Anderson .Paak', 'The Weeknd', 'Silk Sonic', 'Michael Jackson', 'Mark Ronson', 'Prince'],
  'bad bunny': ['Rauw Alejandro', 'J Balvin', 'Ozuna', 'Anuel AA', 'Feid', 'Daddy Yankee', 'Myke Towers'],
  'daft punk': ['The Weeknd', 'Justice', 'Gorillaz', 'Empire of the Sun', 'Kavinsky', 'LCD Soundsystem'],
  'arijit singh': ['Atif Aslam', 'Mohit Chauhan', 'Jubin Nautiyal', 'Armaan Malik', 'Pritam', 'KK', 'Vishal Mishra'],
  'sidhu moose wala': ['Karan Aujla', 'Diljit Dosanjh', 'Shubh', 'AP Dhillon', 'Amrit Maan', 'Prem Dhillon'],
  'karan aujla': ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Shubh', 'AP Dhillon', 'Ikky', 'DIVINE'],
  'diljit dosanjh': ['Karan Aujla', 'Sidhu Moose Wala', 'AP Dhillon', 'Badshah', 'Guru Randhawa', 'Yo Yo Honey Singh'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Karan Aujla', 'Diljit Dosanjh', 'Talwiinder', 'Intense'],
  'shubh': ['AP Dhillon', 'Karan Aujla', 'Sidhu Moose Wala', 'Talwiinder', 'Cheema Y'],
};

// YouTube Music Implementation of MusicProvider
export const youtubeMusicProvider: MusicProvider = {
  async search(query: string, apiKey?: string): Promise<Track[]> {
    return searchYouTubeMusic(query, apiKey);
  },

  async getRelatedCandidates(currentTrack: Track, mode: RadioMode, apiKey?: string): Promise<Track[]> {
    const artistLower = currentTrack.artist.toLowerCase();
    let relatedArtists: string[] = [];

    for (const [key, list] of Object.entries(ARTIST_VIBE_MAP)) {
      if (artistLower.includes(key) || key.includes(artistLower)) {
        relatedArtists = list;
        break;
      }
    }

    const pool: Track[] = [];

    // 1. Primary: Query YouTube Music RDAMVM Watch-Next Radio Playlist for the current track
    try {
      const radioTracks = await fetchYouTubeRadio(
        currentTrack.youtubeVideoId,
        `${currentTrack.artist} ${currentTrack.title}`,
        apiKey
      );
      if (radioTracks && radioTracks.length > 0) {
        pool.push(...radioTracks);
      }
    } catch (e) {
      console.warn('YouTube Radio fetch error in engine:', e);
    }

    // 2. Mode-specific supplemental candidate queries
    const supplementalQueries: string[] = [];
    if (mode === 'artist') {
      supplementalQueries.push(`${currentTrack.artist} songs`);
      if (relatedArtists.length > 0) {
        supplementalQueries.push(`${relatedArtists[0]} songs`);
      }
    } else if (mode === 'discovery') {
      if (relatedArtists.length > 1) {
        supplementalQueries.push(`${relatedArtists[1]} songs`);
      }
      if (relatedArtists.length > 2) {
        supplementalQueries.push(`${relatedArtists[2]} songs`);
      }
    }

    if (supplementalQueries.length > 0) {
      try {
        const supplementalBatches = await Promise.all(
          supplementalQueries.map((q) => searchYouTubeMusic(q, apiKey).catch(() => []))
        );
        for (const batch of supplementalBatches) {
          pool.push(...batch);
        }
      } catch {
        // ignore
      }
    }

    // 3. Fallback if pool is empty: query YouTube for artist or song radio, never unrelated static tracks
    if (pool.length === 0) {
      try {
        const fallbackQuery = currentTrack.artist ? `${currentTrack.artist} radio` : `${currentTrack.title} song`;
        const ytFallback = await searchYouTubeMusic(fallbackQuery, apiKey);
        pool.push(...ytFallback.filter((t) => t.youtubeVideoId !== currentTrack.youtubeVideoId));
      } catch (err) {
        console.warn('Fallback search in provider failed:', err);
      }
    }

    return pool;
  },
};

// ---------------------------------------------------------------------------
// 2. NORMALIZATION & DUPLICATE / VERSION DETECTION
// ---------------------------------------------------------------------------

export function normalizeSongTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\s*(?:\[|\()(?:feat\.?|ft\.?|featuring|with)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*(?:\[|\()(?:official\s*(?:video|audio|music\s*video|lyric\s*video|hd|hq|4k|visualizer)?|music\s*video|lyric\s*video|lyrics|hd|hq|4k|visualizer|remastered|remaster|radio\s*edit|original\s*mix|best\s*audio|pseudo\s*video|explicit|slowed\s*\+\s*reverb|slowed|reverb|karaoke(?:\s*version)?|live(?:\s*on[^\]\)]*)?|live|cover(?:\s*by[^\]\)]*)?)[^\]\)]*(?:\]|\))/gi, '')
    .replace(/\s*[-–—:]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video|lyrics|hd|hq|visualizer|remastered|slowed|live)?).*/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areTitlesEffectivelySame(titleA: string, titleB: string): boolean {
  const normA = normalizeSongTitle(titleA);
  const normB = normalizeSongTitle(titleB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 4 && normB.length >= 4) {
    if (normA.startsWith(normB) || normB.startsWith(normA)) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  return false;
}

// Calculate version penalty (live, cover, slowed, acoustic, etc.)
export function calculateVersionPenalty(candidateTitle: string, currentTrackTitle: string): number {
  const lowCandidate = candidateTitle.toLowerCase();
  const lowCurrent = currentTrackTitle.toLowerCase();

  // If user is already playing a live/remix/slowed version, preserve that style context!
  const isUserPlayingLive = /live|concert|tour/i.test(lowCurrent);
  const isUserPlayingRemix = /remix|bootleg|flip|club/i.test(lowCurrent);
  const isUserPlayingSlowed = /slowed|reverb|nightcore|sped\s*up/i.test(lowCurrent);

  let penalty = 0;

  if (/\b(?:live|concert|tour)\b/i.test(lowCandidate)) {
    penalty += isUserPlayingLive ? 0.0 : -0.15;
  }
  if (/\b(?:remix|mashup|edit|bootleg)\b/i.test(lowCandidate)) {
    penalty += isUserPlayingRemix ? 0.0 : -0.15;
  }
  if (/\b(?:cover|tribute)\b/i.test(lowCandidate)) {
    penalty += -0.30;
  }
  if (/\b(?:slowed\s*(?:\+|and)?\s*reverb|slowed|nightcore|8d|sped\s*up|speed\s*up)\b/i.test(lowCandidate)) {
    penalty += isUserPlayingSlowed ? 0.0 : -0.25;
  }
  if (/\b(?:karaoke|instrumental|backing\s*track)\b/i.test(lowCandidate)) {
    penalty += -0.40;
  }

  return penalty;
}

// ---------------------------------------------------------------------------
// 3. CANDIDATE SCORING ENGINE
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  providerScore: number;
  similarityScore: number;
  personalPreferenceScore: number;
  artistPreferenceScore: number;
  completionPreferenceScore: number;
  noveltyScore: number;
  explorationScore: number;
  popularityScore: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  providerScore: 0.30,
  similarityScore: 0.20,
  personalPreferenceScore: 0.15,
  artistPreferenceScore: 0.10,
  completionPreferenceScore: 0.05,
  noveltyScore: 0.10,
  explorationScore: 0.05,
  popularityScore: 0.05,
};

export function scoreCandidate(
  candidate: Track,
  currentTrack: Track,
  profile: UserListeningProfile,
  sessionHistory: Track[],
  mode: RadioMode = 'normal',
  weights: ScoringWeights = DEFAULT_WEIGHTS
): RecommendationScoreBreakdown {
  const candArtist = candidate.artist.toLowerCase();
  const currArtist = currentTrack.artist.toLowerCase();
  const candNormTitle = normalizeSongTitle(candidate.title);

  // 1. Provider score (high if returned first in provider results)
  const providerScore = 0.85;

  // 2. Similarity score
  let similarityScore = 0.5;
  const isSameArtist = candArtist === currArtist || candArtist.includes(currArtist) || currArtist.includes(candArtist);
  if (isSameArtist) {
    similarityScore += 0.35;
  } else {
    // Check artist vibe map
    let related: string[] = [];
    for (const [key, list] of Object.entries(ARTIST_VIBE_MAP)) {
      if (currArtist.includes(key) || key.includes(currArtist)) {
        related = list;
        break;
      }
    }
    if (related.some((r) => candArtist.includes(r.toLowerCase()))) {
      similarityScore += 0.30;
    }
  }

  // 3. Personal preference score (likes/dislikes)
  let personalPreferenceScore = 0.5;
  if (profile.dislikedTrackIds.includes(candidate.id)) {
    personalPreferenceScore = 0.0;
  }

  // 4. Artist preference score (learned from listening)
  const artistCount = profile.topArtists[candidate.artist] || profile.artistAffinity[candidate.artist] || 0;
  const artistPreferenceScore = Math.min(1.0, 0.4 + artistCount * 0.1);

  // 5. Novelty score (has user heard this before?)
  const timesPlayed = profile.playCountMap[candidate.id] || profile.playCountMap[candNormTitle] || 0;
  const noveltyScore = timesPlayed === 0 ? 0.9 : Math.max(0.2, 0.8 - timesPlayed * 0.15);

  // 6. Exploration score
  const explorationScore = mode === 'discovery' ? 0.9 : 0.5;

  // 7. Popularity score (estimated duration sanity & completeness)
  const popularityScore = candidate.duration >= 100 && candidate.duration <= 360 ? 0.8 : 0.5;

  // 8. Version Penalty
  const versionPenalty = calculateVersionPenalty(candidate.title, currentTrack.title);

  // 9. Repetition / Recency Penalty
  let repetitionPenalty = 0;
  const recentIndex = sessionHistory.findIndex(
    (t) => t.id === candidate.id || t.youtubeVideoId === candidate.youtubeVideoId || areTitlesEffectivelySame(t.title, candidate.title)
  );

  if (recentIndex !== -1) {
    if (recentIndex < 2) repetitionPenalty -= 1.0; // Played within last 2 songs
    else if (recentIndex < 5) repetitionPenalty -= 0.7; // Played within last 5 songs
    else if (recentIndex < 10) repetitionPenalty -= 0.4;
    else repetitionPenalty -= 0.15;
  }

  // Soft artist repetition penalty (discourage 4 of the exact same artist in a row unless Artist Radio)
  if (mode !== 'artist' && sessionHistory.length >= 2) {
    const recentSameArtistCount = sessionHistory.slice(0, 3).filter((t) => t.artist.toLowerCase() === candArtist).length;
    if (recentSameArtistCount >= 2) {
      repetitionPenalty -= 0.35;
    }
  }

  // 10. Skip Penalty (from user past skips)
  const skipCount = profile.skipScore[candidate.id] || profile.skipScore[candNormTitle] || 0;
  const skipPenalty = -Math.min(0.8, skipCount * 0.25);

  // Weighted sum
  let finalScore =
    providerScore * weights.providerScore +
    similarityScore * weights.similarityScore +
    personalPreferenceScore * weights.personalPreferenceScore +
    artistPreferenceScore * weights.artistPreferenceScore +
    noveltyScore * weights.noveltyScore +
    explorationScore * weights.explorationScore +
    popularityScore * weights.popularityScore +
    versionPenalty +
    repetitionPenalty +
    skipPenalty;

  // Mode-based adjustments
  if (mode === 'artist' && isSameArtist) {
    finalScore += 0.25;
  } else if (mode === 'song' && !isSameArtist) {
    finalScore += 0.1;
  } else if (mode === 'discovery' && !isSameArtist) {
    finalScore += 0.15;
  }

  return {
    trackId: candidate.id,
    title: candidate.title,
    artist: candidate.artist,
    providerScore,
    similarityScore,
    personalPreferenceScore,
    artistPreferenceScore,
    noveltyScore,
    explorationScore,
    popularityScore,
    versionPenalty,
    repetitionPenalty,
    skipPenalty,
    finalScore: Math.max(0.01, finalScore),
  };
}

// ---------------------------------------------------------------------------
// 4. SMART PROBABILISTIC SELECTION (EXPLORATION VS EXPLOITATION)
// ---------------------------------------------------------------------------

export function selectCandidatesProbabilistically(
  scoredCandidates: { track: Track; score: RecommendationScoreBreakdown }[],
  count: number = 6
): Track[] {
  if (scoredCandidates.length <= count) {
    return scoredCandidates.map((s) => s.track);
  }

  // Sort descending by finalScore
  const sorted = [...scoredCandidates].sort((a, b) => b.score.finalScore - a.score.finalScore);

  // Take top pool (top 15-20 candidates)
  const pool = sorted.slice(0, Math.min(25, sorted.length));

  // Convert scores into normalized probabilities
  const totalScore = pool.reduce((sum, item) => sum + Math.max(0.01, item.score.finalScore), 0);
  const remaining = [...pool];
  const selected: Track[] = [];

  while (selected.length < count && remaining.length > 0) {
    const currentSum = remaining.reduce((sum, item) => sum + Math.max(0.01, item.score.finalScore), 0);
    const rand = Math.random() * currentSum;

    let cumulative = 0;
    let chosenIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      cumulative += Math.max(0.01, remaining[i].score.finalScore);
      if (rand <= cumulative) {
        chosenIndex = i;
        break;
      }
    }

    selected.push(remaining[chosenIndex].track);
    remaining.splice(chosenIndex, 1);
  }

  return selected;
}

// ---------------------------------------------------------------------------
// 5. MAIN RECOMMENDATION ENGINE
// ---------------------------------------------------------------------------

export async function generateSmartRadioQueue(
  currentTrack: Track,
  profile: UserListeningProfile,
  sessionHistory: Track[],
  manualQueue: Track[],
  mode: RadioMode = 'normal',
  apiKey?: string
): Promise<{ tracks: Track[]; debugScores: RecommendationScoreBreakdown[] }> {
  const cacheKey = `${currentTrack.id}-${mode}`;
  const now = Date.now();

  let candidatePool: Track[] = [];
  const cached = recommendationCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    candidatePool = cached.tracks;
  } else {
    try {
      candidatePool = await youtubeMusicProvider.getRelatedCandidates(currentTrack, mode, apiKey);
      recommendationCache.set(cacheKey, { timestamp: now, tracks: candidatePool });
    } catch (e) {
      console.warn('Provider failed to fetch radio candidates:', e);
      candidatePool = [];
    }
  }

  // Filtering: Exclude exact current song, duplicate videos, or identical core song titles
  const seenIds = new Set<string>();
  if (currentTrack.id) {
    seenIds.add(currentTrack.id);
    seenIds.add(currentTrack.id.replace(/^yt-/, ''));
    seenIds.add(`yt-${currentTrack.id.replace(/^yt-/, '')}`);
  }
  if (currentTrack.youtubeVideoId) {
    seenIds.add(currentTrack.youtubeVideoId);
    seenIds.add(`yt-${currentTrack.youtubeVideoId}`);
  }
  const seenNormTitles = new Set<string>();
  const seedNorm = normalizeSongTitle(currentTrack.title);
  if (seedNorm) seenNormTitles.add(seedNorm);

  // Exclude tracks currently in manual queue to prevent duplicates
  for (const m of manualQueue) {
    if (m.id) {
      seenIds.add(m.id);
      seenIds.add(`yt-${m.id.replace(/^yt-/, '')}`);
    }
    if (m.youtubeVideoId) {
      seenIds.add(m.youtubeVideoId);
      seenIds.add(`yt-${m.youtubeVideoId}`);
    }
    const mNorm = normalizeSongTitle(m.title);
    if (mNorm) seenNormTitles.add(mNorm);
  }

  const validCandidates: Track[] = [];
  for (const c of candidatePool) {
    // 1. Direct ID / videoId match
    if (seenIds.has(c.id) || (c.youtubeVideoId && seenIds.has(c.youtubeVideoId))) continue;
    if (c.youtubeVideoId && currentTrack.youtubeVideoId && c.youtubeVideoId === currentTrack.youtubeVideoId) continue;

    // 2. Title similarity / duplicate song match
    const norm = normalizeSongTitle(c.title);
    if (norm && seenNormTitles.has(norm)) continue;
    if (areTitlesEffectivelySame(c.title, currentTrack.title)) continue;

    seenIds.add(c.id);
    if (c.youtubeVideoId) {
      seenIds.add(c.youtubeVideoId);
      seenIds.add(`yt-${c.youtubeVideoId}`);
    }
    if (norm) seenNormTitles.add(norm);
    validCandidates.push(c);
  }

  // Score candidates for transparency and debug info
  const scored = validCandidates.map((cand, idx) => {
    const score = scoreCandidate(cand, currentTrack, profile, sessionHistory, mode);
    // When candidates come directly from YouTube Music Up Next, apply sequential confidence boost
    const naturalRankingScore = Math.max(0.72, 0.98 - idx * 0.008);
    score.finalScore = Math.max(score.finalScore, naturalRankingScore);
    return { track: cand, score };
  });

  let selectedTracks: Track[];
  if (validCandidates.length >= 4) {
    if (mode === 'artist') {
      // Prioritize tracks by the same artist
      const currArtist = currentTrack.artist.toLowerCase();
      const artistTracks = scored.filter((s) =>
        s.track.artist.toLowerCase().includes(currArtist)
      );
      const otherTracks = scored.filter(
        (s) => !s.track.artist.toLowerCase().includes(currArtist)
      );
      selectedTracks = [...artistTracks, ...otherTracks].slice(0, 35).map((s) => s.track);
    } else if (mode === 'discovery') {
      // Prioritize distinct related artists
      const currArtist = currentTrack.artist.toLowerCase();
      const otherTracks = scored.filter(
        (s) => !s.track.artist.toLowerCase().includes(currArtist)
      );
      selectedTracks = otherTracks.slice(0, 35).map((s) => s.track);
    } else {
      // Default / Balanced / Song: Keep authentic YouTube Music Up Next queue sequence!
      selectedTracks = validCandidates.slice(0, 35);
    }
  } else {
    // Sparse pool fallback: probabilistic sampling
    selectedTracks = selectCandidatesProbabilistically(scored, 8);
  }

  const debugScores = scored.map((s) => s.score);

  return {
    tracks: selectedTracks,
    debugScores,
  };
}

// ---------------------------------------------------------------------------
// 6. DEFAULT EMPTY PROFILE INITIALIZER & HELPERS
// ---------------------------------------------------------------------------

export const INITIAL_USER_PROFILE: UserListeningProfile = {
  topArtists: {},
  artistAffinity: {},
  skipScore: {},
  completedPercentMap: {},
  playCountMap: {},
  dislikedTrackIds: [],
};
