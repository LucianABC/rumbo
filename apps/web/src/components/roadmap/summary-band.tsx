import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

import { ASKED_MIN_SHARE } from '../../lib/coverage';
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

/** The band's state when the profile or market data is invalid; the map still renders. */
export function SummaryUnavailable() {
  return (
    <section
      aria-labelledby="summary-unavailable"
      className="rounded-xl border border-dashed bg-card p-4 text-sm md:p-5"
    >
      <h2 id="summary-unavailable" className="font-semibold">
        Summary unavailable
      </h2>
      <p className="mt-1 text-muted-foreground">
        Your profile or market data could not be read or does not match this roadmap, so coverage is
        not shown. The plan below is unaffected.
      </p>
    </section>
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
                {/* Badge never wraps; a long skill name must, or it overflows at 360px (#112). */}
                <Badge
                  variant="secondary"
                  className="h-auto min-h-6 max-w-full shrink flex-wrap justify-start gap-x-1.5 text-left whitespace-normal"
                >
                  {skill.name}
                  <span className="font-mono text-2xs whitespace-nowrap tabular-nums text-muted-foreground">
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
      {s.asked > 0 ? (
        <>
          <Meter summary={s} />
          <p className="text-sm text-muted-foreground">
            You cover{' '}
            {/* Every number in the sentence links to Skills & gaps, not just the first (#112). */}
            <Link href={s.href} className={LINK}>
              <span className="font-semibold">
                {s.covered} of {s.asked} skills
              </span>{' '}
              its postings ask for most; {closingClause(s)}
            </Link>
          </p>
        </>
      ) : (
        // Without this, a thin snapshot would read "0 of 0, nothing to close": fully covered (#112).
        <p className="text-sm text-muted-foreground">
          Not enough market data yet: no skill appears in {Math.round(ASKED_MIN_SHARE * 100)}% of
          its {s.postings} postings ·{' '}
          <Link href={s.href} className={LINK}>
            see Skills &amp; gaps
          </Link>
        </p>
      )}
    </li>
  );
}

const LINK =
  'rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring';

/**
 * One segment per skill asked for most, filled where covered. Hidden from assistive tech: the
 * sentence below says the same, and announcing both read it twice.
 */
function Meter({ summary: s }: { readonly summary: TargetSummary }) {
  return (
    <div aria-hidden className="flex h-2 gap-0.5">
      {Array.from({ length: s.asked }, (_, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-full', i < s.covered ? LINE_BG[s.color] : 'bg-muted')}
        />
      ))}
    </div>
  );
}
