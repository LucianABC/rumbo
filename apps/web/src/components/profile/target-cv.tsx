'use client';

import type { Profile } from '@rumbo/contracts';
import type { TailoredCv } from '@rumbo/contracts/provisional';
import { Download, FileText, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { formatDay } from '../../lib/format';
import type { Lane } from '../../lib/roadmap/single-line';
import { applyCv, cvChanges, cvOutdated } from '../../lib/profile/tailored-cv';
import type { CvChange, CvEntryChange } from '../../lib/profile/tailored-cv.types';
import { Added, Removed } from '../diff';
import { LINK, Unavailable } from '../skills/shared';
import { Button } from '../ui/button';
import { CvSection } from './cv-section';
import { ProfileCv } from './profile-cv';

/** What a click on a control the demo cannot run yet says (docs/product/views.md, #191). */
const F4 = 'arrives with Drafting (F4)';

/**
 * One target's sub-tab on Profile (docs/product/views.md, Profile, CV per target, #191): the CV
 * written for that target, laid out as a CV, or the way to generate it. Facts are edited in Base
 * only, so the CVs never contradict each other. Generating and downloading are samples: they
 * render, and say when they arrive.
 */
export function TargetCv({
  lane,
  cv,
  unavailable,
  imported,
  current,
  now,
}: {
  readonly lane: Lane;
  /** Null while this target has no CV yet. */
  readonly cv: TailoredCv | null;
  /** The CVs could not be read: unlike "none yet", nothing can be said about this one. */
  readonly unavailable: boolean;
  /** The profile as loaded, before this visit's edits. */
  readonly imported: Profile;
  /** The profile as the user last saved it, which is Base. */
  readonly current: Profile;
  readonly now: Date;
}) {
  const name = lane.target.roleFamily.name;
  const [showChanges, setShowChanges] = useState(false);
  // One line for every sample control, so a message never shifts the buttons around it.
  const [notice, setNotice] = useState<string | null>(null);

  if (unavailable) {
    return (
      <Unavailable title="CV unavailable">
        It could not be read, or it claims something your profile does not hold. Base still has your
        whole profile.
      </Unavailable>
    );
  }

  if (!cv) {
    return (
      <section
        aria-labelledby="cv-empty-title"
        className="flex max-w-2xl flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-6"
      >
        <FileText aria-hidden className="size-6 text-chart-1" />
        <h2 id="cv-empty-title" className="text-lg font-semibold">
          No CV for {name} yet
        </h2>
        <p className="text-sm text-muted-foreground">
          rumbo writes it from your profile for this target&apos;s market, without claiming anything
          your profile lacks. You review it once and it is saved, so downloading it again costs
          nothing.
        </p>
        <Sample
          label="Generate CV for this target"
          icon={<Sparkles aria-hidden />}
          variant="default"
          onClick={() => {
            setNotice(`Not available yet: generating ${F4}.`);
          }}
        />
        <Notice text={notice} />
      </section>
    );
  }

  const outdated = cvOutdated(cv, imported, current);
  const changes = cvChanges(current, cv);
  return (
    <div className="flex flex-col gap-4">
      {/* Above the CV, so opening the changes never moves the controls away from the user. */}
      <div
        role="toolbar"
        aria-label="CV actions"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <Sample
          label="Download PDF"
          icon={<Download aria-hidden />}
          variant="default"
          onClick={() => {
            setNotice(`Not available yet: downloading ${F4}.`);
          }}
        />
        <Sample
          label="Download DOCX"
          icon={<Download aria-hidden />}
          onClick={() => {
            setNotice(`Not available yet: downloading ${F4}.`);
          }}
        />
        <Button
          type="button"
          variant="outline"
          aria-expanded={showChanges}
          aria-controls="changes-from-base"
          onClick={() => {
            setShowChanges((shown) => !shown);
          }}
        >
          {showChanges ? 'Hide changes from Base' : 'Show changes from Base'}
          <span className="text-muted-foreground">({changes.length})</span>
        </Button>
        {outdated ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:ml-auto">
            <p className="max-w-sm text-sm">
              <span className="font-semibold text-attention">Out of date.</span> Your profile
              changed after this CV was written. It still downloads, with a warning.
            </p>
            <Sample
              label="Regenerate"
              icon={<RefreshCw aria-hidden />}
              onClick={() => {
                setNotice(`Not available yet: regenerating ${F4}.`);
              }}
            />
          </div>
        ) : null}
        <Notice text={notice} />
      </div>
      {showChanges ? <ChangesFromBase changes={changes} /> : null}
      <ProfileCv
        profile={applyCv(current, cv)}
        analysis={null}
        label={`Your CV for ${name}`}
        now={now}
        reading={
          <aside
            aria-label="About this CV"
            className="flex min-w-0 flex-col gap-2 border-l-2 border-chart-1/50 pl-4 text-sm"
          >
            <p className="text-2xs font-medium text-muted-foreground uppercase">
              Written for {name} · {formatDay(cv.generatedAt)}
            </p>
            <p>
              This CV only picks and rewords what your profile holds, for this target&apos;s market.
            </p>
            <p className="text-muted-foreground">
              Something wrong, like a date or a title?{' '}
              <Link href="/profile" className={LINK}>
                Fix it in Base
              </Link>
              , and every CV follows.
            </p>
          </aside>
        }
      />
    </div>
  );
}

/** What this CV changes from Base, in words and signs, never color alone (#191). */
function ChangesFromBase({ changes }: { readonly changes: readonly CvChange[] }) {
  return (
    <CvSection id="changes-from-base" title="Changes from Base" icon={FileText}>
      {changes.length === 0 ? (
        <p className="text-sm text-muted-foreground">This CV says the same as Base.</p>
      ) : (
        <ul role="list" className="grid gap-4 text-sm lg:grid-cols-2">
          {changes.map((change) => (
            <li key={changeKey(change)} className="flex min-w-0 flex-col gap-2">
              <ChangeDetail change={change} />
            </li>
          ))}
        </ul>
      )}
    </CvSection>
  );
}

function changeKey(change: CvChange): string {
  return change.section === 'position' ? `position-${change.experienceId}` : change.section;
}

function ChangeDetail({ change }: { readonly change: CvChange }) {
  switch (change.section) {
    case 'headline':
    case 'about':
      return (
        <>
          <h3 className="font-semibold">{change.section === 'headline' ? 'Headline' : 'About'}</h3>
          {change.before ? <Removed text={change.before} /> : null}
          {change.after ? <Added text={change.after} /> : null}
        </>
      );
    case 'position':
      return (
        <>
          <h3 className="font-semibold">{change.title}</h3>
          {change.status === 'omitted' ? (
            <p className="text-muted-foreground">Left out of this CV.</p>
          ) : null}
          {change.status === 'notInBase' ? (
            <p className="text-attention">No longer in Base. Regenerate to drop it.</p>
          ) : null}
          {change.status === 'changedInBase' ? (
            <p className="text-attention">
              Base changed its details since this CV was written. Regenerate to update it.
            </p>
          ) : null}
          {change.removed.map((text) => (
            <Removed key={`removed-${text}`} text={text} />
          ))}
          {change.added.map((text) => (
            <Added key={`added-${text}`} text={text} />
          ))}
        </>
      );
    case 'skills':
    case 'education':
    case 'certifications':
      return <EntryChangeDetail change={change} />;
  }
}

const ENTRY_TITLES: Record<CvEntryChange['section'], string> = {
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
};

function EntryChangeDetail({ change }: { readonly change: CvEntryChange }) {
  const rows: [string, readonly string[], boolean][] = [
    ['Left out of this CV: ', change.omitted, false],
    ['No longer in Base: ', change.notInBase, true],
    ['Changed in Base since: ', change.changedInBase, true],
  ];
  return (
    <>
      <h3 className="font-semibold">{ENTRY_TITLES[change.section]}</h3>
      {rows
        .filter(([, names]) => names.length > 0)
        .map(([label, names, stale]) => (
          <p key={label}>
            <span className={stale ? 'text-attention' : 'text-muted-foreground'}>{label}</span>
            {names.join(', ')}
          </p>
        ))}
    </>
  );
}

/** A control the demo renders but cannot run: a click says when it arrives (#191). */
function Sample({
  label,
  icon,
  variant = 'outline',
  onClick,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly variant?: 'default' | 'outline';
  readonly onClick: () => void;
}) {
  return (
    <Button type="button" variant={variant} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

/** Always in the page, so screen readers announce what a sample control says. */
function Notice({ text }: { readonly text: string | null }) {
  return (
    <p role="status" className="w-full text-xs text-muted-foreground">
      {text}
    </p>
  );
}
