import type { Metadata } from 'next';

import { DirectionPanel } from './direction-panel';
import { DIRECTIONS } from './directions';
import { fontVariables } from './fonts';

export const metadata: Metadata = { title: 'Tokens · rumbo' };

/**
 * M1: two visual directions side by side, each in light and dark, for the owner to pick one
 * (spec 01, #105). The pick moves into `@theme` in #106.
 */
export default function TokensPage() {
  return (
    <main className={`${fontVariables} mx-auto max-w-7xl space-y-6 p-4 sm:p-6`}>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Two directions</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          Same content, same components. Every contrast ratio is measured from the token values;
          lines and pending stations need 3:1 against the map background, text needs 4.5:1.
        </p>
        <p className="text-sm font-medium">
          Picked on 16 Oct 2026: B · Field notes, with Bricolage Grotesque headings (#105).
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        {DIRECTIONS.map((direction) => (
          <article
            key={direction.id}
            aria-labelledby={`direction-${direction.id}`}
            // Subgrid rows line up both directions' light and dark panels side by side.
            className="grid gap-4 lg:row-span-3 lg:grid-rows-subgrid"
          >
            <header className="space-y-2">
              <h2 id={`direction-${direction.id}`} className="text-xl font-semibold">
                {direction.id.toUpperCase()} · {direction.name}
              </h2>
              <p className="text-sm">{direction.pitch}</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                {direction.why.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </header>
            <DirectionPanel direction={direction} theme="light" />
            <DirectionPanel direction={direction} theme="dark" />
          </article>
        ))}
      </div>
    </main>
  );
}
