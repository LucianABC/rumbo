import type { ReactNode } from 'react';

/** Every tab opens with its title, then one line saying where its data comes from (views.md). */
export function PageHeader({
  title,
  provenance,
  action,
}: {
  readonly title: string;
  readonly provenance?: ReactNode;
  /** Something to do from here, beside the title (#113). */
  readonly action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {provenance ? <p className="mt-1 text-sm text-muted-foreground">{provenance}</p> : null}
      </div>
      {action}
    </header>
  );
}
