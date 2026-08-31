'use client';

import { Amplify } from 'aws-amplify';

let configured = false;

export function isCognitoConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTH_MODE === 'cognito' &&
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID &&
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
  );
}

export function configureAmplify() {
  if (configured || !isCognitoConfigured()) return;

  const cognito = {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    loginWith: { email: true }
  };

  if (process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID) {
    cognito.identityPoolId = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID;
  }

  Amplify.configure({ Auth: { Cognito: cognito } });
  configured = true;
}
