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
 * This skip was lifted once, to give plain-HTTP LAN deployments some kiosk
 * mode at all (a PWA only installs over HTTPS), on the theory that the two
 * keypads had reduced the exposure to alphabetic fields alone. Tried on the
 * real Android device and reverted: fullscreen there was still not usable.
 * Don't re-enable it on touch without a fix for the keyboard interaction
 * itself — serve over HTTPS and install the PWA instead.
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

/**
 * Keeps the register chrome-free for as long as the POS screen is
 * mounted, re-entering fullscreen on the cashier's next click or keypress
 * whenever it has been lost.
 *
 * enterFullscreen() alone only covers the login itself, which leaves two
 * everyday ways back to an address bar:
 *
 *   - A restored session. Reloading the tab, reopening the browser, or
 *     returning with a still-valid token logs the cashier straight in
 *     without the login form — so nothing ever requests fullscreen.
 *   - Esc. Browsers exit fullscreen on Esc at the UA level; it isn't
 *     cancellable and the keydown may not even reach the page. The POS
 *     binds Esc for "back to search", so ordinary use drops out of it.
 *
 * Neither moment can request fullscreen itself — a page load isn't a user
 * gesture, and the Esc that exits is consumed by the browser. So this
 * waits for the *next* gesture instead, which on a till is the cashier's
 * very next scan or tap. Listening in the capture phase so a control that
 * stops propagation can't swallow it, and never calling preventDefault,
 * so the gesture still does whatever it was for.
 *
 * The deliberate consequence: a cashier can't stay out of fullscreen by
 * pressing Esc — their next interaction puts it back. Logging out is the
 * sanctioned way out (it exits fullscreen and unmounts the POS, so
 * nothing re-arms). That's the right trade for a register, and the wrong
 * one for a desk, which is why this is scoped to PosScreen rather than
 * the app root.
 *
 * Returns a disposer for the caller's effect cleanup. A no-op on touch,
 * for the on-screen-keyboard reasons in enterFullscreen's own docblock —
 * re-arming there would only re-trigger the very flicker that keeps this
 * API off tablets.
 */
export function keepFullscreen(): () => void {
  if (IS_TOUCH || !document.fullscreenEnabled) return () => {};

  const onGesture = () => {
    disarm();
    enterFullscreen();
  };

  function arm() {
    // Already chrome-free — nothing to recover, and arming would only
    // leave listeners waiting for a gesture that has nothing to do.
    if (document.fullscreenElement) return;
    window.addEventListener('pointerdown', onGesture, { capture: true, once: true });
    window.addEventListener('keydown', onGesture, { capture: true, once: true });
  }

  function disarm() {
    // Both come off together: `once` only retires whichever one actually
    // fired, and the other would otherwise sit armed for a gesture that's
    // already been handled.
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
  }

  arm();
  // Fires on the way out of fullscreen (Esc, or the browser's own F11)
  // as well as on the way in — arm() ignores the latter by checking
  // fullscreenElement first.
  document.addEventListener('fullscreenchange', arm);

  return () => {
    disarm();
    document.removeEventListener('fullscreenchange', arm);
  };
}
