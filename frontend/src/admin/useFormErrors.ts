import { useState } from 'react';
import { ApiError } from '../api/client';

/**
 * Splits an API error into field-specific messages (shown as a label under
 * the offending input, like the Login screen) versus a single generic
 * message for anything that isn't tied to one field (e.g. a 404, a
 * conflict, or a deliberately non-specific message like "Invalid
 * credentials"). Mirrors the pattern in Login.tsx.
 */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function clearErrors() {
    setFieldErrors(null);
    setFormError(null);
  }

  /** Clears just one field's error — call from that field's onChange so the label disappears as soon as the user edits it. */
  function clearField(field: string) {
    setFieldErrors((prev) => (prev?.[field] ? { ...prev, [field]: '' } : prev));
  }

  function reportError(err: unknown, fallback: string) {
    // Only a real 422 validation failure carries field-specific messages —
    // other error responses (e.g. a 500's debug payload of
    // {exception, file, line}) can also have a truthy `errors` object, but
    // its keys won't match any real field, silently showing nothing if
    // routed into fieldErrors instead of the generic banner.
    if (err instanceof ApiError && err.status === 422 && err.errors) {
      setFieldErrors(err.errors);
      setFormError(null);
    } else {
      setFormError(err instanceof ApiError ? err.message : fallback);
      setFieldErrors(null);
    }
  }

  return { fieldErrors, formError, clearErrors, clearField, reportError };
}
