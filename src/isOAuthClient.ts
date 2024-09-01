import type { IOAuthStrategy, WixClient } from '@wix/sdk';

export const isOAuthClient = (
  wix: WixClient,
): wix is WixClient<undefined, IOAuthStrategy> => {
  return (
    'generateOAuthData' in wix &&
    'getAuthUrl' in wix &&
    'parseFromUrl' in wix &&
    'getMemberTokens' in wix
  );
};
