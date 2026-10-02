export type NativeAppleAuthenticationResult =
  | { available: false }
  | {
      available: true;
      createdSessionId: string | null;
      activate?: () => Promise<void>;
    };

export type NativeAppleAuthentication = {
  startNativeAppleAuthentication: () => Promise<NativeAppleAuthenticationResult>;
};