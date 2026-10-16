import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from 'next/font/google';

// Direction B's typefaces (#105), self-hosted by next/font at build time. globals.css maps these
// variables to font-heading, font-sans and font-mono (#106).
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });
const data = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-data' });

export const fontVariables = [display, body, data].map((font) => font.variable).join(' ');
