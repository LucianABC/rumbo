import type { ProfileAnalysis } from '@rumbo/contracts/provisional';
import { Check, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDay } from '../../lib/format';
import { Unavailable } from '../skills/shared';

/**
 * What rumbo makes of the profile (docs/product/views.md, #113): the Profile analyst's summary and
 * feedback, set apart and labeled as opinion, as gaps' rationale is. The analysis is provisional
 * until the F1 spec (#41).
 */
export function ProfileReading({ analysis }: { readonly analysis: ProfileAnalysis | null }) {
  if (!analysis) {
    return (
      <Unavailable title="Analysis unavailable">
        It could not be read, or it is from an older version of your profile.
      </Unavailable>
    );
  }
  const strengths = analysis.feedback.filter((f) => f.kind === 'strength');
  const improvements = analysis.feedback.filter((f) => f.kind === 'improve');
  return (
    <figure className="flex min-w-0 flex-col gap-3 border-l-2 border-chart-1/50 pl-4">
      <figcaption className="text-2xs font-medium text-muted-foreground uppercase">
        rumbo&apos;s reading · {formatDay(analysis.analyzedAt)}
      </figcaption>
      <blockquote className="text-sm">{analysis.summary}</blockquote>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Feedback title="What works" items={strengths} icon={<StrengthIcon />} />
        <Feedback title="What to improve" items={improvements} icon={<ImproveIcon />} />
      </div>
      <p className="text-xs text-muted-foreground">
        Sample analysis: the real one arrives with Profile (F1).
      </p>
    </figure>
  );
}

function StrengthIcon() {
  return <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-chart-1" />;
}

function ImproveIcon() {
  return <TrendingUp aria-hidden className="mt-0.5 size-3.5 shrink-0 text-attention" />;
}

function Feedback({
  title,
  items,
  icon,
}: {
  readonly title: string;
  readonly items: readonly ProfileAnalysis['feedback'][number][];
  readonly icon: ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold">{title}</h3>
      <ul role="list" className="mt-1 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.text} className="flex gap-1.5">
            {icon}
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
