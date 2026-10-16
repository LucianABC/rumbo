import {
  Archivo,
  Bricolage_Grotesque,
  Figtree,
  IBM_Plex_Mono,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';

// Both directions' typefaces, self-hosted by next/font at build time and loaded only on /tokens.
// #106 keeps the chosen pair in the root layout and drops the rest.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-a-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-a-body' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-a-mono' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-b-heading' });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-b-body' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-b-mono',
});

export const fontVariables = [archivo, inter, jetbrains, bricolage, figtree, plexMono]
  .map((font) => font.variable)
  .join(' ');
