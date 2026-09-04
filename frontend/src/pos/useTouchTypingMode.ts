import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { IS_TOUCH } from '../isTouch';

/**
 * Keeps a text field usable by a hardware scanner without letting Android
 * raise its on-screen keyboard uninvited.
 *
 * The problem this solves twice over: on a tablet, a focused text field
 * summons a keyboard that covers half the screen — and on a page running in
 * the Fullscreen API (which is every cashier session, see enterFullscreen),
 * that keyboard makes Android tear fullscreen down and rebuild it, which
 * shows as a ~2s black screen. A field that auto-focuses on open (so a
 * scanned loyalty card has somewhere to land) therefore triggers both the
 * moment its dialog appears.
 *
 * So: focused but `inputMode="none"` by default — a wedge scanner still
 * types into it perfectly, Android has nothing to raise — and only a
 * deliberate tap switches to real typing. The blur-then-refocus is not
 * optional: Android only reconsiders the keyboard when an element *takes*
 * focus, so flipping inputMode on an already-focused field would leave the
 * keyboard shut. Same technique ProductSearch's search box uses.
 *
 * Spread `fieldProps` onto the MUI TextField.
 */
export function useTouchTypingMode() {
  const [typingMode, setTypingMode] = useState(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!IS_TOUCH || typingMode) return;
      setTypingMode(true);
      // The TextField root is what receives this; the actual <input> is
      // inside it, and it's the input that has to lose and retake focus.
      const input = e.currentTarget.querySelector('input');
      if (!input) return;
      input.blur();
      requestAnimationFrame(() => input.focus());
    },
    [typingMode],
  );

  return {
    /** Back to scanner mode — call when the field's dialog closes or its value is consumed. */
    reset: useCallback(() => setTypingMode(false), []),
    /** Goes on the MUI TextField itself (it forwards to the root element). */
    onPointerDown,
    /** Goes on the underlying <input>, via slotProps.htmlInput. Undefined on a mouse device, which has no on-screen keyboard to suppress. */
    inputMode: (IS_TOUCH ? (typingMode ? 'text' : 'none') : undefined) as 'text' | 'none' | undefined,
  };
}
