import type { Metadata } from 'next';
import { connection } from 'next/server';

import { getApiInternalUrl } from '../../lib/config';
import { fetchHealth, type StatusView, toStatusView } from '../../lib/health';

export const metadata: Metadata = { title: 'Status · rumbo' };

/** Walking-skeleton status page: API, database and worker heartbeat (#15). */
export default async function StatusPage() {
  // Render on every request: the status must be live, never prerendered at build time.
  await connection();
  const view = toStatusView(await fetchHealth(getApiInternalUrl()), new Date());

  return (
    // Outside the tab shell on purpose: it reports the stack, not the user's data (views.md, #107).
    <main className="p-4">
      <h1 className="mb-2 text-2xl font-semibold">rumbo status</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 [&_dt]:font-semibold">
        <dt>API</dt>
        <dd data-testid="api-status">{view.api}</dd>
        <dt>Database</dt>
        <dd data-testid="db-status">db: {view.db}</dd>
        <dt>Worker heartbeat</dt>
        <dd data-testid="heartbeat-status">{heartbeatText(view)}</dd>
        <dt>Version</dt>
        <dd>{view.version ? `${view.version} (${view.commit ?? 'unknown'})` : 'unknown'}</dd>
      </dl>
    </main>
  );
}

function heartbeatText(view: StatusView): string {
  switch (view.heartbeat) {
    case 'fresh':
      return `ok, last ${view.heartbeatAge ?? ''}`;
    case 'stale':
      return `stale, last ${view.heartbeatAge ?? ''}`;
    case 'none':
      return 'none yet';
    case 'unknown':
      return 'unknown';
  }
}
