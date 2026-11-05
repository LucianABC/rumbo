'use client';

import type { Profile } from '@rumbo/contracts';
import type { ProfileAnalysis } from '@rumbo/contracts/provisional';
import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  profileCompleteness,
  profileProvenance,
  type Suggestion,
} from '../../lib/profile/profile-view';
import { nextReviewAt, reviewsLeft, reviewState } from '../../lib/profile/review-limit';
import { useEditedProfile, useProfileReviews } from '../../lib/store';
import { PageHeader } from '../page-header';
import { Button } from '../ui/button';
import { CompletenessBar } from './completeness-bar';
import { ProfileCv } from './profile-cv';
import { ProfileEditor } from './profile-editor';
import { ProfileReviewBar } from './profile-review-bar';
import { ProfileSources } from './profile-sources';

/** Long enough to read as work being done. */
const SAMPLE_REVIEW_MS = 1500;

/**
 * The Profile tab, read or edited (docs/product/views.md, #170). What the user saved replaces the
 * imported profile everywhere on this page: bar, header and CV.
 */
export function ProfileView({
  imported,
  analysis,
  suggestions,
  now,
}: {
  readonly imported: Profile;
  readonly analysis: ProfileAnalysis | null;
  readonly suggestions: readonly Suggestion[];
  readonly now: Date;
}) {
  const { edited, save } = useEditedProfile();
  const [editing, setEditing] = useState(false);
  const { reviews, record } = useProfileReviews();
  const [reviewing, setReviewing] = useState(false);
  const profile = edited ?? imported;
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
            {editing ? null : (
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
      {edited && !editing ? (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Your edits last for this visit: saving them for good arrives with Profile (F1).
        </p>
      ) : null}
      {editing ? (
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
