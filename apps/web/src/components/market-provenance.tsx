import Link from 'next/link';

import { formatDay } from '../lib/format';
import { MarketRefresh } from './market-refresh';

/**
 * The page header's provenance line for tabs built on market data (views.md, "Page header"):
 * how many postings, when they were checked, where they come from, and a way to check again.
 */
export function MarketProvenance({
  postings,
  checkedAt,
}: {
  readonly postings: number;
  readonly checkedAt: string;
}) {
  return (
    <>
      Market data from {postings} postings, checked {formatDay(checkedAt)} ·{' '}
      <Link href="/sources" className="underline underline-offset-4 hover:text-foreground">
        see Sources
      </Link>{' '}
      <MarketRefresh />
    </>
  );
}
