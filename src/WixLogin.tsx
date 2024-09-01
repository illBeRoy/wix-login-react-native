import { OauthData, type Tokens, type WixClient } from '@wix/sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Modal,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import WebView from 'react-native-webview';
import {
  ClientIsNotOAuthClientError,
  TooManyComponentsError,
  UnauthorizedCallbackUrl,
} from './errors';
import { global } from './global';
import { DEFAULT_CALLBACK_URL } from './const';
import { isOAuthClient } from './isOAuthClient';

export interface WixLoginProps {
  /** Your app's Wix client. It must use OAuthStrategy */
  client: WixClient;
  /** A callback that is called with the logged in member's credential tokens */
  onLoginComplete(tokens: Tokens): void;
  /** Optional. If true, allows the user to cancel the login process by clicking the "close" button */
  allowUserToCancelLogin?: boolean;
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
  allowUserToCancelLogin = false,
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
    if (!isOAuthClient(client)) {
      throw new ClientIsNotOAuthClientError();
    }

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
    if (!isOAuthClient(client)) {
      throw new ClientIsNotOAuthClientError();
    }

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
      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: authUrl }}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode === 400) {
              setIsModalOpen(false);
              throw new UnauthorizedCallbackUrl(callbackUrl);
            }
          }}
          injectedJavaScriptBeforeContentLoaded={`
          function removeCloseButton() {
            const xButton = document.querySelector('[data-testid="xButton"]');
            if (xButton) {
              xButton.remove();
            } else {
              setTimeout(removeCloseButton, 50);
            }
          }

          removeCloseButton();
        `}
        />
        {allowUserToCancelLogin && (
          <TouchableOpacity
            onPress={() => {
              onLoginCanceled?.();
              setIsModalOpen(false);
            }}
            style={styles.closeButtonContainer}
          >
            <View style={styles.closeButton}>
              <Image
                source={require('../assets/close-icon.png')}
                style={styles.closeButtonIcon as any}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
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
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 15,
  },
  closeButton: {
    width: 50,
    height: 50,
    backgroundColor: 'white',
    // @ts-expect-error borderRadius does in fact support percentage
    borderRadius: '50%',
    padding: 10,
  },
  closeButtonIcon: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
});
