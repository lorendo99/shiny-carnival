import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, type Href } from 'expo-router';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkErrors = (error as {
      errors?: Array<{ longMessage?: string; message?: string }>;
    }).errors;
    const message = clerkErrors?.[0]?.longMessage || clerkErrors?.[0]?.message;
    if (message) return message;
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Google sign-in could not be completed. Please try again or use email.';
}

export function GoogleSignInButton({ disabled = false, onError }: GoogleSignInButtonProps) {
  const colors = useColors();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const onPress = useCallback(async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    onError?.('');

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        // This uses Expo Go's exp:// URL in preview and the app.json scheme
        // in an installed build. Do not hard-code the app scheme in Expo Go.
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (!createdSessionId || !setActive) {
        onError?.('Google sign-in needs one more account detail. Please try again or use email sign-up.');
        return;
      }

      await setActive({
        session: createdSessionId,
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            onError?.('Your account needs one more step before you can continue. Please try email sign-in.');
            return;
          }
          router.replace(decorateUrl('/') as Href);
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      console.error('Google sign-in failed:', error);
      onError?.(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, onError, router, startSSOFlow]);

  return (
    <Pressable
      testID="google-sign-in-button"
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: colors.radius,
        borderWidth: 1,
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        opacity: pressed || disabled ? 0.7 : 1,
      })}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.cardForeground} />
      ) : (
        <>
          <FontAwesome name="google" size={19} color={colors.cardForeground} />
          <Text
            style={{
              color: colors.cardForeground,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
            }}
          >
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}