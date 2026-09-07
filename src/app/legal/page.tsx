import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Attribution & legal",
  description:
    "How Resonate uses YouTube's official APIs and player, where lyrics come from, and what data is stored.",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-[var(--text-dim)]">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 lg:px-8 lg:py-14">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="text-lg font-semibold tracking-tight text-[var(--text)]">Resonate</span>
      </Link>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[var(--text)]">
        Attribution &amp; legal
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
        Plain-language notes on where the music, the lyrics and the data come from.
      </p>

      <Block title="Resonate is an independent app">
        <p>
          Resonate is not affiliated with, endorsed by, sponsored by or connected to YouTube, Google
          LLC, Apple, Spotify, or any other music service. The name, logo, icons, illustrations and
          interface are original work made for this project.
        </p>
      </Block>

      <Block title="Where the music comes from">
        <p>
          Every track you see is a YouTube video, found through the official{" "}
          <a
            className="text-[var(--accent)] underline underline-offset-2"
            href="https://developers.google.com/youtube/v3"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Data API v3
          </a>{" "}
          and played by the official{" "}
          <a
            className="text-[var(--accent)] underline underline-offset-2"
            href="https://developers.google.com/youtube/iframe_api_reference"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube IFrame Player
          </a>{" "}
          running in your own browser.
        </p>
        <p>
          Resonate does <strong className="text-[var(--text)]">not</strong> download, rip, cache,
          proxy, re-host or transcode any audio or video. It does not resolve direct media URLs, and
          it does not bypass advertising, region restrictions, age gates or any other technical
          measure. When a video&rsquo;s owner disallows embedding, Resonate says so and offers a link
          to watch it on YouTube instead — it does not work around the restriction.
        </p>
        <p>
          Use of the embedded player is subject to the{" "}
          <a
            className="text-[var(--accent)] underline underline-offset-2"
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Terms of Service
          </a>{" "}
          and the{" "}
          <a
            className="text-[var(--accent)] underline underline-offset-2"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>
          . The embedded player may set cookies and count views exactly as it does on youtube.com.
        </p>
      </Block>

      <Block title="The player is always the real player">
        <p>
          There is no audio-only mode. Resonate never strips the video surface out to play sound on
          its own: the official player element stays mounted and on screen for the whole session —
          full size on the Now Playing screen, and as a live tile in the mini player. Collapsing the
          player only changes how much room it takes up.
        </p>
        <p>
          If you are deploying this yourself, note that YouTube&rsquo;s branding guidelines ask for
          an embedded player of at least 200×200 pixels. The mini player&rsquo;s tile is smaller than
          that while collapsed, which is worth weighing up before you run this anywhere public.
        </p>
      </Block>

      <Block title="What metadata is stored">
        <p>
          For each track you play, favorite or add to a playlist, Resonate stores the YouTube video
          id plus a small descriptive snapshot the API returns: title, channel name, duration and the
          thumbnail URL. That is what lets a playlist render instantly without spending API quota.
        </p>
        <p>
          Cached snapshots are refreshed when they pass 30 days, in line with YouTube&rsquo;s
          developer policies on stored API data. Thumbnails are always loaded directly from
          YouTube&rsquo;s image servers, never copied onto ours.
        </p>
      </Block>

      <Block title="Crossfade, and what the player can't do">
        <p>
          Crossfade is real. Resonate runs two official YouTube players and ramps their volumes in
          opposite directions so one track genuinely fades into the next. Both are ordinary embeds
          doing ordinary playback.
        </p>
        <p>
          An equalizer is not possible. Shaping bass, mid and treble needs the decoded audio inside a
          Web Audio graph, and the audio lives inside a cross-origin iframe that this page cannot
          reach. Rather than ship sliders that move without doing anything, Resonate leaves the
          feature out and says why in Settings.
        </p>
      </Block>

      <Block title="Lyrics">
        <p>
          Lyrics are fetched from{" "}
          <a
            className="text-[var(--accent)] underline underline-offset-2"
            href="https://lrclib.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            LRCLIB
          </a>
          , a free, openly licensed community lyrics database with a documented public API. Nothing is
          scraped from lyrics websites.
        </p>
        <p>
          Responses are cached on the server to be a considerate API client, shown only inside the
          player to the person listening, and never re-published, exported or exposed in bulk. If
          LRCLIB has no match, Resonate says so rather than guessing.
        </p>
      </Block>

      <Block title="Your account data">
        <p>
          Passwords are never stored. Only a salted scrypt hash is kept, and sign-in comparisons are
          constant-time. Sessions are opaque random tokens held in an httpOnly cookie; the server
          stores only a keyed digest of each one.
        </p>
        <p>
          Playlists are private by default. Sharing creates an unlisted, view-only link, and turning
          sharing off invalidates every link that was handed out. Every playlist read and write is
          checked against the signed-in owner on the server — the client is never trusted for
          permissions.
        </p>
        <p>
          You can clear your listening history and recent searches at any time, or stop them being
          recorded at all, from Settings → Privacy.
        </p>
      </Block>

      <Block title="Rights">
        <p>
          All music, artwork, channel names and video content belong to their respective owners.
          Resonate provides an interface for discovering and playing that content through
          YouTube&rsquo;s own systems, and claims no rights over any of it.
        </p>
      </Block>

      <div className="mt-12 border-t border-[var(--border-soft)] pt-6">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--accent)] underline underline-offset-2"
        >
          Back to Resonate
        </Link>
      </div>
    </div>
  );
}
