import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

import { LINE_BG } from '../../lib/line-colors';
import type { ProfileSummary } from '../../lib/profile-summary';
import { closingClause, type TargetSummary } from '../../lib/roadmap/summary';

/**
 * Top of Roadmap (docs/product/views.md, #112): who the user is, their targets, and per target
 * how much of what its postings ask for most their evidence covers. The numbers link to Skills &
 * gaps, which uses the same definition (lib/coverage.ts).
 */
export function SummaryBand({
  who,
  targets,
  changeTargets,
}: {
  readonly who: ProfileSummary;
  readonly targets: readonly TargetSummary[];
  /** The Change targets control; a client component, so the band stays on the server. */
  readonly changeTargets: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Who who={who} />
      <section
        aria-labelledby="summary-goal"
        className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 md:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="summary-goal" className="text-xs font-semibold text-muted-foreground uppercase">
            Your targets
          </h2>
          {changeTargets}
        </div>
        <ul role="list" className="flex flex-col gap-4">
          {targets.map((t) => (
            <TargetRow key={t.target.id} summary={t} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Who({ who }: { readonly who: ProfileSummary }) {
  return (
    <section
      aria-labelledby="summary-who"
      className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 md:p-5"
    >
      <h2 id="summary-who" className="text-xs font-semibold text-muted-foreground uppercase">
        Where you start
      </h2>
      <div className="min-w-0">
        <Link
          href="/profile"
          className="group inline-flex max-w-full items-center gap-1 rounded-sm text-lg font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{who.name}</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">, open profile</span>
        </Link>
        {who.currentRole ? (
          <p className="text-sm text-muted-foreground">
            {who.currentRole.title} · {who.currentRole.organization}
          </p>
        ) : null}
      </div>
      <p className="text-sm">
        <span className="font-mono text-base font-semibold tabular-nums">
          {who.yearsOfRelevantExperience}
        </span>{' '}
        {who.yearsOfRelevantExperience === 1 ? 'year' : 'years'} of relevant experience
      </p>
      {who.strongestSkills.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs text-muted-foreground">Strongest skills</h3>
          <ul role="list" className="flex flex-wrap gap-2">
            {who.strongestSkills.map(({ skill, evidenceCount }) => (
              <li key={skill.id}>
                <Badge variant="secondary" className="h-6 gap-1.5">
                  {skill.name}
                  <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                    {evidenceCount} evidence
                  </span>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function TargetRow({ summary: s }: { readonly summary: TargetSummary }) {
  const { target } = s;
  const meta = [target.roleFamily.field, target.seniority].filter(Boolean).join(' · ');

  return (
    <li className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden className={cn('h-1 w-5 shrink-0 rounded-full', LINE_BG[s.color])} />
        <h3 className={cn('text-sm', target.isPrimary ? 'font-semibold' : 'font-medium')}>
          {target.roleFamily.name}
        </h3>
        {target.isPrimary ? (
          <Badge variant="outline" className="h-5 text-2xs">
            Primary
          </Badge>
        ) : null}
        {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
      </div>
      <Meter summary={s} />
      <p className="text-sm text-muted-foreground">
        You cover{' '}
        <Link
          href={s.href}
          className="rounded-sm font-mono font-semibold text-foreground tabular-nums underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {s.covered} of {s.asked}
          <span className="sr-only"> {target.roleFamily.name} skills, see Skills &amp; gaps</span>
        </Link>{' '}
        skills its postings ask for most; {closingClause(s)}
      </p>
    </li>
  );
}

/** One segment per skill asked for most, filled where covered: data, not decoration. */
function Meter({ summary: s }: { readonly summary: TargetSummary }) {
  return (
    <div role="img" aria-label={s.label} className="flex h-2 gap-0.5">
      {Array.from({ length: s.asked }, (_, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-full', i < s.covered ? LINE_BG[s.color] : 'bg-muted')}
        />
      ))}
    </div>
  );
}
