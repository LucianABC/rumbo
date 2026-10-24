import { describe, expect, it } from 'vitest';

import {
  checkLayout,
  deriveRoadmapView,
  isInterchange,
  isOctilinear,
  milestoneStatus,
  Roadmap,
  type RoadmapLayout,
  targetColors,
} from '../src/index.js';

const approved = {
  id: 'ev-1',
  sourceType: 'education' as const,
  sourceRef: 'https://example.com/certificate/1',
  approvedAt: '2026-09-26T12:00:00.000Z' as string | null,
};

/** Two targets: "a" and "b" share the first milestone; the second serves only "b". */
function roadmap() {
  return {
    from: 'Starting role',
    updatedAt: '2026-10-16T12:00:00.000Z',
    targets: [
      { id: 'a', roleFamily: { id: 'role-a', name: 'Role A', field: 'Field' }, isPrimary: true },
      { id: 'b', roleFamily: { id: 'role-b', name: 'Role B', field: 'Field' }, isPrimary: false },
    ],
    gaps: [
      {
        id: 'shared-skill',
        skill: { id: 'skill-1', name: 'Shared skill' },
        priority: 1,
        rationale: 'Both markets ask for it.',
        status: 'closed' as 'open' | 'in_progress' | 'closed',
        demand: [
          { targetId: 'a', snapshotId: 'snap-a', share: 0.6, postingCount: 50 },
          { targetId: 'b', snapshotId: 'snap-b', share: 0.4, postingCount: 30 },
        ],
      },
      {
        id: 'b-skill',
        skill: { id: 'skill-2', name: 'B skill' },
        priority: 2,
        rationale: 'Only B asks for it.',
        status: 'in_progress' as 'open' | 'in_progress' | 'closed',
        demand: [{ targetId: 'b', snapshotId: 'snap-b', share: 0.5, postingCount: 30 }],
      },
    ],
    milestones: [
      {
        id: 'first',
        title: 'First',
        items: [
          {
            id: 'course',
            type: 'education' as const,
            kind: 'certification' as const,
            provider: 'Provider',
            url: 'https://example.com/course' as string | undefined,
            title: 'Course',
            doneWhen: 'Certificate issued',
            status: 'done' as 'pending' | 'in_progress' | 'done',
            gapIds: ['shared-skill'],
            evidence: [approved],
          },
        ],
      },
      {
        id: 'second',
        title: 'Second',
        items: [
          {
            id: 'project',
            type: 'project' as const,
            title: 'Project',
            doneWhen: 'Published',
            status: 'in_progress' as 'pending' | 'in_progress' | 'done',
            gapIds: ['b-skill'],
            evidence: [] as (typeof approved)[],
            tasks: [{ id: 't1', title: 'Start', done: true }],
          },
        ],
      },
    ],
  };
}

/** Index access that fails loudly instead of needing a non-null assertion. */
function at<L extends readonly unknown[]>(list: L, index: number): NonNullable<L[number]> {
  const value = list[index] as L[number] | undefined;
  if (value === undefined || value === null) throw new Error(`no element at ${String(index)}`);
  return value;
}

function messages(input: unknown): string[] {
  return Roadmap.safeParse(input).error?.issues.map((i) => i.message) ?? [];
}

describe('Roadmap', () => {
  it('accepts targets, gaps with market demand and milestones with typed items', () => {
    expect(messages(roadmap())).toEqual([]);
  });

  it('rejects more than three active targets', () => {
    const r = roadmap();
    const extra = { ...at(r.targets, 1), isPrimary: false };
    r.targets.push({ ...extra, id: 'c' }, { ...extra, id: 'd' });

    expect(Roadmap.safeParse(r).success).toBe(false);
  });

  it('requires exactly one primary target', () => {
    const r = roadmap();
    at(r.targets, 1).isPrimary = true;

    expect(messages(r)).toContain('exactly one target must be primary');
  });

  it('enforces the F3 rule: every gap has a roadmap item', () => {
    const r = roadmap();
    at(at(r.milestones, 1).items, 0).gapIds = ['shared-skill'];

    expect(messages(r)).toContain('gap "b-skill" has no roadmap item');
  });

  it('rejects a done item without approved evidence', () => {
    const r = roadmap();
    at(at(r.milestones, 0).items, 0).evidence = [{ ...approved, approvedAt: null }];

    expect(messages(r)).toContain('item "course" is done without approved evidence');
  });

  it('rejects unknown references', () => {
    const r = roadmap();
    at(at(r.gaps, 1).demand, 0).targetId = 'ghost';
    at(at(r.milestones, 1).items, 0).gapIds.push('nope');

    expect(messages(r)).toEqual(
      expect.arrayContaining([
        'gap "b-skill" references unknown target "ghost"',
        'item "project" closes unknown gap "nope"',
      ]),
    );
  });

  it('rejects a milestone whose gaps serve no known target', () => {
    const r = roadmap();
    at(at(r.gaps, 1).demand, 0).targetId = 'ghost';

    expect(messages(r)).toContain('milestone "second" serves no target');
  });

  it('rejects duplicate ids, including across items and evidence', () => {
    const r = roadmap();
    at(r.milestones, 1).id = 'first';
    at(at(r.milestones, 1).items, 0).evidence = [{ ...approved }];

    expect(messages(r)).toEqual(
      expect.arrayContaining(['duplicate milestones id "first"', 'duplicate evidence id "ev-1"']),
    );
  });

  it('rejects a milestone with the same id as a target', () => {
    const r = roadmap();
    at(r.milestones, 1).id = 'b';

    expect(messages(r)).toContain('milestone "b" has the same id as a target');
  });

  it('rejects repeated tasks and repeated demand for one target', () => {
    const r = roadmap();
    const project = at(at(r.milestones, 1).items, 0) as {
      tasks: { id: string; title: string; done: boolean }[];
    };
    project.tasks.push({ id: 't1', title: 'Again', done: false });
    const gap = at(r.gaps, 1);
    gap.demand.push({ ...at(gap.demand, 0) });

    expect(messages(r)).toEqual(
      expect.arrayContaining([
        'item "project" lists task "t1" twice',
        'gap "b-skill" lists target "b" twice',
      ]),
    );
  });

  it.each([
    ['open', 'in_progress'],
    ['in_progress', 'pending'],
    ['closed', 'in_progress'],
  ] as const)('rejects a gap that is %s when its item is %s', (gapStatus, itemStatus) => {
    const r = roadmap();
    at(r.gaps, 1).status = gapStatus;
    at(at(r.milestones, 1).items, 0).status = itemStatus;

    expect(messages(r)).toContain(`gap "b-skill" is ${gapStatus} but its items disagree`);
  });

  it('only accepts http(s) links', () => {
    const r = roadmap();
    (at(at(r.milestones, 0).items, 0) as { url?: string }).url = 'javascript:alert(1)';

    expect(Roadmap.safeParse(r).success).toBe(false);
  });

  it('only accepts http(s) repo links', () => {
    const r = roadmap();
    (at(at(r.milestones, 1).items, 0) as { repo?: string }).repo = 'github.com/user/repo';

    expect(Roadmap.safeParse(r).success).toBe(false);
  });

  it.each([
    ['education', 'javascript:alert(1)'],
    ['project', 'not a url'],
    ['commit', 'https://github.com/x/y/commit/abc'],
    ['experience', 'Has Spaces'],
    ['certification', 'Certificate of completion: SQL'],
  ] as const)('rejects a %s evidence with sourceRef %s', (sourceType, sourceRef) => {
    const r = roadmap();
    at(at(r.milestones, 0).items, 0).evidence = [{ ...approved, sourceType, sourceRef } as never];

    expect(messages(r)).toContain(
      `evidence "ev-1" has a sourceRef that is not a valid ${sourceType} reference`,
    );
  });

  it('accepts a commit SHA and free-text manual evidence', () => {
    const r = roadmap();
    at(at(r.milestones, 0).items, 0).evidence = [
      { ...approved, sourceType: 'commit', sourceRef: 'a1b2c3d' } as never,
      { ...approved, id: 'ev-2', sourceType: 'manual', sourceRef: 'Told by my manager' } as never,
    ];

    expect(messages(r)).toEqual([]);
  });

  it('rejects an item type without its required detail', () => {
    const r = roadmap();
    delete (at(r.milestones, 0).items[0] as Record<string, unknown>).provider;

    expect(Roadmap.safeParse(r).success).toBe(false);
  });
});

describe('deriveRoadmapView', () => {
  const r = Roadmap.parse(roadmap());
  const view = deriveRoadmapView(r);

  it('serves the targets of the gaps a milestone closes', () => {
    expect(view.targetsByMilestone.get('first')).toEqual(['a', 'b']);
    expect(view.targetsByMilestone.get('second')).toEqual(['b']);
    expect(isInterchange(view, 'first')).toBe(true);
    expect(isInterchange(view, 'second')).toBe(false);
  });

  it('routes each target through its milestones to its terminal', () => {
    expect(view.routes.get('a')).toEqual(['first', 'a']);
    expect(view.routes.get('b')).toEqual(['first', 'second', 'b']);
  });

  it('derives milestone status from items and "you are here" from plan order', () => {
    expect(view.statusByMilestone.get('first')).toBe('done');
    expect(view.statusByMilestone.get('second')).toBe('in_progress');
    expect(view.currentMilestoneId).toBe('second');

    const pending = structuredClone(at(r.milestones, 1));
    at(pending.items, 0).status = 'pending';
    expect(milestoneStatus(pending)).toBe('pending');
  });

  it('has no current milestone when everything is done', () => {
    const done = structuredClone(r);
    done.milestones = [at(done.milestones, 0)];

    expect(deriveRoadmapView(done).currentMilestoneId).toBeNull();
  });
});

describe('checkLayout', () => {
  const r = Roadmap.parse(roadmap());

  function layout(): RoadmapLayout {
    return {
      lines: [
        { targetId: 'a', colorToken: 'line-1' },
        { targetId: 'b', colorToken: 'line-2' },
      ],
      stations: [
        { id: 'first', at: { x: 0, y: 0 } },
        { id: 'second', at: { x: 2, y: 2 } },
        { id: 'a', at: { x: 4, y: 0 } },
        { id: 'b', at: { x: 5, y: 2 } },
      ],
      bends: [{ targetId: 'b', after: 'first', points: [{ x: 0, y: 2 }] }],
      offsets: [],
    };
  }

  it('accepts a layout that places every station on octilinear routes', () => {
    expect(checkLayout(r, layout())).toEqual([]);
  });

  it('reports missing positions and colors, and shared colors', () => {
    const l = layout();
    l.stations = l.stations.filter((s) => s.id !== 'second');
    l.lines = [
      { targetId: 'a', colorToken: 'line-1' },
      { targetId: 'a', colorToken: 'line-1' },
    ];

    expect(checkLayout(r, l)).toEqual(
      expect.arrayContaining([
        'station "second" has no position',
        'target "b" has no line color',
        'target "a" has more than one line color',
        'color "line-1" is used by more than one line',
      ]),
    );
  });

  it('reports stale and duplicate entries', () => {
    const l = layout();
    l.lines.push({ targetId: 'gone', colorToken: 'line-3' });
    l.stations.push({ id: 'removed', at: { x: 9, y: 9 } }, { id: 'first', at: { x: 2, y: 2 } });

    expect(checkLayout(r, l)).toEqual(
      expect.arrayContaining([
        'line color for unknown target "gone"',
        'layout places unknown station "removed"',
        'station "first" is placed twice',
        'more than one station sits at (2,2)',
      ]),
    );
  });

  it('reports non-octilinear segments, bends included', () => {
    const l = layout();
    l.bends = [{ targetId: 'b', after: 'first', points: [{ x: 1, y: 2 }] }];

    expect(checkLayout(r, l).some((p) => p.includes('non-octilinear'))).toBe(true);
  });

  it('reports bends and offsets that are not on the target route', () => {
    const l = layout();
    l.bends = [{ targetId: 'a', after: 'a', points: [{ x: 5, y: 0 }] }];
    l.offsets = [{ targetId: 'a', from: 'first', to: 'second', lane: 1 }];

    expect(checkLayout(r, l)).toEqual(
      expect.arrayContaining([
        'bend after "a" is not between two stations of "a"',
        'offset "first"→"second" is not a segment of "a"',
      ]),
    );
  });

  it('reports two lines in the same lane of a shared stretch', () => {
    const l = layout();
    l.offsets = [
      { targetId: 'a', from: 'first', to: 'a', lane: 0 },
      { targetId: 'b', from: 'first', to: 'second', lane: 0 },
      { targetId: 'b', from: 'second', to: 'first', lane: 1 },
      { targetId: 'a', from: 'first', to: 'a', lane: 0 },
    ];

    expect(checkLayout(r, l)).toContain('two lines share a↔first lane 0');
  });
});

describe('targetColors', () => {
  const r = Roadmap.parse(roadmap());

  it("uses the layout's slots when the layout fits", () => {
    const colors = targetColors(r, {
      lines: [
        { targetId: 'a', colorToken: 'line-3' },
        { targetId: 'b', colorToken: 'line-1' },
      ],
      stations: [
        { id: 'first', at: { x: 0, y: 0 } },
        { id: 'second', at: { x: 2, y: 2 } },
        { id: 'a', at: { x: 4, y: 0 } },
        { id: 'b', at: { x: 4, y: 2 } },
      ],
      bends: [],
      offsets: [],
    });

    expect(Object.fromEntries(colors)).toEqual({ a: 'line-3', b: 'line-1' });
  });

  it('falls back to target order, primary first, without a usable layout', () => {
    const swapped = structuredClone(r);
    swapped.targets.reverse();

    expect(Object.fromEntries(targetColors(swapped))).toEqual({ a: 'line-1', b: 'line-2' });
  });
});

describe('isOctilinear', () => {
  it.each([
    [{ x: 0, y: 0 }, { x: 3, y: 0 }, true],
    [{ x: 0, y: 0 }, { x: 0, y: -2 }, true],
    [{ x: 0, y: 0 }, { x: 2, y: 2 }, true],
    [{ x: 0, y: 0 }, { x: -2, y: 2 }, true],
    [{ x: 0, y: 0 }, { x: 2, y: 1 }, false],
    [{ x: 1, y: 1 }, { x: 1, y: 1 }, false],
  ])('%o → %o is %s', (a, b, expected) => {
    expect(isOctilinear(a, b)).toBe(expected);
  });
});
