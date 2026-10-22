import type { ReactNode } from 'react';

/** Every tab opens with its title, then one line saying where its data comes from (views.md). */
export function PageHeader({
  title,
  provenance,
}: {
  readonly title: string;
  readonly provenance?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {provenance ? <p className="mt-1 text-sm text-muted-foreground">{provenance}</p> : null}
    </header>
  );
}
