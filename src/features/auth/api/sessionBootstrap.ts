import { restoreBrowserSession } from './authApi';
import { useAuthStore } from '../store/authStore';

let restoration: Promise<void> | null = null;

export function initializeBrowserSession(): Promise<void> {
  const store = useAuthStore.getState();
  if (store.status !== 'checking') {
    return Promise.resolve();
  }

  if (!restoration) {
    restoration = restoreBrowserSession()
      .then((flow) => {
        if (flow.step !== 'AUTHENTICATED' || !flow.accessToken) {
          throw new Error('No active browser session was restored.');
        }
        useAuthStore.getState().setSession({
          accessToken: flow.accessToken,
          user: flow.user,
        });
      })
      .catch(() => {
        // A demo session is synthetic (development-only quick access); never
        // wipe it when the real backend session restore fails or resolves late.
        if (useAuthStore.getState().accessToken?.startsWith('demo-')) {
          return;
        }
        useAuthStore.getState().clearSession();
      })
      .finally(() => {
        restoration = null;
      });
  }

  return restoration;
}
