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
