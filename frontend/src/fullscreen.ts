/**
 * Fullscreen handling for the app.
 *
 * The register used to take over the whole screen: signing in as a cashier
 * requested fullscreen, and the POS screen re-requested it on the next
 * gesture whenever it was lost (a reload, or Esc, which browsers handle at
 * the UA level). Both were removed at the owner's request — a cashier now
 * signs in to an ordinary browser window, chrome and all, and nothing in
 * the app asks for fullscreen. `exitFullscreen` below is kept because a
 * cashier can still put the browser in fullscreen themselves with F11, and
 * logging out should hand the machine back in a normal state.
 *
 * The knowledge worth keeping from that feature, because it still explains
 * why other things in the POS look the way they do:
 *
 * The Fullscreen API and Android's on-screen keyboard do not coexist.
 * Fullscreen won't resize the page around the keyboard, so the keyboard
 * simply covers whatever is underneath it (repeatedly burying dialog
 * buttons), and dismissing it makes Android tear fullscreen down and
 * rebuild — which shows as a roughly 2s black screen. That hits *every*
 * text field, so it could never be solved field by field. The quantity
 * keypad (AddQuantityDialog) and the scanner-mode inputMode trick
 * (useTouchTypingMode) each removed one keyboard for that reason, and both
 * remain worth having on their own merits.
 *
 * That incompatibility was also why fullscreen was skipped on touch
 * devices entirely. It was lifted once, to give plain-HTTP LAN deployments
 * some kiosk mode at all (a PWA only installs over HTTPS), on the theory
 * that the two keypads had reduced the exposure to alphabetic fields
 * alone. Tried on the real Android device and reverted: fullscreen there
 * was still not usable. If a chrome-free tablet register is ever wanted
 * again, serve over HTTPS and install the PWA — that is chrome-free
 * *without* the Fullscreen API, and so has none of this.
 */

/**
 * Hands the browser chrome back on logout. Unlike requesting fullscreen,
 * exiting needs no user gesture, so this is safe to call unconditionally
 * from AuthContext's logout() regardless of what triggered it — and it's a
 * no-op unless something (now only the user's own F11) actually put the
 * page in fullscreen.
 */
export function exitFullscreen(): void {
  if (!document.fullscreenElement) return;
  document.exitFullscreen?.().catch(() => {});
}
