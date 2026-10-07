import { onValue, ref as dbRef, remove, serverTimestamp, set, onDisconnect } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

export function usePresence(uid: string) {
  const presenceRef = dbRef(rtdb, `users/${uid}/presence`);
  async function goOnline() {
    await set(presenceRef, { online: true, lastSeen: serverTimestamp() });
    onDisconnect(presenceRef).remove();
  }
  async function goOffline() {
    await remove(presenceRef).catch(() => {});
  }
  function watch(cb: (v: unknown) => void) {
    return onValue(presenceRef, (s) => cb(s.val()));
  }
  return { goOnline, goOffline, watch };
}
