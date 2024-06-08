import {
  OauthData,
  type IOAuthStrategy,
  type Tokens,
  type WixClient,
} from '@wix/sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import WebView from 'react-native-webview';
import { TooManyComponentsError, UnauthorizedCallbackUrl } from './errors';
import { global } from './global';
import { DEFAULT_CALLBACK_URL } from './const';

type IOAuthClient = WixClient<undefined, IOAuthStrategy>;

export interface WixLoginProps {
  /** Your app's Wix client. It must use OAuthStrategy */
  client: IOAuthClient;
  /** A callback that is called with the logged in member's credential tokens */
  onLoginComplete(tokens: Tokens): void;
  /** Optional. A callback that is called if the user aborts login */
  onLoginCanceled?(): void;
  /** Optional. Override the builtin callback URL from the login flow. Use only if you need deeper control of the app's deep linking features */
  customCallbackUrl?: string;
}

/**
 * Encapsulates the entire login process.
 * When you open it using the useWixLogin hook, it opens a modal that contains the Wix login form.
 * Once the user successfully logs in, that modal closes and a callback is called.
 *
 * This component uses the "Wix Managed Login" flow.
 * Learn more about it at: https://dev.wix.com/docs/go-headless/coding/java-script-sdk/visitors-and-members/handle-members-with-wix-managed-login
 *
 * @example
 * // create a Wix SDK client
 * const client = createClient({ auth: OAuthStrategy({ clientId: '<XXX>' })});
 *
 * // Mount the <WixLogin /> component at the root of your app
 * <WixLogin client={client} onLoginComplete={tokens => client.auth.setTokens(tokens)} />
 *
 * // From anywhere in your app, open the login modal using the hook:
 * const wixLogin = useWixLogin();
 * wixLogin.openLoginModal();
 */
export const WixLogin = ({
  client,
  onLoginComplete,
  onLoginCanceled,
  customCallbackUrl,
}: WixLoginProps) => {
  const isMounted = useRef(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const oAuthData = useRef<OauthData | null>(null);
  const [authUrl, setAuthUrl] = useState('');

  const callbackUrl = useMemo(
    () => Linking.createURL(customCallbackUrl ?? DEFAULT_CALLBACK_URL),
    [customCallbackUrl],
  );

  useEffect(() => {
    if (global.__OPEN_WIX_LOGIN_MODAL) {
      throw new TooManyComponentsError();
    }

    Linking.addEventListener('url', (event) => onLoginCallback(event.url));
    global.__OPEN_WIX_LOGIN_MODAL = openModal;
    isMounted.current = true;

    return function onUnmount() {
      delete global.__OPEN_WIX_LOGIN_MODAL;
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      // @ts-expect-error we're monkey patching crypto
      globalThis.crypto = Crypto;

      const authData = client.auth.generateOAuthData(callbackUrl);
      client.auth.getAuthUrl(authData).then((res) => setAuthUrl(res.authUrl));

      oAuthData.current = authData;
    } else {
      setAuthUrl('');
    }
  }, [isModalOpen]);

  function openModal() {
    if (isMounted.current) {
      setIsModalOpen(true);
    }
  }

  async function onLoginCallback(withUrl: string) {
    if (!isMounted.current || !oAuthData.current) {
      return;
    }

    const { code, state } = client.auth.parseFromUrl(withUrl);
    const tokens = await client.auth.getMemberTokens(
      code,
      state,
      oAuthData.current,
    );

    onLoginComplete(tokens);
    setIsModalOpen(false);
  }

  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <ActivityIndicator />
    </View>
  );

  const renderWebview = () => (
    <SafeAreaView style={styles.webviewContainer}>
      <WebView
        source={{ uri: authUrl }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode === 400) {
            setIsModalOpen(false);
            throw new UnauthorizedCallbackUrl(callbackUrl);
          }
        }}
        onMessage={(e) => {
          if (e.nativeEvent.data === '__wix_login_rn_close') {
            onLoginCanceled?.();
            setIsModalOpen(false);
          }
        }}
        injectedJavaScript={`
          setInterval(() => {
            if (document.querySelector('[data-testid="xButton"]:not([data-marked=true])')) {
              document.querySelector('[data-testid="xButton"]').addEventListener('click', () => window.postMessage('__wix_login_rn_close'));
              document.querySelector('[data-testid="xButton"]').setAttribute('data-marked', 'true');
            }
          }, 1000)
        `}
      />
    </SafeAreaView>
  );

  return (
    <Modal visible={isModalOpen} animationType="slide">
      {!authUrl && renderLoader()}
      {authUrl && renderWebview()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webviewContainer: {
    flex: 1,
    width: '100%',
  },
});
