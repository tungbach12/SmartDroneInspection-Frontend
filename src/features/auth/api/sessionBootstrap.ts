import { restoreBrowserSession } from './authApi';
import { useAuthStore } from '../store/authStore';

let restoration: Promise<void> | null = null;

export function initializeBrowserSession(): Promise<void> {
  const store = useAuthStore.getState();
  if (store.status !== 'checking') {
    return Promise.resolve();
  }

  if (import.meta.env.DEV) {
    const devSaved = localStorage.getItem('sdi_dev_session');
    if (devSaved) {
      try {
        const session = JSON.parse(devSaved);
        if (session?.accessToken && session?.user) {
          store.setSession(session);
          return Promise.resolve();
        }
      } catch {
        // continue normal flow
      }
    }
  }

  if (!restoration) {
    restoration = restoreBrowserSession()
      .then((flow) => {
        // A user may complete login while the initial refresh request is still in flight. That
        // request belongs to the anonymous bootstrap; do not let its older cookie/session response
        // replace the role the explicit login just established.
        if (useAuthStore.getState().status !== 'checking') {
          return;
        }
        if (flow.step !== 'AUTHENTICATED' || !flow.accessToken) {
          throw new Error('No active browser session was restored.');
        }
        useAuthStore.getState().setSession({
          accessToken: flow.accessToken,
          user: flow.user,
        });
      })
      .catch(() => {
        // A refresh failure is only authoritative while the initial restoration is still pending.
        // If login already succeeded, a stale restore rejection must not clear the fresh session.
        if (useAuthStore.getState().status === 'checking') {
          useAuthStore.getState().clearSession();
        }
      })
      .finally(() => {
        restoration = null;
      });
  }

  return restoration;
}
