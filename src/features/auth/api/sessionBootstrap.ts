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
        useAuthStore.getState().clearSession();
      })
      .finally(() => {
        restoration = null;
      });
  }

  return restoration;
}
