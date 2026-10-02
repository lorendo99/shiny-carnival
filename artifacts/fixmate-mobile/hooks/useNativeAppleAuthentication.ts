import type { NativeAppleAuthentication } from './useNativeAppleAuthentication.types';

export function useNativeAppleAuthentication(): NativeAppleAuthentication {
  return {
    startNativeAppleAuthentication: async () => ({ available: false }),
  };
}