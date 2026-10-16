import { describe, expect, it } from 'vitest';

import {
  checkLayout,
  currentMilestoneId,
  isInterchange,
  isOctilinear,
  milestoneStatus,
  milestoneTargetIds,
  Roadmap,
  type RoadmapLayout,
  targetRoute,
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
        status: 'in_progress' as const,
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
        status: 'open' as const,
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
            title: 'Course',
            doneWhen: 'Certificate issued',
            status: 'done' as const,
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
            status: 'in_progress' as const,
            gapIds: ['b-skill'],
            evidence: [],
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

  it('rejects a milestone that serves no target', () => {
    const r = roadmap();
    at(at(r.milestones, 1).items, 0).gapIds = ['nope'];

    expect(messages(r)).toContain('milestone "second" serves no target');
  });

  it('rejects duplicate ids', () => {
    const r = roadmap();
    at(r.milestones, 1).id = 'first';

    expect(messages(r)).toContain('duplicate milestones id "first"');
  });

  it('rejects an item type without its required detail', () => {
    const r = roadmap();
    delete (at(r.milestones, 0).items[0] as Record<string, unknown>).provider;

    expect(Roadmap.safeParse(r).success).toBe(false);
  });
});

describe('derived view', () => {
  const r = Roadmap.parse(roadmap());

  it('serves the targets of the gaps a milestone closes', () => {
    expect(milestoneTargetIds(r, at(r.milestones, 0))).toEqual(['a', 'b']);
    expect(milestoneTargetIds(r, at(r.milestones, 1))).toEqual(['b']);
    expect(isInterchange(r, at(r.milestones, 0))).toBe(true);
    expect(isInterchange(r, at(r.milestones, 1))).toBe(false);
  });

  it('routes each target through its milestones to its terminal', () => {
    expect(targetRoute(r, 'a')).toEqual(['first', 'a']);
    expect(targetRoute(r, 'b')).toEqual(['first', 'second', 'b']);
  });

  it('derives milestone status from items and "you are here" from plan order', () => {
    expect(milestoneStatus(at(r.milestones, 0))).toBe('done');
    expect(milestoneStatus(at(r.milestones, 1))).toBe('in_progress');
    expect(currentMilestoneId(r)).toBe('second');

    const pending = structuredClone(at(r.milestones, 1));
    at(pending.items, 0).status = 'pending';
    expect(milestoneStatus(pending)).toBe('pending');
  });

  it('has no current milestone when everything is done', () => {
    const done = structuredClone(r);
    done.milestones = [at(done.milestones, 0)];

    expect(currentMilestoneId(done)).toBeNull();
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
      { targetId: 'x', colorToken: 'line-1' },
    ];

    expect(checkLayout(r, l)).toEqual(
      expect.arrayContaining([
        'station "second" has no position',
        'target "b" has no line color',
        'color "line-1" is used by more than one line',
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
