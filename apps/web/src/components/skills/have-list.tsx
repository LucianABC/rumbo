import { cn } from 'cn';

import { formatShare } from '../../lib/format';
import { LINE_BG } from '../../lib/line-colors';
import type { HaveSkill } from '../../lib/skills/skills-view';
import { Evidence } from '../roadmap/station-detail';
import { HEADING, Unavailable } from './shared';

/**
 * The skills the user has (docs/product/views.md, #111): each with its evidence and how often the
 * targets' postings ask for it. Evidence awaiting approval is shown but does not count yet.
 */
export function HaveList({
  skills,
  experienceNames,
  marketAvailable,
}: {
  /** Null when the profile could not be read. */
  readonly skills: readonly HaveSkill[] | null;
  readonly experienceNames: Readonly<Record<string, string>>;
  readonly marketAvailable: boolean;
}) {
  return (
    <section
      id="skills-you-have"
      aria-labelledby="have-heading"
      className="@container flex min-w-0 scroll-mt-20 flex-col gap-3"
    >
      <h2 id="have-heading" className={HEADING}>
        Skills you have
        {skills ? <span className="font-mono tabular-nums"> ({skills.length})</span> : null}
      </h2>
      {skills === null ? (
        <Unavailable title="Profile unavailable">
          Your profile could not be read, so your skills and their evidence are not shown.
        </Unavailable>
      ) : skills.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          No skills in your profile yet.
        </p>
      ) : (
        <ul role="list" className="grid gap-3 @2xl:grid-cols-2">
          {skills.map((s) => (
            <li
              key={s.skill.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div>
                <h3 className="font-semibold break-words">{s.skill.skill.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {s.skill.category}
                  {s.approved === 0 ? ' · not counted until you approve its evidence' : null}
                </p>
              </div>
              {marketAvailable ? <Demand skill={s} /> : null}
              <Evidence evidence={s.skill.evidence} experienceNames={experienceNames} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Demand({ skill: { demand } }: { readonly skill: HaveSkill }) {
  if (!demand || demand.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your targets&apos; postings don&apos;t list it.
      </p>
    );
  }
  return (
    <ul role="list" aria-label="Market demand" className="flex flex-col gap-1 text-sm">
      {demand.map((d) => (
        <li key={d.lane.target.id} className="flex items-center gap-2 text-muted-foreground">
          <span
            aria-hidden
            className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[d.lane.color])}
          />
          <span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatShare(d.share)}
            </span>{' '}
            of {d.lane.target.roleFamily.name} postings
          </span>
        </li>
      ))}
    </ul>
  );
}
