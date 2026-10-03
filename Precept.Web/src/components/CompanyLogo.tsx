import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * Company marks. Precept never loads third-party logos, so a company gets one of:
 * 1. a designed mark, for the fictional companies used in the demo and product screenshots;
 * 2. a generated geometric mark, derived from the name so the same company always gets the
 *    same mark and different companies look different. No letters, so no "font icon" tiles.
 */

type Mark = { bg: string; glyph: ReactNode };

const W = '#ffffff';

const DESIGNED: Record<string, Mark> = {
  // Payments: a hovering kestrel, wings swept down.
  'kestrel pay': {
    bg: '#0e5e6f',
    glyph: (
      <>
        <path
          d="M4.5 13.5c4.6-1.6 8.2-.9 11.5 3.3 3.3-4.2 6.9-4.9 11.5-3.3-3.9 1.3-6.6 3.6-8.9 7.4L16 25l-2.6-4.1c-2.3-3.8-5-6.1-8.9-7.4z"
          fill={W}
        />
        <circle cx="16" cy="12.2" r="2.1" fill="#7fe0c8" />
      </>
    ),
  },
  // Frontend platform: a planet with a tilted orbit.
  orbitform: {
    bg: '#3b37c9',
    glyph: (
      <>
        <circle cx="16" cy="16" r="5.2" fill={W} />
        <ellipse cx="16" cy="16" rx="11" ry="4.4" fill="none" stroke={W} strokeWidth="1.8" transform="rotate(-24 16 16)" opacity=".85" />
        <circle cx="25.3" cy="11.9" r="1.9" fill="#b9b6ff" />
      </>
    ),
  },
  // Observability: rising bars with a spark.
  'brightlane analytics': {
    bg: '#f2a93b',
    glyph: (
      <>
        <rect x="7.5" y="17" width="4.2" height="8" rx="1.4" fill="#2b1b05" />
        <rect x="13.9" y="13" width="4.2" height="12" rx="1.4" fill="#2b1b05" />
        <rect x="20.3" y="9" width="4.2" height="16" rx="1.4" fill="#2b1b05" />
        <circle cx="24.6" cy="5.9" r="1.6" fill="#fff6e0" />
      </>
    ),
  },
  // Infrastructure: a weather vane.
  corvane: {
    bg: '#1f2430',
    glyph: (
      <>
        <path d="M16 12v12.5M12 25h8" stroke={W} strokeWidth="1.9" strokeLinecap="round" />
        <path d="M7 12h15" stroke={W} strokeWidth="1.9" strokeLinecap="round" />
        <path d="M21 8.5l5.5 3.5-5.5 3.5z" fill="#e5484d" />
        <path d="M7 12l-2.2-2.6M7 12l-2.2 2.6M9.6 12 7.4 9.4M9.6 12l-2.2 2.6" stroke={W} strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  // Data pipelines: water rising in a well.
  tidewell: {
    bg: '#1c7ed6',
    glyph: (
      <>
        <path d="M5.5 13.5q2.6-3 5.25 0t5.25 0 5.25 0 5.25 0" fill="none" stroke={W} strokeWidth="2.1" strokeLinecap="round" />
        <path d="M5.5 19.5q2.6-3 5.25 0t5.25 0 5.25 0 5.25 0" fill="none" stroke={W} strokeWidth="2.1" strokeLinecap="round" opacity=".6" />
      </>
    ),
  },
  // Logistics: an isometric crate.
  'halden logistics': {
    bg: '#e8590c',
    glyph: (
      <>
        <path d="M16 6l9 5-9 5-9-5z" fill={W} />
        <path d="M7 11l9 5v10l-9-5z" fill={W} opacity=".55" />
        <path d="M25 11l-9 5v10l9-5z" fill={W} opacity=".78" />
      </>
    ),
  },
  // Docs tooling: a quill nib over stacked lines.
  quillstack: {
    bg: '#7048e8',
    glyph: (
      <>
        <path d="M24.5 5.5c-5.6 2.6-9.6 7.4-12 14.2l2.1.9c2.8-6.2 6.4-10.6 10.9-13.4z" fill={W} />
        <path d="M12.5 19.7l-1.6 4.1 3.7-3.2" fill={W} />
        <rect x="6" y="24.6" width="9" height="1.9" rx=".95" fill={W} opacity=".7" />
        <rect x="17" y="24.6" width="6" height="1.9" rx=".95" fill={W} opacity=".45" />
      </>
    ),
  },
};

/** Deep, saturated backgrounds that keep a white glyph legible in both themes. */
const PALETTE = ['#c92a2a', '#d9480f', '#e67700', '#5c940d', '#2b8a3e', '#0b7285', '#1864ab', '#364fc7', '#5f3dc4', '#862e9c', '#c2255c', '#495057'];

/** Geometric glyph families on a 32 x 32 grid, drawn around the centre so they can be rotated. */
const GLYPHS: ReactNode[] = [
  // split circle
  <>
    <circle cx="16" cy="16" r="8" fill="none" stroke={W} strokeWidth="2" />
    <path d="M16 8a8 8 0 0 1 0 16z" fill={W} />
  </>,
  // nested arcs
  <>
    <path d="M8 24a16 16 0 0 1 16-16" fill="none" stroke={W} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M13 24a11 11 0 0 1 11-11" fill="none" stroke={W} strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
    <circle cx="22" cy="22" r="2.2" fill={W} />
  </>,
  // offset triangles
  <>
    <path d="M8 23l7-13 7 13z" fill={W} />
    <path d="M15 23l5-9 5 9z" fill={W} opacity=".6" />
  </>,
  // diamond cluster
  <>
    <path d="M16 6.5l4 4-4 4-4-4z" fill={W} />
    <path d="M10.5 12l4 4-4 4-4-4z" fill={W} opacity=".65" />
    <path d="M21.5 12l4 4-4 4-4-4z" fill={W} opacity=".65" />
    <path d="M16 17.5l4 4-4 4-4-4z" fill={W} opacity=".4" />
  </>,
  // double chevron
  <>
    <path d="M9 12l7 6 7-6" fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 18l7 6 7-6" fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
  </>,
  // notched ring
  <>
    <path d="M22.4 11.2A8 8 0 1 0 24 16" fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="23.5" cy="9.5" r="2" fill={W} />
  </>,
  // quarter tiles
  <>
    <rect x="8" y="8" width="7" height="7" rx="1.6" fill={W} />
    <rect x="17" y="17" width="7" height="7" rx="1.6" fill={W} opacity=".6" />
    <path d="M17 15V8a7 7 0 0 1 7 7z" fill={W} opacity=".85" />
    <path d="M15 17v7a7 7 0 0 1-7-7z" fill={W} opacity=".45" />
  </>,
  // slanted bars
  <>
    <path d="M9 22l6-12M14.5 22l6-12M20 22l3-6" fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
  </>,
  // nested squares
  <>
    <rect x="8" y="8" width="16" height="16" rx="3" fill="none" stroke={W} strokeWidth="2.2" />
    <rect x="12.5" y="12.5" width="7" height="7" rx="1.6" fill={W} />
  </>,
  // dot triad
  <>
    <circle cx="16" cy="9.5" r="3.2" fill={W} />
    <circle cx="10" cy="20.5" r="3.2" fill={W} opacity=".7" />
    <circle cx="22" cy="20.5" r="3.2" fill={W} opacity=".45" />
  </>,
  // offset cross
  <>
    <rect x="13.5" y="7" width="5" height="18" rx="2.5" fill={W} />
    <rect x="7" y="13.5" width="18" height="5" rx="2.5" fill={W} opacity=".6" />
  </>,
  // hexagon with core
  <>
    <path d="M16 7l7.8 4.5v9L16 25l-7.8-4.5v-9z" fill="none" stroke={W} strokeWidth="2.2" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="2.8" fill={W} />
  </>,
];

/**
 * FNV-1a, then MurmurHash3's fmix32 finalizer. FNV alone mixes its low bits poorly, so
 * names differing only in a suffix produced correlated colour and shape picks.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export function companyMark(name: string): Mark & { rotation: number } {
  const key = normalize(name);
  const designed = DESIGNED[key];
  if (designed) return { ...designed, rotation: 0 };
  // Independent hashes per attribute, so names that share a colour rarely share a shape too.
  const seed = key || '?';
  return {
    bg: PALETTE[hash(`${seed}#colour`) % PALETTE.length],
    glyph: GLYPHS[hash(`${seed}#shape`) % GLYPHS.length],
    rotation: (hash(`${seed}#turn`) % 4) * 90,
  };
}

export function CompanyLogo({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const { bg, glyph, rotation } = companyMark(name);
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      data-testid="company-logo"
    >
      <rect width="32" height="32" rx="8" fill={bg} />
      <rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#000" strokeOpacity=".12" />
      <g transform={rotation ? `rotate(${rotation} 16 16)` : undefined}>{glyph}</g>
    </svg>
  );
}
