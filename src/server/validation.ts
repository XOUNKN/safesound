import { z } from "zod";
import { badRequest } from "./http";

/** YouTube video ids are always 11 URL-safe base64 characters. */
export const videoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "That doesn't look like a YouTube video id.");

export const trackSchema = z.object({
  videoId,
  title: z.string().trim().min(1).max(300),
  channelId: z.string().max(64).nullable().optional().default(null),
  channelTitle: z.string().max(200).default(""),
  durationSec: z.number().int().min(0).max(86_400).default(0),
  thumbnailUrl: z
    .string()
    .max(500)
    .refine(
      (u) => /^https:\/\/(i\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com)\//.test(u),
      "Thumbnails must come from YouTube's official image hosts.",
    )
    .nullable()
    .optional()
    .default(null),
  publishedAt: z.string().max(40).nullable().optional().default(null),
});

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  username: z
    .string()
    .trim()
    .min(3, "Usernames need at least 3 characters.")
    .max(24, "Usernames can be at most 24 characters.")
    .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, underscores and dots only."),
  displayName: z.string().trim().min(1, "Add a display name.").max(60),
  password: z
    .string()
    .min(8, "Passwords need at least 8 characters.")
    .max(200, "That password is too long."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, underscores and dots only.")
    .optional(),
  avatarColor: z.enum(["violet", "cyan", "amber", "rose", "lime", "slate"]).optional(),
  avatarEmoji: z.string().max(8).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "Passwords need at least 8 characters.").max(200),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
});

export const resetConfirmSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8, "Passwords need at least 8 characters.").max(200),
});

export const playlistCreateSchema = z.object({
  name: z.string().trim().min(1, "Give the playlist a name.").max(80),
  description: z.string().trim().max(300).default(""),
  tracks: z.array(trackSchema).max(200).optional(),
});

export const playlistPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Playlist names can't be empty.").max(80).optional(),
    description: z.string().trim().max(300).optional(),
    visibility: z.enum(["private", "unlisted"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

export const addTracksSchema = z.object({
  tracks: z.array(trackSchema).min(1, "Pick at least one track.").max(200),
});

export const reorderSchema = z.object({
  entryIds: z.array(z.string().min(1).max(64)).min(1).max(1000),
});

export const favoriteSchema = z.object({
  track: trackSchema,
  favorite: z.boolean(),
});

export const historySchema = z.object({
  track: trackSchema,
  source: z.string().max(40).default("unknown"),
});

export const queueSaveSchema = z.object({
  tracks: z.array(trackSchema).max(500),
  currentIndex: z.number().int().min(0).max(500),
  context: z
    .object({
      type: z.string().max(30),
      id: z.string().max(64).nullable(),
      name: z.string().max(120),
    })
    .nullable()
    .default(null),
});

export const settingsSchema = z
  .object({
    theme: z.enum(["system", "dark", "light"]).optional(),
    accent: z.enum(["ember", "violet", "cyan", "rose", "lime"]).optional(),
    volume: z.number().int().min(0).max(100).optional(),
    repeatMode: z.enum(["off", "one", "all"]).optional(),
    shuffle: z.boolean().optional(),
    crossfadeSec: z
      .number()
      .int()
      .refine((v) => [0, 2, 4, 6, 8, 10].includes(v), "Choose one of the supported crossfade lengths.")
      .optional(),
    autoplay: z.boolean().optional(),
    queueAddPosition: z.enum(["end", "next"]).optional(),
    clearQueueOnPlay: z.boolean().optional(),
    lyricsEnabled: z.boolean().optional(),
    lyricsAutoscroll: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    saveHistory: z.boolean().optional(),
    saveSearchHistory: z.boolean().optional(),
    notifyQueueEnd: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

/** Parses a JSON request body, converting Zod issues into a 400 with a usable message. */
export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("That request body wasn't valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.filter((p) => typeof p !== "number").join(".");
    throw badRequest(first?.message ?? "Those details aren't valid.", where ? `Field: ${where}` : undefined);
  }
  return result.data;
}
