import {
  DatabaseIcon,
  FolderGit2Icon,
  InboxIcon,
  MapIcon,
  TargetIcon,
  UserIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { contrastRatio, formatRatio, MIN_GRAPHIC, MIN_TEXT } from '@/lib/contrast';
import { cn } from '@/lib/utils';

import type { Direction, Palette, ThemeName } from './directions';
import { MapSample } from './map-sample';

/**
 * One direction in one theme. The palette is applied as the CSS variables shadcn/ui components
 * read, scoped to this panel, so both directions and both themes render side by side (#105).
 */
export function DirectionPanel({ direction, theme }: { direction: Direction; theme: ThemeName }) {
  const p = direction.palettes[theme];
  const label = `${direction.name}, ${theme}`;

  return (
    <section
      aria-label={label}
      className={cn(
        'bg-background text-foreground space-y-6 rounded-lg border p-4 font-sans sm:p-6',
        theme === 'dark' && 'dark',
      )}
      style={panelVariables(direction, p)}
    >
      <h3 className="font-heading text-lg font-semibold capitalize">{theme}</h3>
      <PaletteSwatches palette={p} />
      <TypeScale direction={direction} />
      <Sample title="Station and segment">
        <MapSample direction={direction} palette={p} />
      </Sample>
      <Sample title="Tab bar">
        <TabBar direction={direction} label={label} />
      </Sample>
      <Sample title="Card, table row, status chips, diff line">
        <SampleCard palette={p} />
      </Sample>
      <Sample title="Empty state and focus ring">
        <SampleEmpty />
      </Sample>
    </section>
  );
}

function panelVariables(direction: Direction, p: Palette): CSSProperties {
  const font = (role: 'heading' | 'body' | 'mono') => `var(--font-${direction.id}-${role})`;
  return {
    '--background': p.background,
    '--foreground': p.foreground,
    '--card': p.surface,
    '--card-foreground': p.foreground,
    '--popover': p.surface,
    '--popover-foreground': p.foreground,
    '--primary': p.primary,
    '--primary-foreground': p.onPrimary,
    '--secondary': p.background,
    '--secondary-foreground': p.foreground,
    '--muted': p.background,
    '--muted-foreground': p.muted,
    '--accent': p.background,
    '--accent-foreground': p.foreground,
    '--destructive': p.lines[0],
    '--border': p.border,
    '--input': p.border,
    '--ring': p.lines[1],
    '--radius': `${String(direction.radius)}rem`,
    '--font-sans': font('body'),
    '--font-heading': font('heading'),
    '--font-mono': font('mono'),
    '--success': p.success,
    '--attention': p.attention,
  } as CSSProperties;
}

function Sample({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-muted-foreground font-mono text-xs tracking-wide uppercase">{title}</h4>
      {children}
    </div>
  );
}

function PaletteSwatches({ palette: p }: { palette: Palette }) {
  const swatches: { name: string; color: string; on: string; min: number }[] = [
    ...p.lines.map((color, i) => ({
      name: `line-${String(i + 1)}`,
      color,
      on: p.background,
      min: MIN_GRAPHIC,
    })),
    { name: 'pending', color: p.pending, on: p.background, min: MIN_GRAPHIC },
    { name: 'text', color: p.foreground, on: p.background, min: MIN_TEXT },
    { name: 'muted text', color: p.muted, on: p.surface, min: MIN_TEXT },
    { name: 'success', color: p.success, on: p.surface, min: MIN_TEXT },
    { name: 'attention', color: p.attention, on: p.surface, min: MIN_TEXT },
    { name: 'on primary', color: p.onPrimary, on: p.primary, min: MIN_TEXT },
  ];

  return (
    <Sample title="Palette, contrast measured">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {swatches.map((s) => {
          const ratio = contrastRatio(s.color, s.on);
          const pass = ratio >= s.min;
          return (
            <li key={s.name} className="space-y-1">
              <div
                className="h-10 rounded-md border"
                style={{ background: `linear-gradient(135deg, ${s.color} 60%, ${s.on} 60%)` }}
                aria-hidden="true"
              />
              <p className="text-xs leading-tight font-medium">{s.name}</p>
              <p className="text-muted-foreground font-mono text-[0.6875rem] leading-tight">
                {s.color}
                <br />
                {formatRatio(ratio)} {pass ? '✓' : '✗'} {s.min === MIN_GRAPHIC ? '≥3' : '≥4.5'}
              </p>
            </li>
          );
        })}
      </ul>
    </Sample>
  );
}

function TypeScale({ direction }: { direction: Direction }) {
  const { fonts } = direction;
  return (
    <Sample title={`Type: ${fonts.heading} / ${fonts.body} / ${fonts.mono}`}>
      <div className="space-y-1">
        <p className="font-heading text-3xl leading-tight font-semibold tracking-tight">
          Toward Data Analyst
        </p>
        <p className="font-heading text-xl font-semibold">Own the weekly support report</p>
        <p className="text-base">
          Build a dashboard from the ticket export and walk your team through it.
        </p>
        <p className="text-muted-foreground text-sm">
          Market data from 3 sources, checked 6 Oct 2026 · see Sources
        </p>
        <p className="text-muted-foreground font-mono text-xs">
          done when: dashboard link + review
        </p>
      </div>
    </Sample>
  );
}

const TABS = [
  { name: 'Roadmap', icon: MapIcon },
  { name: 'Profile', icon: UserIcon, attention: true },
  { name: 'Skills & gaps', icon: TargetIcon },
  { name: 'Projects', icon: FolderGit2Icon, count: 3 },
  { name: 'Sources', icon: DatabaseIcon },
] as const;

function TabBar({ direction, label }: { direction: Direction; label: string }) {
  return (
    <ul
      aria-label={`Sample tab bar, ${label}`}
      className="bg-card grid grid-cols-5 rounded-lg border p-1"
    >
      {TABS.map((tab, i) => {
        const current = i === 0;
        const Icon = tab.icon;
        return (
          <li
            key={tab.name}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center gap-1 px-1 py-2 text-center text-[0.6875rem] leading-tight',
              current ? 'font-semibold' : 'text-muted-foreground',
              current && direction.id === 'a' && 'shadow-[inset_0_3px_0_var(--foreground)]',
              current && direction.id === 'b' && 'bg-background rounded-md',
            )}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden="true" strokeWidth={current ? 2.25 : 1.75} />
              {'attention' in tab && (
                <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-[var(--attention)]">
                  <span className="sr-only">, needs your review</span>
                </span>
              )}
            </span>
            <span>
              {tab.name}
              {'count' in tab && (
                <span className="bg-background ml-1 rounded-full border px-1 font-mono text-[0.625rem]">
                  {tab.count}
                  <span className="sr-only"> open tasks</span>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SampleCard({ palette: p }: { palette: Palette }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Practice project · SQL for analysts</CardTitle>
        <CardDescription>Closes 2 gaps for Data Analyst and Business Analyst</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-current text-[var(--success)]">
            Done
          </Badge>
          <Badge>In progress</Badge>
          <Badge variant="outline" className="text-muted-foreground">
            Pending
          </Badge>
          <Badge variant="outline" className="border-current text-[var(--attention)]">
            Needs your approval
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead className="text-right">Postings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">SQL</TableCell>
              <TableCell className="text-muted-foreground">Project, 2 commits</TableCell>
              <TableCell className="text-right font-mono">64%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div
          className="overflow-hidden rounded-md border font-mono text-xs"
          aria-label="Sample diff"
        >
          <p
            className="px-2 py-1 line-through decoration-1"
            style={{ background: `color-mix(in srgb, ${p.lines[0]} 14%, ${p.surface})` }}
          >
            <span aria-hidden="true">− </span>Support specialist with an eye for data
          </p>
          <p
            className="px-2 py-1"
            style={{ background: `color-mix(in srgb, ${p.success} 16%, ${p.surface})` }}
          >
            <span aria-hidden="true">+ </span>Support specialist who ships weekly SQL reports
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SampleEmpty() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <Empty className="bg-card border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="font-heading">Planned</EmptyTitle>
          <EmptyDescription>This tab arrives with Tracking (F5).</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            See the plan
          </Button>
        </EmptyContent>
      </Empty>
      <div className="flex flex-col items-start gap-2">
        {/* Forced ring so it can be compared without tabbing; the button below it is live. */}
        <span
          aria-hidden="true"
          className="border-ring ring-ring/50 bg-primary text-primary-foreground inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium ring-3"
        >
          Focus ring
        </span>
        <Button>Tab to me</Button>
      </div>
    </div>
  );
}
