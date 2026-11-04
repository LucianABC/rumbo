import type { Profile } from '@rumbo/contracts';
import { cn } from 'cn';
import {
  Briefcase,
  ExternalLink,
  GraduationCap,
  Languages,
  ListChecks,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

import { formatPartialDate } from '../../lib/format';
import { evidenceStatusLabel } from '../../lib/labels';
import {
  educationPeriod,
  initials,
  LANGUAGE_LEVEL_LABEL,
  type SkillRow,
  skillGroups,
  timeline,
} from '../../lib/profile/profile-view';
import { LINK } from '../skills/shared';
import { CvSection } from './cv-section';

/**
 * The profile presented as a good CV (docs/product/views.md, #113): side by side, so it reads in
 * about one screen on a desktop instead of a long scroll.
 */
export function ProfileCv({ profile, now }: { readonly profile: Profile; readonly now: Date }) {
  const positions = timeline(profile.experiences, now);
  const groups = skillGroups(profile.skills);
  return (
    <article aria-label="Your profile" className="flex min-w-0 flex-col gap-4">
      <header className="grid gap-x-8 gap-y-3 rounded-xl border border-chart-1/30 bg-chart-1/15 p-4 md:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            {initials(profile.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">{profile.name}</h2>
            <p>{profile.headline}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {profile.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5 text-chart-1" />
                  {profile.location}
                </span>
              ) : null}
              {profile.linkedinUrl ? (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(LINK, 'inline-flex items-center gap-1.5')}
                >
                  <ExternalLink aria-hidden className="size-3.5 text-chart-1" />
                  LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {profile.about ? <p className="text-sm">{profile.about}</p> : null}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CvSection id="experience" title="Experience" icon={Briefcase}>
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No positions in your profile yet.</p>
          ) : (
            <ol role="list" className="flex flex-col gap-5">
              {positions.map((position) => (
                <li key={position.id} className="relative border-l-2 border-chart-1/40 pl-4">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1.5 -left-[5px] size-2 rounded-full',
                      position.end === null ? 'bg-chart-1' : 'bg-chart-1/50',
                    )}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                      {position.title}
                      {position.end === null ? (
                        <span className="rounded-full bg-success/15 px-2 text-2xs font-medium text-success">
                          Current
                        </span>
                      ) : null}
                    </h3>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {position.period}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {position.organization}
                    {position.location ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · {position.location}
                      </span>
                    ) : null}
                  </p>
                  {position.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{position.summary}</p>
                  ) : null}
                  {position.highlights.length > 0 ? (
                    <ul className="mt-2 flex list-outside list-disc flex-col gap-1 pl-4 text-sm marker:text-chart-1">
                      {position.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CvSection>

        <div className="flex min-w-0 flex-col gap-4">
          <CvSection id="skills" title="Skills" icon={ListChecks}>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills in your profile yet.</p>
            ) : (
              <>
                <dl className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  {groups.map(([category, rows]) => (
                    <div key={category} className="contents">
                      <dt className="font-medium text-primary">{category}</dt>
                      <dd>
                        <ul role="list" className="flex flex-wrap gap-x-4 gap-y-1">
                          {rows.map((row) => (
                            <SkillLine key={row.skill.id} row={row} />
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Each filled dot is approved evidence; a hollow one awaits your approval.{' '}
                  <Link href="/skills#skills-you-have" className={LINK}>
                    See it in Skills &amp; gaps
                  </Link>
                </p>
              </>
            )}
          </CvSection>

          {profile.education.length + profile.certifications.length > 0 ? (
            <CvSection id="education" title="Education and certifications" icon={GraduationCap}>
              <ul role="list" className="flex flex-col gap-3 text-sm">
                {profile.education.map((entry) => {
                  const period = educationPeriod(entry.start, entry.end);
                  return (
                    <Credential
                      key={entry.id}
                      title={entry.credential}
                      from={entry.institution}
                      date={period}
                    />
                  );
                })}
                {profile.certifications.map((entry) => (
                  <Credential
                    key={entry.id}
                    title={entry.name}
                    from={entry.issuer}
                    date={entry.issuedAt ? formatPartialDate(entry.issuedAt) : null}
                  />
                ))}
              </ul>
            </CvSection>
          ) : null}

          {profile.languages.length > 0 ? (
            <CvSection id="languages" title="Languages" icon={Languages}>
              <ul role="list" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {profile.languages.map((language) => (
                  <li key={language.name}>
                    <span className="font-semibold">{language.name}</span>{' '}
                    <span className="text-muted-foreground">
                      {LANGUAGE_LEVEL_LABEL[language.level]}
                    </span>
                  </li>
                ))}
              </ul>
            </CvSection>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Credential({
  title,
  from,
  date,
}: {
  readonly title: string;
  readonly from?: string | undefined;
  readonly date: string | null;
}) {
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="font-semibold">{title}</h3>
        {date ? (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">{date}</p>
        ) : null}
      </div>
      {from ? <p>{from}</p> : null}
    </li>
  );
}

/** Past this many dots a row stops being a glance; the rest is a number. */
const MAX_DOTS = 4;

function SkillLine({ row: { skill, approved, awaiting } }: { readonly row: SkillRow }) {
  const filled = Math.min(approved, MAX_DOTS);
  const hollow = Math.min(awaiting, MAX_DOTS - filled);
  const more = approved + awaiting - filled - hollow;
  return (
    <li className="inline-flex items-center gap-1.5">
      {skill.skill.name}
      <span aria-hidden className="inline-flex items-center gap-0.5">
        {Array.from({ length: filled }, (_, i) => (
          <span key={`filled-${String(i)}`} className="size-1.5 rounded-full bg-chart-1" />
        ))}
        {Array.from({ length: hollow }, (_, i) => (
          <span
            key={`hollow-${String(i)}`}
            className="size-1.5 rounded-full border border-attention"
          />
        ))}
        {more > 0 ? (
          <span className="ml-0.5 font-mono text-2xs text-muted-foreground tabular-nums">
            +{more}
          </span>
        ) : null}
      </span>
      <span className="sr-only">
        {approved} approved evidence
        {awaiting > 0 ? `, ${String(awaiting)} ${evidenceStatusLabel(null)}` : ''}
      </span>
    </li>
  );
}
