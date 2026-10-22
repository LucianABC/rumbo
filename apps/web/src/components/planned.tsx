import { CircleDashed } from 'lucide-react';
import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import { getTab, type Tab, type TabId } from '../lib/tabs';
import { PageHeader } from './page-header';

/**
 * The designed state of a tab whose view is not built yet: what it will answer and which features
 * bring it (docs/product/views.md, #107). It is the fallback for any tab the demo does not finish.
 */
export function Planned({ tab }: { readonly tab: Tab }) {
  return (
    <Empty className="border border-dashed bg-card py-12" data-testid="planned">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleDashed aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-base">
          <Badge variant="outline" className="mr-2 align-middle">
            Planned
          </Badge>
          {tab.label} is on its way
        </EmptyTitle>
        <EmptyDescription>{tab.answers}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-xs text-muted-foreground">Comes with</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {tab.features.map((feature) => (
            <li key={feature.id}>
              <Badge variant="secondary">
                <span className="font-mono">{feature.id}</span> {feature.name}
              </Badge>
            </li>
          ))}
        </ul>
      </EmptyContent>
    </Empty>
  );
}

/** A whole tab page in the Planned state, until its view replaces it (#111–#115). */
export function PlannedTab({ id }: { readonly id: TabId }) {
  const tab = getTab(id);
  return (
    <>
      <PageHeader title={tab.label} />
      <Planned tab={tab} />
    </>
  );
}

export function tabMetadata(id: TabId): Metadata {
  return { title: `${getTab(id).label} · rumbo` };
}
