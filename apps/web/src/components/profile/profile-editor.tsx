'use client';

import type { Profile } from '@rumbo/contracts';
import { cn } from 'cn';
import { Check, ChevronRight, Plus, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  addItem,
  applyDraft,
  changeCount,
  draftErrors,
  type DraftItem,
  type FieldDef,
  HEADER_FIELDS,
  headerErrorKey,
  headerFieldChanged,
  itemErrorKey,
  itemFieldChanged,
  LEVEL_OPTIONS,
  type ProfileDraft,
  removeItem,
  restoreItem,
  type SectionDef,
  SECTIONS,
  setHeaderField,
  setItemField,
  skillsLosingEvidence,
  toDraft,
} from '../../lib/profile/profile-edit';
import { SplitDiff } from '../diff';
import { Button } from '../ui/button';

const CARD = 'min-w-0 rounded-xl border bg-card p-4 md:p-5';
const HEADING = 'text-xs font-semibold text-primary uppercase';
const DISABLED = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const INPUT =
  'w-full min-w-0 rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive';

const CHIP =
  'inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2.5 text-xs font-medium';
const CHIP_BUTTON =
  'grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';

/** Every id on the page starts here, so a key can never collide with one outside the editor. */
const fieldId = (key: string) => `edit-${key}`;

/**
 * The whole Profile page in edit mode (docs/product/views.md, #170). The draft stays here until
 * Save: only this page reads it, and leaving without saving must leave no trace.
 */
export function ProfileEditor({
  profile,
  canReview,
  onSave,
  onClose,
}: {
  readonly profile: Profile;
  /** There are reviews left this week: Save always works, Save and review needs one. */
  readonly canReview: boolean;
  readonly onSave: (profile: Profile, review: boolean) => void;
  readonly onClose: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const [confirming, setConfirming] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Adding, deleting and undoing swap the control that was pressed: focus follows the change, so
  // a keyboard user does not fall back to the top of the page.
  const focusNext = useRef<string | null>(fieldId(headerErrorKey('name')));
  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const errors = useMemo(() => draftErrors(draft), [draft]);
  const changes = changeCount(draft);
  const invalid = Object.keys(errors).length;

  const blocked = changes === 0 || invalid > 0;
  const save = (review: boolean) => {
    if (blocked || (review && !canReview)) return;
    const saved = applyDraft(draft, profile, new Date().toISOString());
    if (!saved) {
      setSaveFailed(true);
      return;
    }
    onSave(saved, review);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="sticky top-14 z-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-chart-1/40 bg-card px-4 py-2.5 shadow-sm">
        <p role="status" className="text-sm font-medium">
          {changes === 0 ? 'Editing: no changes yet' : `Editing: ${countLabel(changes)}`}
          {invalid > 0 ? (
            <span className="font-normal text-destructive"> · fix {countErrors(invalid)}</span>
          ) : null}
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Discard {countLabel(changes)}?</span>
            <Button
              id={fieldId('keep-editing')}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                focusNext.current = fieldId('discard');
                setConfirming(false);
              }}
            >
              Keep editing
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onClose}>
              Discard changes
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              id={fieldId('discard')}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (changes === 0) {
                  onClose();
                  return;
                }
                focusNext.current = fieldId('keep-editing');
                setConfirming(true);
              }}
            >
              <X aria-hidden />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-disabled={blocked}
              className={DISABLED}
              onClick={() => {
                save(false);
              }}
            >
              <Check aria-hidden />
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              aria-disabled={blocked || !canReview}
              className={DISABLED}
              title={canReview ? undefined : 'No reviews left this week: Save keeps your changes'}
              onClick={() => {
                save(true);
              }}
            >
              <RefreshCw aria-hidden />
              Save and review
            </Button>
          </div>
        )}
        {saveFailed ? (
          <p role="alert" className="w-full text-sm text-destructive">
            These changes could not be saved. Review the fields and try again.
          </p>
        ) : null}
      </div>

      <section aria-labelledby="edit-header-heading" className={CARD}>
        <h2 id="edit-header-heading" className={cn(HEADING, 'mb-3')}>
          Header and about
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {HEADER_FIELDS.map((field) => (
            <Field
              key={field.name}
              id={fieldId(headerErrorKey(field.name))}
              field={field}
              value={draft.header[field.name] ?? ''}
              original={draft.originalHeader[field.name] ?? ''}
              changed={headerFieldChanged(draft, field.name)}
              error={errors[headerErrorKey(field.name)]}
              onChange={(value) => {
                setDraft((d) => setHeaderField(d, field.name, value));
              }}
            />
          ))}
        </div>
      </section>

      {SECTIONS.map((section) => (
        <Section
          key={section.id}
          section={section}
          items={draft.sections[section.id]}
          errors={errors}
          profile={profile}
          onChange={setDraft}
          focus={(id) => {
            focusNext.current = id;
          }}
        />
      ))}
    </div>
  );
}

function countLabel(changes: number): string {
  return `${String(changes)} ${changes === 1 ? 'change' : 'changes'}`;
}

function countErrors(errors: number): string {
  return `${String(errors)} ${errors === 1 ? 'field' : 'fields'}`;
}

function Section({
  section,
  items,
  errors,
  profile,
  onChange,
  focus,
}: {
  readonly section: SectionDef;
  readonly items: readonly DraftItem[];
  readonly errors: Readonly<Record<string, string>>;
  readonly profile: Profile;
  readonly onChange: (update: (draft: ProfileDraft) => ProfileDraft) => void;
  readonly focus: (id: string) => void;
}) {
  const [first] = section.fields;
  const headingId = `edit-${section.id}-heading`;
  // A saved skill can only be deleted, so it needs no form: forms are for what is new.
  const fixed = section.fixedOnceSaved === true;
  const cards = fixed ? items.filter((i) => i.original === null) : items;
  const chips = fixed ? items.filter((i) => i.original !== null) : [];
  return (
    <section aria-labelledby={headingId} className={CARD}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className={HEADING}>
          {section.title}
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onChange((draft) => {
              const added = addItem(draft, section.id);
              if (first) focus(fieldId(itemErrorKey(section.id, added.key, first.name)));
              return added.draft;
            });
          }}
        >
          <Plus aria-hidden />
          {section.addLabel}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : null}
      {cards.length > 0 ? (
        <ul role="list" className="flex flex-col gap-3">
          {cards.map((item) => (
            <Item
              key={item.key}
              section={section}
              item={item}
              errors={errors}
              profile={profile}
              onChange={onChange}
              focus={focus}
            />
          ))}
        </ul>
      ) : null}
      {chips.length > 0 ? (
        <SkillChips
          section={section}
          items={chips}
          onChange={onChange}
          focus={focus}
          className={cards.length > 0 ? 'mt-3' : undefined}
        />
      ) : null}
    </section>
  );
}

/** Saved skills by category, as compact as on the read view (owner, #170). */
function SkillChips({
  section,
  items,
  onChange,
  focus,
  className,
}: {
  readonly section: SectionDef;
  readonly items: readonly DraftItem[];
  readonly onChange: (update: (draft: ProfileDraft) => ProfileDraft) => void;
  readonly focus: (id: string) => void;
  readonly className?: string | undefined;
}) {
  const groups = new Map<string, DraftItem[]>();
  for (const item of items) {
    const category = item.value.category ?? '';
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return (
    <dl className={cn('flex flex-col gap-2.5', className)}>
      {[...groups].map(([category, group]) => (
        <div key={category} className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-primary">{category}</dt>
          <dd>
            <ul role="list" className="flex flex-wrap gap-1.5">
              {group.map((item) => {
                const name = item.value.name ?? '';
                const deleteId = fieldId(`${section.id}-${item.key}-delete`);
                const undoId = fieldId(`${section.id}-${item.key}-undo`);
                return (
                  <li
                    key={item.key}
                    className={cn(
                      CHIP,
                      item.removed
                        ? 'border-destructive/50 bg-destructive/10'
                        : 'border-chart-1/40 bg-chart-1/10',
                    )}
                  >
                    {item.removed ? (
                      <>
                        <del className="min-w-0 break-words no-underline">− {name}</del>
                        <button
                          id={undoId}
                          type="button"
                          aria-label={`Undo delete: ${name}`}
                          title="Undo"
                          className={CHIP_BUTTON}
                          onClick={() => {
                            focus(deleteId);
                            onChange((draft) => restoreItem(draft, section.id, item.key));
                          }}
                        >
                          <Undo2 aria-hidden className="size-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 break-words">{name}</span>
                        <button
                          id={deleteId}
                          type="button"
                          aria-label={`Delete: ${name}`}
                          title="Delete"
                          className={CHIP_BUTTON}
                          onClick={() => {
                            focus(undoId);
                            onChange((draft) => removeItem(draft, section.id, item.key));
                          }}
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Item({
  section,
  item,
  errors,
  profile,
  onChange,
  focus,
}: {
  readonly section: SectionDef;
  readonly item: DraftItem;
  readonly errors: Readonly<Record<string, string>>;
  readonly profile: Profile;
  readonly onChange: (update: (draft: ProfileDraft) => ProfileDraft) => void;
  readonly focus: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = section.summary(item.original ?? item.value);
  const deleteId = fieldId(`${section.id}-${item.key}-delete`);
  const undoId = fieldId(`${section.id}-${item.key}-undo`);

  if (item.removed) {
    const losing = skillsLosingEvidence(profile, section.id, item.key);
    return (
      <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-destructive/40 p-3">
        <div className="text-sm">
          <SplitDiff before={name} after="" />
        </div>
        {losing.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Saving also removes its evidence from: {losing.join(', ')}.
          </p>
        ) : null}
        <Button
          id={undoId}
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          aria-label={`Undo delete: ${name}`}
          onClick={() => {
            focus(deleteId);
            onChange((draft) => restoreItem(draft, section.id, item.key));
          }}
        >
          <Undo2 aria-hidden />
          Undo
        </Button>
      </li>
    );
  }

  const isNew = item.original === null;
  const edited = !isNew && section.fields.some((f) => itemFieldChanged(item, f.name));
  const hasError = section.fields.some(
    (f) => errors[itemErrorKey(section.id, item.key, f.name)] !== undefined,
  );
  const title = section.summary(item.value);
  const remove = (
    <Button
      id={deleteId}
      type="button"
      size="sm"
      variant="ghost"
      aria-label={`Delete: ${title}`}
      onClick={() => {
        if (!isNew) focus(undoId);
        onChange((draft) => removeItem(draft, section.id, item.key));
      }}
    >
      <Trash2 aria-hidden />
      Delete
    </Button>
  );
  const labels = (
    <>
      <span className="min-w-0 font-semibold break-words">{title}</span>
      {isNew ? <span className="text-2xs font-medium text-success">+ New</span> : null}
      {edited ? <span className="text-2xs font-medium text-primary">Edited</span> : null}
    </>
  );
  const shell = cn('min-w-0 rounded-lg border', isNew && 'border-success/50 bg-success/5');

  return (
    <li className={cn(shell, 'relative')}>
      {/* Folded: a long career would otherwise be pages of inputs. What needs the user stays open.
          Delete sits over the summary, not in it: a control inside a control fails WCAG 4.1.2. */}
      <details
        open={open || isNew || hasError}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
        }}
        className="group"
      >
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg py-1.5 pr-24 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          />
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{labels}</span>
        </summary>
        <div className="grid gap-3 border-t p-3 md:grid-cols-2">
          {section.fields.map((field) => {
            const key = itemErrorKey(section.id, item.key, field.name);
            return (
              <Field
                key={field.name}
                id={fieldId(key)}
                field={field}
                value={item.value[field.name] ?? ''}
                original={item.original?.[field.name] ?? ''}
                changed={itemFieldChanged(item, field.name)}
                error={errors[key]}
                onChange={(value) => {
                  onChange((draft) => setItemField(draft, section.id, item.key, field.name, value));
                }}
              />
            );
          })}
        </div>
      </details>
      <div className="absolute top-1.5 right-1.5">{remove}</div>
    </li>
  );
}

function Field({
  id,
  field,
  value,
  original,
  changed,
  error,
  onChange,
}: {
  readonly id: string;
  readonly field: FieldDef;
  readonly value: string;
  readonly original: string;
  readonly changed: boolean;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // An empty new field is not a mistake yet: it says so once the user left it. Save still counts it.
  const [left, setLeft] = useState(false);
  const shownError = left || value !== '' ? error : undefined;
  const describedBy = [field.hint ? hintId : null, shownError ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const shared = {
    id,
    value,
    className: INPUT,
    'aria-invalid': shownError ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (event: { target: { value: string } }) => {
      onChange(event.target.value);
    },
    onBlur: () => {
      setLeft(true);
    },
  };
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1',
        // A diff needs both columns, so a changed field takes the row.
        (field.wide === true || changed) && 'md:col-span-2',
      )}
    >
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required ? <span aria-hidden> *</span> : null}
      </label>
      {field.kind === 'multiline' ? (
        <textarea {...shared} rows={3} required={field.required} />
      ) : field.kind === 'level' ? (
        <select {...shared}>
          {LEVEL_OPTIONS.map(([level, label]) => (
            <option key={level} value={level}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} type="text" required={field.required} />
      )}
      {field.hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {field.hint}
        </p>
      ) : null}
      {shownError ? (
        <p id={errorId} className="text-xs text-destructive">
          {shownError}
        </p>
      ) : null}
      {changed ? <SplitDiff before={original} after={value} className="mt-1" /> : null}
    </div>
  );
}
