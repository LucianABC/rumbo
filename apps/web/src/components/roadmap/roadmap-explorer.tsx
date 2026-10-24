'use client';

import { cn } from 'cn';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { Lane, SingleLine, SingleLineRow } from '../../lib/roadmap/single-line';
import type { SubwayMap } from '../../lib/roadmap/subway-map';
import { LineSwitcher } from './line-switcher';
import { SingleLineView } from './single-line-view';
import { StationSheet } from './station-sheet';
import { SubwayMapView } from './subway-map-view';

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

/**
 * The roadmap's interactive part (spec 01): the subway map from `lg` when there is a layout
 * (#117), the line switcher under it, one target's station list (#108, #148), and the station
 * panel either one opens (#109). They share which targets are highlighted and which station is
 * open.
 *
 * Nothing is selected until the user picks a line (#148). On desktop the map shows the whole
 * plan, so the list waits for a choice; phones have no map, so their list shows the primary's
 * line meanwhile.
 */
export function RoadmapExplorer({
  lanes,
  line,
  stations,
  map,
  selectedId,
  initialStationId = null,
  gapNames,
}: {
  /** Every target's lane, for the switcher. */
  readonly lanes: readonly Lane[];
  /** The line the list shows: the selected one, or the primary's while nothing is (#148). */
  readonly line: SingleLine;
  /**
   * Every milestone with all its lanes, for the station panel: the map opens stations of any line,
   * and the panel lists every target a station advances, not just the selected one (#148). Their
   * `current` is ignored: the panel takes "You are here" from the view that opened it.
   */
  readonly stations: readonly MilestoneRow[];
  readonly map: SubwayMap | null;
  /** The line the user picked, or null: the map highlights it unless the user hovers. */
  readonly selectedId: string | null;
  /** A station to open on load, from `?station=` (#111). */
  readonly initialStationId?: string | null;
  readonly gapNames: Readonly<Record<string, string>>;
}) {
  const [hovered, setHovered] = useState<readonly string[] | null>(null);
  const active = hovered ?? (selectedId ? [selectedId] : null);
  // The last station opened stays set after closing, so the panel keeps its content while it
  // animates out; `open` alone says whether it shows (#142).
  const [stationId, setStationId] = useState<string | null>(initialStationId);
  const [openedFrom, setOpenedFrom] = useState<'map' | 'list'>('list');
  const [open, setOpen] = useState(initialStationId !== null);
  // A station opened from the URL leaves it on close, so a reload does not open it again (#111).
  const fromUrl = useRef(initialStationId !== null);
  // The panel's "You are here" matches the view that opened it: with no line chosen the map marks
  // the plan's first open milestone and the phone list the primary's, which can differ (#148).
  const hereId =
    openedFrom === 'map'
      ? (map?.stations.find((s) => s.current)?.id ?? null)
      : (line.rows.find((r) => r.kind === 'milestone' && r.current)?.id ?? null);
  const base = stations.find((row) => row.id === stationId);
  const station = base ? { ...base, current: base.id === hereId } : undefined;
  const openStation = (from: 'map' | 'list') => (id: string) => {
    setStationId(id);
    setOpenedFrom(from);
    setOpen(true);
  };
  const router = useRouter();
  const pathname = usePathname();
  // Same URL as the switcher's links, so a click on the map and on the switcher agree (#148).
  const selectLine = (targetId: string) => {
    router.replace(`?line=${encodeURIComponent(targetId)}`, { scroll: false });
  };

  // Picking a line brings its stations into view; the first render keeps the page where it is.
  const list = useRef<HTMLDivElement>(null);
  const shown = useRef(selectedId);
  useEffect(() => {
    if (selectedId === shown.current) return;
    shown.current = selectedId;
    if (!selectedId) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [selectedId]);

  // On desktop with a map and no choice yet, the list waits; phones still show the primary's.
  const waiting = map !== null && selectedId === null;
  const primaryId = lanes[0]?.target.id ?? null;

  return (
    <>
      {map ? (
        <div className="hidden lg:block">
          <SubwayMapView
            map={map}
            active={active}
            onActivate={setHovered}
            onOpen={openStation('map')}
            onSelectLine={selectLine}
          />
        </div>
      ) : null}
      {waiting ? (
        <>
          {/* Two switchers because the selection differs by screen: none beside the map, the
              primary's on phones, where its list shows. Only one is ever displayed (#148). */}
          <LineSwitcher lanes={lanes} selectedId={primaryId} className="lg:hidden" />
          <div className="hidden flex-col gap-2 lg:flex">
            <LineSwitcher lanes={lanes} selectedId={null} />
            <p className="text-sm text-muted-foreground">
              Choose a line, here or on the map, to see its stations.
            </p>
          </div>
        </>
      ) : (
        <LineSwitcher lanes={lanes} selectedId={selectedId ?? primaryId} />
      )}
      <div ref={list} className={cn('scroll-mt-20', waiting && 'lg:hidden')}>
        <SingleLineView
          // A new line is a new list: its roving focus starts again at its own "you are here".
          key={line.lanes[0]?.target.id}
          line={line}
          withMap={map !== null}
          onActivate={setHovered}
          onOpen={openStation('list')}
        />
      </div>
      <StationSheet
        row={station ?? null}
        open={open}
        gapNames={gapNames}
        onClose={() => {
          setOpen(false);
          if (fromUrl.current) {
            fromUrl.current = false;
            const query = selectedId ? `?line=${encodeURIComponent(selectedId)}` : '';
            router.replace(`${pathname}${query}`, { scroll: false });
          }
        }}
      />
    </>
  );
}
