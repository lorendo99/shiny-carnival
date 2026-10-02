import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type {
  NativeAppleAuthentication,
  NativeAppleAuthenticationResult,
} from './useNativeAppleAuthentication.types';

export function useNativeAppleAuthentication(): NativeAppleAuthentication {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();

  const startNativeAppleAuthentication = async (): Promise<NativeAppleAuthenticationResult> => {
    if (!(await AppleAuthentication.isAvailableAsync())) {
      return { available: false };
    }

    if (!isSignInLoaded || !isSignUpLoaded) {
      return { available: true, createdSessionId: null };
    }

    try {
      const nonce = Crypto.randomUUID();
      const { identityToken, fullName } = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (!identityToken) {
        throw new Error('No identity token was received from Apple.');
      }

      try {
        await signUp.create({
          strategy: 'oauth_token_apple',
          token: identityToken,
          firstName: fullName?.givenName ?? undefined,
          lastName: fullName?.familyName ?? undefined,
        });
      } catch (signUpError) {
        const isExistingAccount = isClerkAPIResponseError(signUpError)
          && signUpError.errors?.some(
            (error) =>
              error.code === 'sign_up_mode_restricted'
              || error.code === 'sign_up_restricted_waitlist',
          );

        if (!isExistingAccount) {
          throw signUpError;
        }

        await signIn.create({
          strategy: 'oauth_token_apple',
          token: identityToken,
        });

        if (signIn.firstFactorVerification.status === 'transferable') {
          throw signUpError;
        }

        const createdSessionId = signIn.createdSessionId;
        return {
          available: true,
          createdSessionId,
          activate:
            createdSessionId && setActive
              ? () => setActive({ session: createdSessionId })
              : undefined,
        };
      }

      if (signUp.verifications.externalAccount.status === 'transferable') {
        await signIn.create({ transfer: true });
      }

      const createdSessionId =
        signUp.verifications.externalAccount.status === 'transferable'
          ? signIn.createdSessionId
          : signUp.createdSessionId;

      return {
        available: true,
        createdSessionId,
        activate:
          createdSessionId && setActive
            ? () => setActive({ session: createdSessionId })
            : undefined,
      };
    } catch (error) {
      if (
        error
        && typeof error === 'object'
        && 'code' in error
        && error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return { available: true, createdSessionId: null };
      }

      throw error;
    }
  };

  return { startNativeAppleAuthentication };
}