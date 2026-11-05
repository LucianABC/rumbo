import { cn } from 'cn';

/**
 * Both sides of a change say what they are in words and with a sign, so a diff never rests on
 * color. Shared by Suggested changes (#113) and profile editing (#170).
 */
export function Removed({ text }: { readonly text: string }) {
  return (
    <del className="block min-w-0 rounded-md border-l-2 border-destructive/60 bg-destructive/10 px-3 py-2 break-words whitespace-pre-line no-underline">
      <span className="block text-2xs font-medium text-muted-foreground">− Removed</span>
      {text}
    </del>
  );
}

export function Added({ text }: { readonly text: string }) {
  return (
    <ins className="block min-w-0 rounded-md border-l-2 border-success bg-success/10 px-3 py-2 break-words whitespace-pre-line no-underline">
      <span className="block text-2xs font-medium text-muted-foreground">+ Added</span>
      {text}
    </ins>
  );
}

/** Old beside new like a GitHub split diff, stacked on phones, where two columns do not fit. */
export function SplitDiff({
  before,
  after,
  className,
}: {
  readonly before: string;
  readonly after: string;
  readonly className?: string;
}) {
  return (
    <div className={cn('grid gap-2 text-sm', before && after ? 'md:grid-cols-2' : null, className)}>
      {before ? <Removed text={before} /> : null}
      {after ? <Added text={after} /> : null}
    </div>
  );
}
