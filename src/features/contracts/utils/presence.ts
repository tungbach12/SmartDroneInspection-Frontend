import { useEffect, useState } from 'react';

/**
 * Lightweight real-time presence broadcaster & listener between browser tabs/windows.
 * Detects whether a Manager / Admin is currently online and active.
 */

const PRESENCE_KEY = 'sdi_presence_manager_heartbeat';
const HEARTBEAT_INTERVAL_MS = 3000;
const PRESENCE_TIMEOUT_MS = 7000;

/**
 * Starts broadcasting Manager presence heartbeat while the Manager is active.
 * Cleans up immediately on tab close or unmount.
 */
export function startManagerPresenceHeartbeat(): () => void {
  const sendHeartbeat = () => {
    try {
      localStorage.setItem(PRESENCE_KEY, String(Date.now()));
    } catch {
      // storage unavailable
    }
  };

  sendHeartbeat();
  const timer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  const handleUnload = () => {
    try {
      localStorage.setItem(PRESENCE_KEY, '0');
    } catch {
      // storage unavailable
    }
  };

  window.addEventListener('beforeunload', handleUnload);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener('beforeunload', handleUnload);
    try {
      localStorage.setItem(PRESENCE_KEY, '0');
    } catch {
      // storage unavailable
    }
  };
}

/**
 * Checks whether a Manager is actively online right now based on heartbeat timestamp.
 */
export function isManagerCurrentlyOnline(): boolean {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (!raw || raw === '0') return false;
    const lastHeartbeat = Number(raw);
    return Date.now() - lastHeartbeat < PRESENCE_TIMEOUT_MS;
  } catch {
    return false;
  }
}

/**
 * Hook that:
 * 1. If current user is Manager/Admin -> broadcasts heartbeat so other tabs know Manager is active.
 * 2. If current user is Customer -> listens to heartbeat to know whether a Manager is actively online right now.
 */
export function useManagerPresence(isManagerRole: boolean): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => isManagerCurrentlyOnline());

  useEffect(() => {
    if (isManagerRole) {
      const stopHeartbeat = startManagerPresenceHeartbeat();
      setIsOnline(true);
      return stopHeartbeat;
    }

    const checkOnline = () => {
      setIsOnline(isManagerCurrentlyOnline());
    };

    checkOnline();
    const interval = window.setInterval(checkOnline, 2500);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PRESENCE_KEY) {
        checkOnline();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isManagerRole]);

  return isOnline;
}
