'use client';

import { useCallback, useEffect, useState } from 'react';

export function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, error, loading, reload: run, setData };
}

const MESSAGES = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  EMAIL_AND_PASSWORD_REQUIRED: 'Enter an email address and password.',
  API_UNREACHABLE: 'Cannot reach the Katara API. Start it with `npm run dev:api`.',
  INVALID_TOKEN: 'Your session expired. Sign in again.',
  MISSING_TOKEN: 'Your session expired. Sign in again.',
  UNKNOWN_USER: 'Your session expired. Sign in again.',
  NO_PHARMACY_ASSIGNMENT: 'This account is not linked to a pharmacy yet.',
  FORBIDDEN_ROLE: 'This workspace is not allowed to view that data.',
  INVALID_TRANSITION: 'That status change is not allowed from the current state.',
  ALREADY_REVIEWED: 'This application was already reviewed.',
  UPLOAD_FAILED: 'The file could not be uploaded.',
  NOT_FOUND: 'That record no longer exists.'
};

export function apiErrorMessage(error) {
  if (!error) return null;
  const code = error.body?.error;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error.status === 0) return MESSAGES.API_UNREACHABLE;
  if (error.status === 401) return 'Your session expired. Sign in again.';
  if (error.status === 403) return MESSAGES.FORBIDDEN_ROLE;
  return code || error.message || 'Something went wrong.';
}
