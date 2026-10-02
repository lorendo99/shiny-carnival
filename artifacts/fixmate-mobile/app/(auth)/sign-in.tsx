import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Feather } from '@expo/vector-icons';

export default function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [socialError, setSocialError] = useState('');
  const [requestError, setRequestError] = useState('');

  const getThrownErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object' && 'errors' in error) {
      const clerkErrors = (error as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      }).errors;
      const message = clerkErrors?.[0]?.longMessage || clerkErrors?.[0]?.message;
      if (message) return message;
    }
    return error instanceof Error ? error.message : '';
  };

  const onSignInPress = async () => {
    if (!signIn) return;
    setRequestError('');
    try {
      const { error } = await signIn.password({
        emailAddress,
        password,
      });
      if (error) {
        setRequestError(getThrownErrorMessage(error) || 'We could not sign you in. Please check your details and try again.');
        return;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
             router.replace('/');
          }
        });
      } else {
        console.error(signIn);
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      setRequestError(getThrownErrorMessage(err) || 'We could not sign you in. Please try again.');
    }
  };

  const fieldError = errors?.fields?.identifier?.message || errors?.fields?.password?.message;
  const globalError = errors?.global?.[0]?.message;
  const visibleError = requestError || fieldError || globalError;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
      bottomOffset={20}
    >
      <View style={{ marginBottom: 40 }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.foreground, marginBottom: 8 }}>
          Welcome back
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.mutedForeground }}>
          Sign in to your account
        </Text>
      </View>

      {socialError ? (
        <View style={{ backgroundColor: colors.destructive + '1A', padding: 12, borderRadius: colors.radius, marginBottom: 20 }}>
          <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
            {socialError}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <GoogleSignInButton onError={setSocialError} />
        <AppleSignInButton onError={setSocialError} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>or use email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      {visibleError ? (
        <View style={{ backgroundColor: colors.destructive + '1A', padding: 12, borderRadius: colors.radius, marginBottom: 20 }}>
          <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
            {visibleError}
          </Text>
        </View>
      ) : null}

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={emailAddress}
        onChangeText={setEmailAddress}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          color: colors.foreground,
          borderRadius: colors.radius,
          padding: 16,
          fontSize: 16,
          marginBottom: 20,
          fontFamily: 'Inter_400Regular'
        }}
        placeholder="name@example.com"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          color: colors.foreground,
          borderRadius: colors.radius,
          padding: 16,
          fontSize: 16,
          marginBottom: 32,
          fontFamily: 'Inter_400Regular'
        }}
        placeholder="Enter your password"
        placeholderTextColor={colors.mutedForeground}
      />

      <Pressable
        onPress={onSignInPress}
        disabled={fetchStatus === 'fetching' || !emailAddress || !password}
        style={({ pressed }) => [
          {
            backgroundColor: (!emailAddress || !password) ? colors.muted : colors.foreground,
            padding: 18,
            borderRadius: colors.radius,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            opacity: pressed ? 0.9 : 1,
          }
        ]}
      >
        {fetchStatus === 'fetching' ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (!emailAddress || !password) ? colors.mutedForeground : colors.background }}>
            Sign In
          </Text>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14 }}>
          Don't have an account?{' '}
        </Text>
        <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            Sign Up
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}
