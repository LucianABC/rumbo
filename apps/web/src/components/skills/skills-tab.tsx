'use client';

import type { Market } from '@rumbo/contracts/provisional';
import { useMemo } from 'react';

import { sourceNames } from '../../lib/profile/profile-view';
import { gapCards, haveSkills, marketView, targetFilter } from '../../lib/skills/skills-view';
import { usePlan, useProfile } from '../../lib/store';
import { GapList } from './gap-list';
import { HaveList } from './have-list';
import { MarketSection } from './market-section';

/**
 * Skills & gaps from the store (#168): the gaps read the decided plan and the skills the profile
 * the user edits, so both match Roadmap and Profile. Every target by default; `?target=` narrows
 * all three sections to one (the Roadmap summary band links here with it).
 */
export function SkillsTab({
  target,
  market,
  now: nowIso,
}: {
  readonly target: string | string[] | undefined;
  /** Null when it cannot be read: only the market and its numbers degrade (#111). */
  readonly market: Market | null;
  /** The request's time, so the server and the browser judge staleness the same (ISO). */
  readonly now: string;
}) {
  const { roadmap, view, lanes } = usePlan();
  const profile = useProfile();
  const selectedId = targetFilter(roadmap, target);
  const markets = useMemo(() => {
    if (!market) return null;
    const now = new Date(nowIso);
    return lanes
      .filter((lane) => selectedId === null || lane.target.id === selectedId)
      .flatMap((lane) => {
        const snapshot = market.snapshots.find((s) => s.targetId === lane.target.id);
        return snapshot ? [{ lane, view: marketView(snapshot, profile, roadmap.gaps, now) }] : [];
      });
  }, [market, nowIso, lanes, selectedId, profile, roadmap.gaps]);
  const cards = gapCards(roadmap, view, lanes, selectedId);
  const skills = profile ? haveSkills(profile, market, lanes, selectedId) : null;

  return (
    <>
      {/* Gaps can run long; this keeps the skills one tap away, on phones above all (#111). */}
      <nav aria-label="On this page" className="mb-6 text-sm">
        <ul role="list" className="flex flex-wrap gap-x-4 gap-y-1">
          {[
            ['#market', 'Market'],
            ['#gaps', `Gaps (${String(cards.length)})`],
            [
              '#skills-you-have',
              skills ? `Skills you have (${String(skills.length)})` : 'Skills you have',
            ],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="rounded-sm text-muted-foreground underline decoration-muted-foreground/60 underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-8">
        <MarketSection lanes={lanes} selectedId={selectedId} markets={markets} />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <GapList cards={cards} />
          <HaveList
            skills={skills}
            sourceNames={profile ? sourceNames(profile) : {}}
            marketAvailable={market !== null}
          />
        </div>
      </div>
    </>
  );
}
