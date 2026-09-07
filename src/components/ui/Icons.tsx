/**
 * Original icon set drawn for Resonate. Single-weight 1.7px strokes on a
 * 24-unit grid, round caps and joins, so everything sits together optically.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3.6 10.4 12 3.8l8.4 6.6" />
    <path d="M5.6 9.6V19a1.4 1.4 0 0 0 1.4 1.4h3.2v-5.2h3.6v5.2H17a1.4 1.4 0 0 0 1.4-1.4V9.6" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.4" />
    <path d="m15.6 15.6 4 4" />
  </Svg>
);

export const IconLibrary = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.2v13.6" />
    <path d="M8.4 4.4v15.2" />
    <path d="m12.9 5.1 5.4 14.2a1.2 1.2 0 0 0 1.5.7l.3-.1" />
    <path d="M12.9 5.1a1.2 1.2 0 0 1 1.6-.7l1.7.6" />
  </Svg>
);

export const IconPlaylist = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h11" />
    <path d="M4 12h11" />
    <path d="M4 17h6" />
    <circle cx="17.5" cy="16.5" r="2.5" />
    <path d="M20 16.5V9l-3 .9" />
  </Svg>
);

export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.2s-7.4-4.3-7.4-9.4A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.4 2.7c0 5.1-7.4 9.4-7.4 9.4Z" />
  </Svg>
);

export const IconHistory = (p: P) => (
  <Svg {...p}>
    <path d="M3.8 12a8.2 8.2 0 1 0 2.5-5.9" />
    <path d="M3.6 4.6v4h4" />
    <path d="M12 7.8V12l2.8 1.8" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.9" />
    <path d="M12 3.2v2M12 18.8v2M20.8 12h-2M5.2 12h-2M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4M18.2 18.2l-1.4-1.4M7.2 7.2 5.8 5.8" />
  </Svg>
);

export const IconPlay = ({ filled = true, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M8.4 5.6 18.6 12 8.4 18.4V5.6Z" />
  </Svg>
);

export const IconPause = ({ filled = true, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <rect x="7.6" y="5.4" width="3.4" height="13.2" rx="1.2" />
    <rect x="13" y="5.4" width="3.4" height="13.2" rx="1.2" />
  </Svg>
);

export const IconNext = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M6.6 6.1a1 1 0 0 1 1.53-.85l7.1 4.4a1 1 0 0 1 0 1.7l-7.1 4.4a1 1 0 0 1-1.53-.85V6.1Z" />
    <rect x="16.4" y="5.6" width="2" height="12.8" rx="1" />
  </Svg>
);

export const IconPrev = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M17.4 6.1a1 1 0 0 0-1.53-.85l-7.1 4.4a1 1 0 0 0 0 1.7l7.1 4.4a1 1 0 0 0 1.53-.85V6.1Z" />
    <rect x="5.6" y="5.6" width="2" height="12.8" rx="1" />
  </Svg>
);

export const IconShuffle = (p: P) => (
  <Svg {...p}>
    <path d="M17 4.6 20 7.4l-3 2.8" />
    <path d="M17 14 20 16.8l-3 2.8" />
    <path d="M4 7.4h3.1c1.2 0 2.3.6 3 1.6l3.8 5.6c.7 1 1.8 1.6 3 1.6H20" />
    <path d="M4 16.8h3.1c1.2 0 2.3-.6 3-1.6l.7-1" />
    <path d="m14 9.4.9-1.4c.7-1 1.8-1.6 3-1.6H20" />
  </Svg>
);

export const IconRepeat = (p: P) => (
  <Svg {...p}>
    <path d="M6.6 8.2h9a3.2 3.2 0 0 1 3.2 3.2v.6" />
    <path d="m16.4 5.4 2.8 2.8-2.8 2.8" />
    <path d="M17.4 15.8h-9a3.2 3.2 0 0 1-3.2-3.2v-.6" />
    <path d="m7.6 18.6-2.8-2.8 2.8-2.8" />
  </Svg>
);

export const IconRepeatOne = (p: P) => (
  <Svg {...p}>
    <path d="M6.6 8.2h9a3.2 3.2 0 0 1 3.2 3.2v.6" />
    <path d="m16.4 5.4 2.8 2.8-2.8 2.8" />
    <path d="M17.4 15.8h-9a3.2 3.2 0 0 1-3.2-3.2v-.6" />
    <path d="m7.6 18.6-2.8-2.8 2.8-2.8" />
    <path d="M11.4 10.6 12.8 10v4.2" strokeWidth={1.9} />
  </Svg>
);

export const IconQueue = (p: P) => (
  <Svg {...p}>
    <path d="M4 6.6h11" />
    <path d="M4 11.4h11" />
    <path d="M4 16.2h7" />
    <path d="M17.4 12.2v6.6" />
    <path d="m14.6 15.4 2.8-3.2 2.8 3.2" />
  </Svg>
);

export const IconMore = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <circle cx="12" cy="5.6" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="18.4" r="1.7" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.6 4.4 4.4L19 7.4" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />
  </Svg>
);

export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6.4 9.4 5.6 5.6 5.6-5.6" />
  </Svg>
);

export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9.4 5.8 6.2 6.2-6.2 6.2" />
  </Svg>
);

export const IconChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M14.6 5.8 8.4 12l6.2 6.2" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4.8 6.8h14.4" />
    <path d="M9.4 6.8V5.4a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.4" />
    <path d="M6.6 6.8 7.4 19a1.2 1.2 0 0 0 1.2 1.1h6.8a1.2 1.2 0 0 0 1.2-1.1l.8-12.2" />
    <path d="M10.4 10.4v6M13.6 10.4v6" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4.8 19.2h3.4l9.1-9.1a1.7 1.7 0 0 0 0-2.4l-1-1a1.7 1.7 0 0 0-2.4 0l-9.1 9.1v3.4Z" />
    <path d="m13.4 7.4 3.2 3.2" />
  </Svg>
);

export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.2V4.4" />
    <path d="m8.2 7.8 3.8-3.4 3.8 3.4" />
    <path d="M6 12.4H5.2A1.2 1.2 0 0 0 4 13.6v4.8a1.2 1.2 0 0 0 1.2 1.2h13.6a1.2 1.2 0 0 0 1.2-1.2v-4.8a1.2 1.2 0 0 0-1.2-1.2H18" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10.2 13.8a3.4 3.4 0 0 0 5 .3l2.4-2.4a3.4 3.4 0 0 0-4.8-4.8l-1.3 1.3" />
    <path d="M13.8 10.2a3.4 3.4 0 0 0-5-.3l-2.4 2.4a3.4 3.4 0 0 0 4.8 4.8l1.3-1.3" />
  </Svg>
);

export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M13.6 5.4H18.6v5" />
    <path d="M18.6 5.4 11 13" />
    <path d="M18 14.4v4.2a1.2 1.2 0 0 1-1.2 1.2H5.4a1.2 1.2 0 0 1-1.2-1.2V7.2A1.2 1.2 0 0 1 5.4 6h4.2" />
  </Svg>
);

export const IconLyrics = (p: P) => (
  <Svg {...p}>
    <path d="M5 6.4h9" />
    <path d="M5 11h7" />
    <path d="M5 15.6h5.5" />
    <circle cx="16.4" cy="16.2" r="2.4" />
    <path d="M18.8 16.2V8.6l2.2-.7" />
  </Svg>
);

export const IconVolume = ({ level = 2, ...p }: P & { level?: 0 | 1 | 2 }) => (
  <Svg {...p}>
    <path d="M4.6 9.4h2.8L11 6.1v11.8L7.4 14.6H4.6a.8.8 0 0 1-.8-.8v-3.6a.8.8 0 0 1 .8-.8Z" />
    {level >= 1 && <path d="M14 9.8a3.2 3.2 0 0 1 0 4.4" />}
    {level >= 2 && <path d="M16.6 7.4a6.6 6.6 0 0 1 0 9.2" />}
    {level === 0 && <path d="m15 9.6 4.4 4.8M19.4 9.6 15 14.4" />}
  </Svg>
);

export const IconDrag = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <circle cx="9.4" cy="6.4" r="1.5" />
    <circle cx="14.6" cy="6.4" r="1.5" />
    <circle cx="9.4" cy="12" r="1.5" />
    <circle cx="14.6" cy="12" r="1.5" />
    <circle cx="9.4" cy="17.6" r="1.5" />
    <circle cx="14.6" cy="17.6" r="1.5" />
  </Svg>
);

export const IconSort = (p: P) => (
  <Svg {...p}>
    <path d="M5 7.4h14M7.4 12h9.2M10 16.6h4" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8.6" r="3.6" />
    <path d="M5 19.6a7.2 7.2 0 0 1 14 0" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5.2" y="10.4" width="13.6" height="9.2" rx="2" />
    <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
  </Svg>
);

export const IconWarning = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.6 2.8 19.4h18.4L12 4.6Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 11.2v5" />
    <circle cx="12" cy="8.2" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.2 13.5 9l4.8 1.5-4.8 1.5L12 16.8l-1.5-4.8L5.7 10.5 10.5 9 12 4.2Z" />
    <path d="M18.4 15.6l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
  </Svg>
);

export const IconTrending = (p: P) => (
  <Svg {...p}>
    <path d="m4 16.4 4.6-4.6 3.2 3.2 5-5" />
    <path d="M15.4 9.4h3.4v3.4" />
  </Svg>
);

export const IconEq = (p: P) => (
  <Svg {...p}>
    <path d="M7 4.6v4M7 13v6.4M17 4.6v6.4M17 15.6v3.8" />
    <circle cx="7" cy="10.8" r="2.1" />
    <circle cx="17" cy="13.4" r="2.1" />
  </Svg>
);

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M19.2 14.4A7.6 7.6 0 0 1 9.6 4.8a7.8 7.8 0 1 0 9.6 9.6Z" />
  </Svg>
);

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.8" />
    <path d="M12 3.4v1.8M12 18.8v1.8M20.6 12h-1.8M5.2 12H3.4M18.1 5.9l-1.3 1.3M7.2 16.8l-1.3 1.3M18.1 18.1l-1.3-1.3M7.2 7.2 5.9 5.9" />
  </Svg>
);

export const IconMonitor = (p: P) => (
  <Svg {...p}>
    <rect x="3.4" y="5" width="17.2" height="11.4" rx="1.8" />
    <path d="M9 20h6M12 16.4V20" />
  </Svg>
);

export const IconSignOut = (p: P) => (
  <Svg {...p}>
    <path d="M14.4 7.6V6a1.6 1.6 0 0 0-1.6-1.6H6.4A1.6 1.6 0 0 0 4.8 6v12a1.6 1.6 0 0 0 1.6 1.6h6.4a1.6 1.6 0 0 0 1.6-1.6v-1.6" />
    <path d="M9.6 12h9.6" />
    <path d="m16.4 8.8 3.2 3.2-3.2 3.2" />
  </Svg>
);

export const IconMusicOff = (p: P) => (
  <Svg {...p}>
    <path d="M9.4 18.2a2.6 2.6 0 1 1-2.6-2.6c.5 0 1 .1 1.4.4" />
    <path d="M9.4 16V6.6l9-2.4v4" />
    <path d="M4 4l16 16" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.5V4.5" />
    <path d="m7.5 9 4.5-4.5L16.5 9" />
    <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
  </Svg>
);

export const IconExplicit = (p: P) => (
  <Svg {...p} fill="none">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M14.5 8.5h-5v7h5M9.5 12h4" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
