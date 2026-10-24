import { deriveRoadmapView, type RoadmapItem } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Evidence, StationDetail } from '../src/components/roadmap/station-detail';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../src/lib/data';
import { type SingleLineRow, singleLine } from '../src/lib/roadmap/single-line';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

async function setup() {
  const roadmap = await getRoadmap();
  const line = singleLine(
    roadmap,
    deriveRoadmapView(roadmap),
    getTargetColors(roadmap, await getRoadmapLayout(roadmap)),
  );
  const gapNames = Object.fromEntries(roadmap.gaps.map((g) => [g.id, g.skill.name]));
  const row = (id: string): MilestoneRow => {
    const found = line.rows.find((r): r is MilestoneRow => r.kind === 'milestone' && r.id === id);
    if (!found) throw new Error(`no milestone ${id}`);
    return found;
  };
  return { row, gapNames };
}

function render(row: MilestoneRow, gapNames: Readonly<Record<string, string>>): string {
  return renderToStaticMarkup(createElement(StationDetail, { row, gapNames }));
}

/** The row with its items replaced, to reach states the mock does not have. */
function withItems(row: MilestoneRow, items: RoadmapItem[]): MilestoneRow {
  return { ...row, milestone: { ...row.milestone, items } };
}

describe('station detail (#109)', () => {
  it('lists the targets the station moves toward and every item with its type and status', async () => {
    const { row, gapNames } = await setup();
    const weekly = row('weekly-report');
    const html = render(weekly, gapNames);

    for (const target of weekly.serves) expect(html).toContain(`>${target.roleFamily.name}</li>`);
    for (const item of weekly.milestone.items) expect(html).toContain(item.title);
    expect(html).toContain('>You are here</span>');
  });

  it('shows what done means, the gaps an item closes and its dates', async () => {
    const { row, gapNames } = await setup();
    const html = render(row('query-basics'), gapNames);

    expect(html).toContain('<dt class="text-muted-foreground">Done when</dt>');
    expect(html).toContain('>SQL</dd>');
    expect(html).toContain('Certification · ');
  });

  it('marks approved evidence apart from evidence waiting for the user', async () => {
    const { row, gapNames } = await setup();

    expect(render(row('query-basics'), gapNames)).toContain('>approved</span>');
    expect(render(row('process-map'), gapNames)).toContain('>awaiting approval</span>');
  });

  it('counts project tasks and says which are done', async () => {
    const { row, gapNames } = await setup();
    const html = render(row('public-dashboard'), gapNames);

    expect(html).toMatch(/Tasks · <span[^>]*>0\/3<\/span>/);
    expect(html).toContain('<span class="sr-only">To do: </span>');
  });

  it('has a designed state for every missing part', async () => {
    const { row, gapNames } = await setup();
    const base = row('public-dashboard');
    const [project] = base.milestone.items;
    if (project?.type !== 'project') throw new Error('expected a project item');
    const bare: RoadmapItem = {
      ...project,
      tasks: [],
      evidence: [],
      expectedEnd: undefined,
      lastProgressAt: undefined,
    };

    const html = render(withItems(base, [bare]), gapNames);
    expect(html).toContain('No date yet');
    expect(html).toContain('None yet');
    expect(html).toContain('No tasks yet.');
    expect(html).toContain('No evidence yet.');

    expect(render(withItems(base, []), gapNames)).toContain(
      'No items planned for this station yet.',
    );
  });
});

describe('Evidence (#111)', () => {
  const evidence = (sourceRef: string) =>
    [{ id: 'ev-1', sourceType: 'experience', sourceRef, approvedAt: null }] as const;

  it('names an experience instead of showing its id, and falls back to the id', () => {
    const names = { 'exp-1': 'Analyst · Acme' };
    const html = (ref: string) =>
      renderToStaticMarkup(
        createElement(Evidence, { evidence: evidence(ref), sourceNames: names }),
      );

    expect(html('exp-1')).toContain('Analyst · Acme');
    expect(html('exp-1')).not.toContain('exp-1');
    expect(html('exp-9')).toContain('exp-9');
  });

  it('collapses several pieces of one source type and keeps what awaits approval in sight', () => {
    const piece = (id: string, approvedAt: string | null) =>
      ({ id, sourceType: 'experience', sourceRef: id, approvedAt }) as const;
    const html = renderToStaticMarkup(
      createElement(Evidence, {
        evidence: [
          piece('exp-1', '2026-10-01T00:00:00.000Z'),
          piece('exp-2', '2026-10-01T00:00:00.000Z'),
          piece('exp-3', null),
          { id: 'm-1', sourceType: 'manual', sourceRef: 'A course', approvedAt: null },
        ],
      }),
    );

    expect(html.match(/<details/g)).toHaveLength(1);
    expect(html).toContain('×3');
    expect(html).toContain('2 approved');
    expect(html).toContain('1 awaiting approval');
    expect(html).toContain('collapsed · show all');
    // A single piece of a type stays a plain line.
    expect(html).toMatch(/Added by you<\/span>/);
  });
});
