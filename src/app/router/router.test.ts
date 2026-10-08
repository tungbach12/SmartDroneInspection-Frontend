import { describe, expect, it } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import { router } from './router';

describe('retired provider routes', () => {
  it.each(['/register-provider', '/activate-provider', '/operations/team'])(
    'does not match the retired route %s',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).toBe('*');
    },
  );
});
