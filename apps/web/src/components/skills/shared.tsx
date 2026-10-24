import type { ReactNode } from 'react';

/** Section headings on Skills & gaps, like the Roadmap summary band's (#111). */
export const HEADING = 'text-xs font-semibold text-muted-foreground uppercase';

export const LINK =
  'rounded-sm underline decoration-muted-foreground/60 underline-offset-4 outline-none hover:text-primary hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring';

/** A section whose data could not be read: the rest of the tab still renders (#111). */
export function Unavailable({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div role="status" className="rounded-xl border border-dashed bg-card p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </div>
  );
}
