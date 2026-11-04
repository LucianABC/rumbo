import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** One card of the Profile tab (#113). */
export function CvSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="min-w-0 rounded-xl border bg-card p-4 md:p-5"
    >
      <h2
        id={`${id}-heading`}
        className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary uppercase"
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-md bg-chart-1/15 text-chart-1"
        >
          <Icon className="size-3.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
