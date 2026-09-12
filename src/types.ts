export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  coverUrl: string;
  youtubeVideoId: string;
  isExplicit?: boolean;
  addedAt?: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  owner: string;
  isCustom?: boolean;
  likesCount?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  coverUrl: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];
  history: Track[];
  likedTrackIds: string[];
}

export type RadioMode = 'normal' | 'artist' | 'song' | 'discovery';

export interface RecommendationScoreBreakdown {
  trackId: string;
  title: string;
  artist: string;
  providerScore: number;
  similarityScore: number;
  personalPreferenceScore: number;
  artistPreferenceScore: number;
  noveltyScore: number;
  explorationScore: number;
  popularityScore: number;
  versionPenalty: number;
  repetitionPenalty: number;
  skipPenalty: number;
  finalScore: number;
}

export interface UserSettings {
  youtubeApiKey: string;
  audioQuality: 'auto' | 'high' | 'normal';
  normalizeVolume: boolean;
}

export interface UserListeningProfile {
  topArtists: Record<string, number>;
  artistAffinity: Record<string, number>;
  skipScore: Record<string, number>; // songId or normTitle -> penalty count
  completedPercentMap: Record<string, number>; // songId -> average completion
  playCountMap: Record<string, number>;
  dislikedTrackIds: string[];
}
