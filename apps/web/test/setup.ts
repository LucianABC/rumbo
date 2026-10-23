import type * as Navigation from 'next/navigation';
import { vi } from 'vitest';

// Pages render outside a Next request here, so there is no App Router to mount. Views that
// navigate (the map selects a line, #148) only need a router that does nothing.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof Navigation>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
