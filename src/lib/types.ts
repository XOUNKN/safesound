export type Track = {
  videoId: string;
  title: string;
  channelId: string | null;
  channelTitle: string;
  durationSec: number;
  thumbnailUrl: string | null;
  publishedAt?: string | null;
};

export type RepeatMode = "off" | "one" | "all";
export type Theme = "system" | "dark" | "light";
export type Visibility = "private" | "unlisted";

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarEmoji: string;
  createdAt: number;
};

export type UserSettings = {
  theme: Theme;
  accent: string;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  crossfadeSec: number;
  autoplay: boolean;
  queueAddPosition: "end" | "next";
  clearQueueOnPlay: boolean;
  lyricsEnabled: boolean;
  lyricsAutoscroll: boolean;
  reduceMotion: boolean;
  saveHistory: boolean;
  saveSearchHistory: boolean;
  notifyQueueEnd: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  visibility: Visibility;
  shareToken: string | null;
  trackCount: number;
  durationSec: number;
  covers: string[];
  createdAt: number;
  updatedAt: number;
};

export type PlaylistDetail = Playlist & { tracks: PlaylistTrack[] };
export type PlaylistTrack = Track & { entryId: string; position: number; addedAt: number };

export type SearchPage = {
  items: Track[];
  nextPageToken: string | null;
  source: "youtube" | "cache";
  quotaNote?: string;
};

export type Lyrics = {
  videoId: string;
  provider: string;
  providerUrl: string;
  trackName: string;
  artistName: string;
  synced: boolean;
  lines: { timeMs: number | null; text: string }[];
};

/** Machine-readable error codes shared by the API and the UI. */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "YOUTUBE_NOT_CONFIGURED"
  | "YOUTUBE_QUOTA"
  | "YOUTUBE_UNAVAILABLE"
  | "YOUTUBE_BAD_REQUEST"
  | "LYRICS_NOT_FOUND"
  | "LYRICS_UNAVAILABLE"
  | "NETWORK"
  | "DATABASE"
  | "INTERNAL";

export type ApiErrorBody = { error: { code: ApiErrorCode; message: string; hint?: string } };
