import { configure } from '@testing-library/react';

/**
 * The full suite runs 55 jsdom environments at once, so a page's first paint can take longer than
 * the 1000 ms default async timeout even when nothing is wrong. This is the same reason
 * `testTimeout` is raised in `vite.config.ts`; without it a `findBy*` assertion fails against a
 * still-loading page and reports a missing element instead of a slow one.
 */
configure({ asyncUtilTimeout: 5000 });
