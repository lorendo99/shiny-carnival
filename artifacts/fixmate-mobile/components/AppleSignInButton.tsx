import { useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useNativeAppleAuthentication } from '@/hooks/useNativeAppleAuthentication';

WebBrowser.maybeCompleteAuthSession();

type AppleSignInButtonProps = {
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
    : 'Apple sign-in could not be completed. Please try again or use email.';
}

export function AppleSignInButton({ disabled = false, onError }: AppleSignInButtonProps) {
  const colors = useColors();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const { startNativeAppleAuthentication } = useNativeAppleAuthentication();
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
      const startOAuthFlow = () =>
        startSSOFlow({
            strategy: 'oauth_apple',
            redirectUrl: AuthSession.makeRedirectUri(),
          });

      if (Platform.OS === 'ios') {
        const nativeResult = await startNativeAppleAuthentication();

        if (nativeResult.available) {
          if (!nativeResult.createdSessionId || !nativeResult.activate) {
            return;
          }

          await nativeResult.activate();
          router.replace('/');
          return;
        }
      }

      const { createdSessionId, setActive } = await startOAuthFlow();

      if (!createdSessionId || !setActive) {
        onError?.(
          'Apple sign-in needs one more account detail. Please use email sign-up to finish creating your account.',
        );
        return;
      }

      await setActive({
        session: createdSessionId,
      });
      router.replace('/');
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      console.error('Apple sign-in failed:', error);
      onError?.(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, onError, router, startNativeAppleAuthentication, startSSOFlow]);

  return (
    <Pressable
      testID="apple-sign-in-button"
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
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
          <FontAwesome name="apple" size={21} color={colors.cardForeground} />
          <Text
            style={{
              color: colors.cardForeground,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
            }}
          >
            Continue with Apple
          </Text>
        </>
      )}
    </Pressable>
  );
}