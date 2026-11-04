const PARTS = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * "27 Nov 2026" from an ISO date, the style docs/product/views.md uses: day first like en-GB, but
 * with three-letter months (en-GB writes "Sept"). UTC, so the day never shifts with the server's
 * time zone.
 */
export function formatDay(isoDate: string): string {
  const parts = PARTS.formatToParts(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}`;
}

const MONTHS = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

/** "Feb 2023" from a partial date, or the year alone when that is all a CV gave (#113). */
export function formatPartialDate(date: string): string {
  const [year, month] = date.split('-');
  if (!year || !month) return date;
  return `${MONTHS.format(new Date(`${date}-01T00:00:00Z`))} ${year}`;
}

/** "3 yrs 9 mos", dropping a part that is zero. */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${String(years)} ${years === 1 ? 'yr' : 'yrs'}` : '',
    rest > 0 ? `${String(rest)} ${rest === 1 ? 'mo' : 'mos'}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/** "64%" from a share of postings (0–1), rounded: market numbers never claim more precision. */
export function formatShare(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}
