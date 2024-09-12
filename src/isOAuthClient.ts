import type { IOAuthStrategy, WixClient } from '@wix/sdk';

export const isOAuthClient = (
  wix: WixClient,
): wix is WixClient<undefined, IOAuthStrategy> => {
  return (
    'generateOAuthData' in wix.auth &&
    'getAuthUrl' in wix.auth &&
    'parseFromUrl' in wix.auth &&
    'getMemberTokens' in wix.auth
  );
};
