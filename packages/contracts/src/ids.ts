import { z } from 'zod';

/** Ids shared by the roadmap and its layout: one format, so both validate the same references. */
export const Id = z.string().regex(/^[a-z0-9-]+$/);

/** Links the UI renders as `href`: http(s) only, so data can never inject `javascript:` URLs. */
export const WebUrl = z.url({ protocol: /^https?$/ });
