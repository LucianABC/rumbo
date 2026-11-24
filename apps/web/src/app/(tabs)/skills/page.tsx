import { MarketProvenance } from '../../../components/market-provenance';
import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { SkillsTab } from '../../../components/skills/skills-tab';
import { getMarketOrNull, getRoadmap } from '../../../lib/data';
import { marketProvenance } from '../../../lib/roadmap/summary';

export const metadata = tabMetadata('skills');

/**
 * Skills & gaps (docs/product/views.md, #111): the market across the top, then the gaps with the
 * numbers that justify them beside the skills the user has. The plan and the profile come from
 * the store the tabs layout hydrates (#168); this page reads only the URL and the market, which
 * degrades on its own.
 */
export default async function SkillsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ target?: string | string[] }>;
}) {
  const [market, params] = await Promise.all([getRoadmap().then(getMarketOrNull), searchParams]);
  const provenance = market ? marketProvenance(market) : null;

  return (
    <>
      <PageHeader
        title="Skills & gaps"
        provenance={provenance ? <MarketProvenance {...provenance} /> : null}
      />
      <p className="-mt-3 mb-3 max-w-3xl text-sm text-muted-foreground">
        For each target, rumbo reads real postings for that role and region. The skills they ask for
        that your profile has no evidence for become gaps, and gaps several targets need rank
        higher.
      </p>
      <SkillsTab target={params.target} market={market} now={new Date().toISOString()} />
    </>
  );
}
