export class WixLoginError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, WixLoginError.prototype);
  }
}

export class ComponentNotMountedError extends WixLoginError {
  constructor() {
    super(
      'The <WixLogin /> component cannot be found anywhere in your app.\n' +
        'Please make sure to include it, preferably in your root component.',
    );
  }
}

export class TooManyComponentsError extends WixLoginError {
  constructor() {
    super(
      'There are multiple <WixLogin /> components mounted at the same time.\n' +
        'Please make sure to have only one <WixLogin /> component in your code, preferably in your root component.',
    );
  }
}

export class UnauthorizedCallbackUrl extends WixLoginError {
  constructor(callbackUrl: string) {
    super(
      'In order to login with Wix, you need to tell Wix it can trust this app.\n\n' +
        'In order to do that, follow these steps:\n' +
        '1. Head over to https://manage.wix.com and select your Headless project\n' +
        '2. Select "Settings" from the sidebar\n' +
        '3. Select "Headless Settings"\n' +
        '4. Under "OAuth Apps", go to your app\'s settings\n' +
        '5. Under "Allowed authorization redirect URIs", add the following URL: ' +
        callbackUrl +
        '\n\nDo note: if you are using Expo Go, this URL WILL change once you build your own binary.',
    );
  }
}
