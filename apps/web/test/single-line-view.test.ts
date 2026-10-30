import { deriveRoadmapView } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { SingleLineView } from '../src/components/roadmap/single-line-view';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../src/lib/data';
import { itemKindLabel } from '../src/lib/labels';
import { singleLine } from '../src/lib/roadmap/single-line';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

describe('item types in the station list (#149)', () => {
  it('names every item type, education by its kind', () => {
    const base = { id: 'i', title: 't', status: 'pending', gapIds: [], doneWhen: 'd' } as const;
    expect(itemKindLabel({ ...base, type: 'project', tasks: [], evidence: [] } as never)).toBe(
      'Practice project',
    );
    expect(
      itemKindLabel({ ...base, type: 'education', kind: 'workshop', provider: 'p' } as never),
    ).toBe('Workshop');
    expect(itemKindLabel({ ...base, type: 'work_experience', context: 'c' } as never)).toBe(
      'Work experience',
    );
  });

  it('shows each item’s type as text, outside the station button', async () => {
    const roadmap = await getRoadmap();
    const line = singleLine(
      roadmap,
      deriveRoadmapView(roadmap),
      getTargetColors(roadmap, await getRoadmapLayout(roadmap)),
    );
    const html = renderToStaticMarkup(createElement(SingleLineView, { line }));

    const items = roadmap.milestones.flatMap((m) => m.items);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(html).toContain(
        `${itemKindLabel(item)}</span><span class="sr-only">: </span>${item.title}`,
      );
    }
    // The name sits in the item list, never inside the station button.
    for (const button of html.match(/<button[^>]*>.*?<\/button>/g) ?? []) {
      for (const item of items) expect(button).not.toContain(itemKindLabel(item) + '</span>');
    }
  });
});
