/**
 * A touch screen (phone/tablet) rather than a mouse. Read once at module
 * load: a device doesn't grow a mouse mid-shift, and re-evaluating per
 * render would only add churn.
 *
 * Shared by anything that has to choose between "focus this field so a
 * physical keyboard/scanner can type into it hands-free" (the right call
 * with a mouse) and "don't — that summons the on-screen keyboard over
 * half the screen, uninvited" (the right call on touch). See ProductSearch's
 * scanner/typing modes and AddQuantityDialog for the two places this
 * actually changes behaviour.
 */
export const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
