import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The POS screen's lock state — manual (the account menu's Lock Screen
 * button, always available) or automatic (after `idleMinutes` of no
 * activity, when that's configured above 0 in Back Office → Settings →
 * Security). Purely a client-side UI state: the JWT this tab already
 * holds is never touched by locking or unlocking, so the cart, held
 * sales, and everything else PosScreen owns survive a lock exactly as
 * they were the moment it happened. See PosLockScreen for the overlay
 * this drives, and AuthController::verifyPassword for how "unlock"
 * actually checks the password without disturbing that session.
 *
 * `idleMinutes <= 0` disables the automatic half only — the returned
 * `lock()` still always works, since a cashier stepping away is worth
 * covering regardless of whether idle auto-lock is configured at all.
 */
export function useIdleLock(idleMinutes: number) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read inside the effect via a ref rather than putting `locked` in the
  // listener effect's own dependency array — that would tear down and
  // re-attach all five window listeners on every lock/unlock, for a
  // check that only needs the CURRENT value at the moment activity
  // happens, not a reason to re-subscribe.
  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const lock = useCallback(() => setLocked(true), []);
  const unlock = useCallback(() => setLocked(false), []);

  useEffect(() => {
    if (idleMinutes <= 0) return;
    const timeoutMs = idleMinutes * 60_000;

    function resetTimer() {
      // Once locked, further activity happens ON the lock screen itself
      // (typing a password, say) — that's not a reason to keep re-arming
      // a timer for a state the screen is already in.
      if (lockedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLocked(true), timeoutMs);
    }

    // click rather than mousedown/mouseup separately, and no mousemove —
    // a customer-facing till sees near-constant idle mouse drift from
    // whoever's standing near it, which would make "5 minutes idle"
    // effectively never fire. Keydown/click/touchstart/scroll are all
    // genuine, deliberate interaction; that's what "not idle" should mean
    // here.
    const events: (keyof WindowEventMap)[] = ['keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idleMinutes]);

  return { locked, lock, unlock };
}
