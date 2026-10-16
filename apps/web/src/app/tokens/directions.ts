/**
 * The two visual directions proposed for M1 (spec 01, #105). Hex values are the single source:
 * /tokens renders them and test/directions.test.ts asserts their contrast. The direction the owner
 * picks moves into `@theme` in #106; the other one is deleted with this page's samples.
 */

export type ThemeName = 'light' | 'dark';

export interface Palette {
  /** Page and map background. */
  readonly background: string;
  /** Cards, sheets, tab bar. */
  readonly surface: string;
  readonly foreground: string;
  /** Secondary text: provenance lines, captions, table meta. */
  readonly muted: string;
  readonly border: string;
  /** Primary action fill, with its text color. */
  readonly primary: string;
  readonly onPrimary: string;
  /** One color per target path: `line-1`… in `RoadmapLayout` (ADR 0004, #101). */
  readonly lines: readonly [string, string, string];
  /** Status text: done and needs-your-attention. */
  readonly success: string;
  readonly attention: string;
  /** Pending stations and segments: still a graphic, so it keeps 3:1. */
  readonly pending: string;
}

export interface Direction {
  readonly id: 'a' | 'b';
  readonly name: string;
  readonly pitch: string;
  readonly why: readonly string[];
  readonly fonts: { readonly heading: string; readonly body: string; readonly mono: string };
  /** Base radius in rem; shadcn derives sm…4xl from it. */
  readonly radius: number;
  /** Map stroke width in px and station radius. */
  readonly stroke: number;
  readonly stationRadius: number;
  readonly palettes: Readonly<Record<ThemeName, Palette>>;
}

export const DIRECTIONS: readonly [Direction, Direction] = [
  {
    id: 'a',
    name: 'Wayfinding',
    pitch: 'Transit signage: high contrast, saturated lines, tight corners.',
    why: [
      'Reads like a real metro map, so the metaphor lands at a glance.',
      'Strong line colors keep three paths apart even when they run in parallel.',
      'Condensed headings fit long role names in a bottom bar and a 360px card.',
    ],
    fonts: { heading: 'Archivo', body: 'Inter', mono: 'JetBrains Mono' },
    radius: 0.25,
    stroke: 6,
    stationRadius: 7,
    palettes: {
      light: {
        background: '#f6f5f1',
        surface: '#ffffff',
        foreground: '#15171c',
        muted: '#535a66',
        border: '#d6d4cc',
        primary: '#15171c',
        onPrimary: '#ffffff',
        lines: ['#d1381f', '#1d5bbf', '#0b7f57'],
        success: '#0b7552',
        attention: '#9a5200',
        pending: '#868b95',
      },
      dark: {
        background: '#101216',
        surface: '#191c22',
        foreground: '#f2f1ec',
        muted: '#a4aab5',
        border: '#2e333c',
        primary: '#f2f1ec',
        onPrimary: '#15171c',
        lines: ['#ff6b4f', '#5c9cff', '#2fc48d'],
        success: '#4fd6a0',
        attention: '#ffb54d',
        pending: '#6c727e',
      },
    },
  },
  {
    id: 'b',
    name: 'Field notes',
    pitch: 'A hand-drawn map in a notebook: paper tones, ink lines, soft corners.',
    why: [
      'Feels personal and calm, which suits a long job search more than a dashboard.',
      'A characterful grotesque for headings keeps it personal without the formality of a serif.',
      'Muted inks leave color for status, so "needs your approval" stands out.',
    ],
    fonts: { heading: 'Bricolage Grotesque', body: 'Figtree', mono: 'IBM Plex Mono' },
    radius: 0.75,
    stroke: 4,
    stationRadius: 6,
    palettes: {
      light: {
        background: '#f3eee4',
        surface: '#fbf8f2',
        foreground: '#201c17',
        muted: '#5e564b',
        border: '#dbd1bf',
        primary: '#2d4a3e',
        onPrimary: '#fbf8f2',
        lines: ['#b0432c', '#2c6a8a', '#76549a'],
        success: '#2f6b3a',
        attention: '#94511a',
        pending: '#8c8273',
      },
      dark: {
        background: '#1a1814',
        surface: '#24211b',
        foreground: '#efe8da',
        muted: '#b3a994',
        border: '#3b362d',
        primary: '#a9d1bb',
        onPrimary: '#1a1814',
        lines: ['#ea8669', '#7bb4d2', '#b796da'],
        success: '#9bd3a6',
        attention: '#f0b07a',
        pending: '#7a7263',
      },
    },
  },
];
