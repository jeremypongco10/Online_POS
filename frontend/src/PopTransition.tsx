import { forwardRef, type ReactElement, type Ref } from 'react';
import Grow from '@mui/material/Grow';
import type { TransitionProps } from '@mui/material/transitions';

// Dialog's default Fade reads as barely-there — Grow gives modals an
// actual pop (scale + fade) as they enter, which is a lot more noticeable.
export const PopTransition = forwardRef(function PopTransition(
  props: TransitionProps & { children: ReactElement<unknown> },
  ref: Ref<unknown>
) {
  return <Grow ref={ref} timeout={180} {...props} />;
});
