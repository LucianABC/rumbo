import { deriveRoadmapView, type Profile } from '@rumbo/contracts';

import { MarketProvenance } from '../../../components/market-provenance';
import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { GapList } from '../../../components/skills/gap-list';
import { HaveList } from '../../../components/skills/have-list';
import { MarketSection } from '../../../components/skills/market-section';
import { getRoadmap, getRoadmapLayout, getSkillsData, getTargetColors } from '../../../lib/data';
import { lanesOf } from '../../../lib/roadmap/single-line';
import { marketProvenance } from '../../../lib/roadmap/summary';
import { gapCards, haveSkills, marketView, targetFilter } from '../../../lib/skills/skills-view';

export const metadata = tabMetadata('skills');

/**
 * Skills & gaps (docs/product/views.md, #111): the market across the top, then the gaps with the
 * numbers that justify them beside the skills the user has. Every target by default; `?target=`
 * narrows all three to one (the Roadmap summary band links here with it). Profile and market
 * degrade on their own; without a roadmap there is nothing to show, so its failure fails the
 * page, as on Roadmap.
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
  const selectedId = targetFilter(roadmap, (await searchParams).target);
  const now = new Date();
  const markets = market
    ? lanes
        .filter((lane) => selectedId === null || lane.target.id === selectedId)
        .flatMap((lane) => {
          const snapshot = market.snapshots.find((s) => s.targetId === lane.target.id);
          return snapshot ? [{ lane, view: marketView(snapshot, profile, roadmap.gaps, now) }] : [];
        })
    : null;
  const cards = gapCards(roadmap, view, lanes, selectedId);
  const skills = profile ? haveSkills(profile, market, lanes, selectedId) : null;
  const provenance = market ? marketProvenance(market) : null;

  return (
    <>
      <PageHeader
        title="Skills & gaps"
        provenance={provenance ? <MarketProvenance {...provenance} /> : null}
      />
      <p className="-mt-3 mb-3 max-w-prose text-sm text-muted-foreground">
        For each target, rumbo reads real postings for that role and region. The skills they ask for
        that your profile has no evidence for become gaps, and gaps several targets need rank
        higher.
      </p>
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
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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

/** Readable names for the profile entries evidence points at (#111). */
function sourceNames(profile: Profile): Record<string, string> {
  const entries: [string, string][] = [
    ...profile.experiences.map((e): [string, string] => [e.id, `${e.title} · ${e.organization}`]),
    ...profile.certifications.map((c): [string, string] => [
      c.id,
      c.issuer ? `${c.name} · ${c.issuer}` : c.name,
    ]),
  ];
  return Object.fromEntries(entries);
}
