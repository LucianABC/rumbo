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
      /** The position's title, to name it. */
      readonly title: string;
      /** The whole position is left out of this CV. */
      readonly omitted: boolean;
      readonly removed: readonly string[];
      readonly added: readonly string[];
    }
  | {
      readonly section: 'skills';
      /** Names of the profile's skills this CV leaves out. */
      readonly omitted: readonly string[];
    };
