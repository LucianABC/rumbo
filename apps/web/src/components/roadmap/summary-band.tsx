import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

import { ASKED_MIN_SHARE } from '../../lib/coverage';
import { LINE_BG } from '../../lib/line-colors';
import type { ProfileSummary } from '../../lib/profile-summary';
import { closingClause, sharedDetail, type TargetSummary } from '../../lib/roadmap/summary';

/**
 * Top of Roadmap (docs/product/views.md, #112): who the user is, their targets, and per target
 * how much of what its postings ask for most their evidence covers. One wide, low card that reads
 * as the page's header, one line per target (#148). The numbers link to Skills & gaps, which uses
 * the same definition (lib/coverage.ts).
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
    <div className="grid rounded-xl border bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Who who={who} />
      <section
        aria-labelledby="summary-goal"
        className="flex min-w-0 flex-col gap-2 border-t p-4 lg:border-t-0 lg:border-l"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="summary-goal" className={HEADING}>
            Your targets
          </h2>
          {changeTargets}
        </div>
        <ul role="list" className="flex flex-col gap-2">
          {targets.map((t) => (
            <TargetRow key={t.target.id} summary={t} />
          ))}
        </ul>
      </section>
    </div>
  );
}

const HEADING = 'text-xs font-semibold text-muted-foreground uppercase';

/** The band's state when the profile or market data is invalid; the map still renders. */
export function SummaryUnavailable() {
  return (
    <section
      aria-labelledby="summary-unavailable"
      className="rounded-xl border border-dashed bg-card p-4 text-sm"
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
  const years = who.yearsOfRelevantExperience;
  return (
    <section aria-labelledby="summary-who" className="flex min-w-0 flex-col gap-2 p-4">
      <h2 id="summary-who" className={HEADING}>
        Where you start
      </h2>
      <div className="min-w-0">
        <Link
          href="/profile"
          className="group inline-flex max-w-full items-center gap-1 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{who.name}</span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">, open profile</span>
        </Link>
        {who.currentRole ? (
          <p
            className="truncate text-sm text-muted-foreground"
            title={`${who.currentRole.title} · ${who.currentRole.organization}`}
          >
            {who.currentRole.title} · {who.currentRole.organization}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-sm whitespace-nowrap">
          <span className="font-mono font-semibold tabular-nums">{years}</span>{' '}
          {years === 1 ? 'year' : 'years'} relevant
        </p>
        <Skills who={who} />
      </div>
    </section>
  );
}

function Skills({ who }: { readonly who: ProfileSummary }) {
  return (
    <>
      {who.strongestSkills.length > 0 ? (
        <ul role="list" aria-label="Strongest skills" className="flex flex-wrap gap-1.5">
          {who.strongestSkills.map(({ skill, evidenceCount }) => (
            <li key={skill.id} className="max-w-full">
              {/* Badge never wraps; a long skill name must, or it overflows at 360px (#112). */}
              <Badge
                variant="secondary"
                className="h-auto min-h-5 max-w-full shrink flex-wrap justify-start gap-x-1.5 text-left whitespace-normal"
              >
                {skill.name}
                <span className="font-mono text-2xs whitespace-nowrap tabular-nums text-muted-foreground">
                  {evidenceCount} evidence
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/**
 * One line per target from `md`: name, coverage meter, numbers. Phones stack the numbers under
 * the name. Field and seniority sit in the name's tooltip to keep the line short (#148).
 */
function TargetRow({ summary: s }: { readonly summary: TargetSummary }) {
  const { target } = s;
  const meta = [target.roleFamily.field, target.seniority].filter(Boolean).join(' · ');
  const detail = sharedDetail(s);
  const detailId = `shared-detail-${target.id}`;

  return (
    <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 md:grid-cols-[minmax(0,15rem)_minmax(5rem,1fr)_auto]">
      <div className="flex min-w-0 items-center gap-2" title={meta || undefined}>
        <span aria-hidden className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[s.color])} />
        <h3 className={cn('truncate text-sm', target.isPrimary ? 'font-semibold' : 'font-medium')}>
          {target.roleFamily.name}
          {meta ? <span className="sr-only">, {meta}</span> : null}
        </h3>
        {target.isPrimary ? (
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-2xs">
            Primary
          </Badge>
        ) : null}
      </div>
      {s.asked > 0 ? (
        <>
          <Meter summary={s} />
          <p className="relative col-span-2 text-sm text-muted-foreground md:col-span-1 md:text-right">
            {/* Every number in the line links to Skills & gaps, not just the first (#112). */}
            <Link
              href={s.href}
              className={cn(LINK, 'peer/link')}
              title={detail ?? undefined}
              aria-describedby={detail ? detailId : undefined}
            >
              <span className="font-mono font-semibold tabular-nums">
                {s.covered}/{s.asked}
              </span>{' '}
              top skills · {closingClause(s)}
            </Link>
            {/* The title only reaches mouse users. Screen readers get the detail once, as the
                link's description (it outranks the title), and keyboard users see it on focus,
                floating so the band does not grow and push the page down (#148). */}
            {detail ? (
              <span
                id={detailId}
                role="tooltip"
                className="invisible absolute top-full left-0 z-10 mt-1 w-max max-w-xs rounded-md border bg-popover px-2 py-1 text-left text-xs text-popover-foreground shadow-sm peer-focus-visible/link:visible md:right-0 md:left-auto"
              >
                {detail}
              </span>
            ) : null}
          </p>
        </>
      ) : (
        // Without this, a thin snapshot would read "0 of 0, nothing to close": fully covered (#112).
        <p className="col-span-2 text-sm text-muted-foreground md:text-right">
          <Link
            href={s.href}
            className={LINK}
            title={`No skill appears in ${String(Math.round(ASKED_MIN_SHARE * 100))}% of its ${String(s.postings)} postings`}
          >
            Not enough market data yet
          </Link>
          <span className="sr-only">
            : no skill appears in {Math.round(ASKED_MIN_SHARE * 100)}% of its {s.postings} postings
          </span>
        </p>
      )}
    </li>
  );
}

const LINK =
  'rounded-sm text-foreground underline decoration-muted-foreground/60 underline-offset-4 outline-none hover:text-primary hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring';

/**
 * One segment per skill asked for most, filled where covered. Hidden from assistive tech: the
 * numbers beside it say the same, and announcing both read it twice.
 */
function Meter({ summary: s }: { readonly summary: TargetSummary }) {
  return (
    <div
      aria-hidden
      className="col-start-2 row-start-1 flex h-1.5 w-24 gap-0.5 md:col-start-auto md:row-start-auto md:w-auto"
    >
      {Array.from({ length: s.asked }, (_, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-full', i < s.covered ? LINE_BG[s.color] : 'bg-muted')}
        />
      ))}
    </div>
  );
}
