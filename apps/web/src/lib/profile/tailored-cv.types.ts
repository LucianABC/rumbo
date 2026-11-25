/** One piece of a target's CV that differs from Base (#191). */
export type CvChange =
  | {
      readonly section: 'headline' | 'about';
      /** Null when Base has none. */
      readonly before: string | null;
      /** Null when the CV leaves it out. */
      readonly after: string | null;
    }
  | {
      readonly section: 'position';
      readonly experienceId: string;
      /** The position's title, as the CV has it when it keeps one; to name it. */
      readonly title: string;
      /**
       * `omitted`: Base has it, the CV leaves it out. `reworded`: the CV rewrote its bullets.
       * `changedInBase`: Base changed its title, organization, dates or place since the CV was
       * written. `notInBase`: the CV still has a position Base has since dropped.
       */
      readonly status: 'omitted' | 'reworded' | 'changedInBase' | 'notInBase';
      readonly removed: readonly string[];
      readonly added: readonly string[];
    }
  | CvEntryChange;

/** Skills, education or certifications that differ between the CV and Base, by name (#191). */
export interface CvEntryChange {
  readonly section: 'skills' | 'education' | 'certifications';
  /** In Base, left out of this CV. */
  readonly omitted: readonly string[];
  /** In this CV, dropped from Base since it was written. */
  readonly notInBase: readonly string[];
  /** In both, changed in Base since this CV was written. */
  readonly changedInBase: readonly string[];
}
