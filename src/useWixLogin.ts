import { global } from './global';
import { ComponentNotMountedError } from './errors';

/**
 * This hook allows you to control the <WixLogin /> component from anywhere in your app.
 * @example
 * const wixLogin = useWixLogin();
 * wixLogin.openLoginModal(); // opens the login modal from anywhere in your app
 */
export const useWixLogin = () => {
  function openLoginModal() {
    if (global.__OPEN_WIX_LOGIN_MODAL) {
      global.__OPEN_WIX_LOGIN_MODAL();
    } else {
      throw new ComponentNotMountedError();
    }
  }

  return { openLoginModal };
};
