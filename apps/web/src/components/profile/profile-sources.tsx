import type { Profile } from '@rumbo/contracts';
import { cn } from 'cn';
import { FileText } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { formatDay } from '../../lib/format';
import { lastImports } from '../../lib/profile/profile-view';
import { LinkedInIcon } from '../linkedin-icon';
import { SourceAction } from './source-action';

/**
 * Where the profile came from and how to update it, in one strip above the CV: everything below
 * it reads from these (docs/product/views.md, #113).
 */
export function ProfileSources({ profile }: { readonly profile: Profile }) {
  const imports = lastImports(profile.sources);
  return (
    <section aria-labelledby="sources-heading" className="mb-4">
      <h2 id="sources-heading" className="sr-only">
        Profile sources
      </h2>
      <ul
        role="list"
        className="grid divide-y rounded-xl border bg-card md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <Source
          icon={FileText}
          title="CV"
          status={imports.cv ? `Imported ${formatDay(imports.cv)}` : 'Not imported yet'}
          ready={imports.cv !== undefined}
          action={imports.cv ? 'Replace CV' : 'Upload CV'}
        />
        <Source
          icon={LinkedInIcon}
          title="LinkedIn export"
          status={
            imports.linkedin_export
              ? `Imported ${formatDay(imports.linkedin_export)}`
              : 'Not imported yet'
          }
          ready={imports.linkedin_export !== undefined}
          action={imports.linkedin_export ? 'Import again' : 'Import from LinkedIn'}
        >
          <details className="mt-1 text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              How to get the PDF
            </summary>
            <ol className="mt-1 list-inside list-decimal">
              <li>Open your profile on LinkedIn.</li>
              <li>Under your name, choose More or Resources, then Save to PDF.</li>
              <li>Upload that file here.</li>
            </ol>
          </details>
        </Source>
        <Source
          icon={LinkedInIcon}
          title="LinkedIn profile"
          status={profile.linkedinUrl ? 'Linked' : 'Not linked yet'}
          ready={profile.linkedinUrl !== undefined}
          action={profile.linkedinUrl ? 'Change link' : 'Link LinkedIn profile'}
        />
      </ul>
    </section>
  );
}

function Source({
  icon: Icon,
  title,
  status,
  ready,
  action,
  children,
}: {
  readonly icon: ComponentType<{ readonly className?: string }>;
  readonly title: string;
  readonly status: string;
  /** Whether this source has fed the profile; the status says so in words too. */
  readonly ready: boolean;
  readonly action: string;
  readonly children?: ReactNode;
}) {
  return (
    <li className="flex min-w-0 gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          ready ? 'bg-success/15 text-success' : 'bg-attention/15 text-attention',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <SourceAction label={action} />
        </div>
        <p
          className={cn(
            'font-mono text-xs tabular-nums',
            ready ? 'text-success' : 'text-attention',
          )}
        >
          {status}
        </p>
        {children}
      </div>
    </li>
  );
}
