import { deriveRoadmapView } from '@rumbo/contracts';
import Link from 'next/link';

import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { GapList } from '../../../components/skills/gap-list';
import { HaveList } from '../../../components/skills/have-list';
import { MarketSection } from '../../../components/skills/market-section';
import { getRoadmap, getRoadmapLayout, getSkillsData, getTargetColors } from '../../../lib/data';
import { formatDay } from '../../../lib/format';
import { lanesOf } from '../../../lib/roadmap/single-line';
import { marketProvenance } from '../../../lib/roadmap/summary';
import { gapCards, haveSkills, marketTargetId, marketView } from '../../../lib/skills/skills-view';

export const metadata = tabMetadata('skills');

/**
 * Skills & gaps (docs/product/views.md, #111): one target's market, chosen with `?target=` (the
 * Roadmap summary band links here with it), every gap with the numbers that justify it, and the
 * skills the user has. Profile and market degrade on their own; without a roadmap there is
 * nothing to show, so its failure fails the page, as on Roadmap.
 */
export default async function SkillsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ target?: string | string[] }>;
}) {
  const roadmap = await getRoadmap();
  const [layout, { profile, market }] = await Promise.all([
    getRoadmapLayout(roadmap),
    getSkillsData(roadmap),
  ]);
  const lanes = lanesOf(roadmap, getTargetColors(roadmap, layout));
  const view = deriveRoadmapView(roadmap);
  const selectedId = marketTargetId(roadmap, (await searchParams).target);
  const snapshot = market?.snapshots.find((s) => s.targetId === selectedId);
  const provenance = market ? marketProvenance(market) : null;

  return (
    <>
      <PageHeader
        title="Skills & gaps"
        provenance={
          provenance ? (
            <>
              Market data from {provenance.postings} postings, checked{' '}
              {formatDay(provenance.checkedAt)} ·{' '}
              <Link href="/sources" className="underline underline-offset-4 hover:text-foreground">
                see Sources
              </Link>
            </>
          ) : null
        }
      />
      <p className="-mt-3 mb-6 max-w-prose text-sm text-muted-foreground">
        For each target, rumbo reads real postings for that role and region. The skills they ask for
        that your profile has no evidence for become gaps, and gaps several targets need rank
        higher.
      </p>
      <div className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <MarketSection
            lanes={lanes}
            selectedId={selectedId}
            market={snapshot ? marketView(snapshot, profile, roadmap.gaps, new Date()) : null}
          />
          <GapList cards={gapCards(roadmap, view, lanes, selectedId)} />
        </div>
        <HaveList
          skills={profile ? haveSkills(profile, market, lanes) : null}
          experienceNames={Object.fromEntries(
            (profile?.experiences ?? []).map((e) => [e.id, `${e.title} · ${e.organization}`]),
          )}
          marketAvailable={market !== null}
        />
      </div>
    </>
  );
}
