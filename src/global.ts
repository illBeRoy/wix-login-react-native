export interface Global {
  __OPEN_WIX_LOGIN_MODAL?: () => void | undefined;
}

// eslint-disable-next-line
export const global: Global = globalThis as any;
