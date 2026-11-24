'use client';

import type { Profile } from '@rumbo/contracts';
import type { ProfileAnalysis, TailoredCv } from '@rumbo/contracts/provisional';
import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  profileCompleteness,
  profileProvenance,
  type Suggestion,
} from '../../lib/profile/profile-view';
import { nextReviewAt, reviewsLeft, reviewState } from '../../lib/profile/review-limit';
import type { Lane } from '../../lib/roadmap/single-line';
import { useEditedProfile, useProfileReviews } from '../../lib/store';
import { PageHeader } from '../page-header';
import { LineSwitcher } from '../roadmap/line-switcher';
import { Button } from '../ui/button';
import { CompletenessBar } from './completeness-bar';
import { ProfileCv } from './profile-cv';
import { ProfileEditor } from './profile-editor';
import { ProfileReviewBar } from './profile-review-bar';
import { ProfileSources } from './profile-sources';
import { TargetCv } from './target-cv';

/** Long enough to read as work being done. */
const SAMPLE_REVIEW_MS = 1500;

/**
 * The Profile tab, read or edited (docs/product/views.md, #170). What the user saved replaces the
 * imported profile everywhere on this page: bar, header and CV. Sub-tabs pick Base, where the
 * profile is edited, or one target's CV (#191).
 */
export function ProfileView({
  imported,
  analysis,
  suggestions,
  lanes,
  targetId,
  cvs,
  now,
}: {
  readonly imported: Profile;
  readonly analysis: ProfileAnalysis | null;
  readonly suggestions: readonly Suggestion[];
  /** Every active target, primary first, for the sub-tabs. */
  readonly lanes: readonly Lane[];
  /** The target whose CV shows; null for Base. */
  readonly targetId: string | null;
  /** Null when the CVs could not be read. */
  readonly cvs: readonly TailoredCv[] | null;
  readonly now: Date;
}) {
  const { edited, save } = useEditedProfile();
  const [editing, setEditing] = useState(false);
  const { reviews, record } = useProfileReviews();
  const [reviewing, setReviewing] = useState(false);
  const profile = edited ?? imported;
  const lane = lanes.find((l) => l.target.id === targetId) ?? null;
  const { percent, next } = profileCompleteness(profile);
  const reviewedAt = reviews.at(-1) ?? analysis?.analyzedAt ?? null;
  const state = reviewState(profile.updatedAt, reviewedAt);
  const left = reviewsLeft(reviews, now);

  // A sample until F1 (#41): it runs nothing, it only records that a review happened.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  const review = () => {
    setReviewing(true);
    timer.current = setTimeout(() => {
      record(new Date().toISOString());
      setReviewing(false);
    }, SAMPLE_REVIEW_MS);
  };

  // Leaving edit mode removes everything that held focus: it returns to the button that opened it.
  const button = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) button.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  return (
    <>
      <PageHeader
        title="Profile"
        provenance={profileProvenance(profile)}
        action={
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <CompletenessBar
              percent={percent}
              next={next}
              suggestions={suggestions}
              className="w-full sm:w-96"
            />
            {editing || lane ? null : (
              <Button
                ref={button}
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(true);
                }}
              >
                <Pencil aria-hidden />
                Edit profile
              </Button>
            )}
          </div>
        }
      />
      {/* Leaving Base mid-edit would drop the edit, so the sub-tabs wait until it is saved. */}
      {editing ? null : (
        <LineSwitcher
          lanes={lanes}
          selectedId={lane?.target.id ?? null}
          param="target"
          label="Show CV"
          all={{ label: 'Base', href: '/profile' }}
          className="mb-4"
        />
      )}
      {lane ? (
        <TargetCv
          key={lane.target.id}
          lane={lane}
          cv={cvs?.find((cv) => cv.targetId === lane.target.id) ?? null}
          unavailable={cvs === null}
          imported={imported}
          current={profile}
          now={now}
        />
      ) : null}
      {!lane && edited && !editing ? (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Your edits last for this visit: saving them for good arrives with Profile (F1).
        </p>
      ) : null}
      {lane ? null : editing ? (
        <ProfileEditor
          profile={profile}
          canReview={left > 0 && !reviewing}
          onSave={(saved, thenReview) => {
            save(saved);
            setEditing(false);
            if (thenReview) review();
          }}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : (
        <>
          <ProfileReviewBar
            editedAt={profile.updatedAt}
            reviewedAt={reviewedAt}
            state={state}
            left={left}
            nextAt={nextReviewAt(reviews, now)}
            reviewing={reviewing}
            sampled={reviews.length > 0}
            onReview={review}
          />
          <ProfileSources profile={profile} />
          <ProfileCv
            profile={profile}
            analysis={analysis}
            edited={edited !== null}
            analysisOutdated={state === 'outdated'}
            now={now}
          />
        </>
      )}
    </>
  );
}
