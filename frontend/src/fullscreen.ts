import { IS_TOUCH } from './isTouch';

/**
 * Requests fullscreen for the whole page — used to put the register into a
 * kiosk-like, chrome-free view the moment a cashier signs in.
 *
 * Deliberately a no-op on touch devices. The Fullscreen API and Android's
 * on-screen keyboard don't coexist: fullscreen won't resize the page around
 * the keyboard, so the keyboard simply covers whatever is underneath it
 * (repeatedly burying dialog buttons), and dismissing it makes Android tear
 * fullscreen down and rebuild — which shows as a ~2s black screen. That hits
 * *every* text field, so it can't be solved field by field; the quantity
 * keypad and the scanner-mode inputMode trick each removed one keyboard, but
 * anything genuinely alphabetic (searching a customer by name) still needs
 * one. Giving up chrome-free on a tablet is the smaller loss. A real
 * kiosk experience there wants "Add to Home Screen" (a standalone PWA),
 * which is chrome-free *without* the Fullscreen API and so has none of this.
 *
 * On a mouse/desktop terminal there's no on-screen keyboard and none of the
 * above applies, so it still does exactly what it always did.
 *
 * Every browser refuses a fullscreen request that didn't originate from a
 * user gesture (a page could otherwise hijack the screen on load). Signing
 * in is one: the form's submit event is the gesture, and that "permission"
 * stays valid for a few seconds across the async login call — but only if
 * this runs shortly after, in the same call chain. Call it right after
 * `await login(...)` resolves, not from a `useEffect` reacting to the user
 * being set, which runs with no gesture behind it and is silently refused.
 *
 * Failure (permission denied, running inside an iframe without
 * `allow="fullscreen"`, an unsupported browser) is swallowed on purpose:
 * this is a nicety, and a cashier who is merely logged out of fullscreen
 * still has a fully working POS.
 */
export function enterFullscreen(): void {
  if (IS_TOUCH) return;
  if (document.fullscreenElement || !document.fullscreenEnabled) return;
  document.documentElement.requestFullscreen?.().catch(() => {});
}

/**
 * Hands the browser chrome back on logout — unlike entering, exiting
 * fullscreen needs no user gesture, so this is safe to call unconditionally
 * from AuthContext's logout() regardless of what triggered it.
 */
export function exitFullscreen(): void {
  if (!document.fullscreenElement) return;
  document.exitFullscreen?.().catch(() => {});
}
