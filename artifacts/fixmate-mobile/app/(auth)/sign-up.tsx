import { useSignUp, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function SignUp() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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

  const onSignUpPress = async () => {
    if (!signUp) return;
    setRequestError('');
    try {
      const { error } = await signUp.password({
        emailAddress,
        password,
      });
      if (error) {
        setRequestError(getThrownErrorMessage(error) || 'We could not create your account. Please check your details and try again.');
        return;
      }
      await signUp.verifications.sendEmailCode();
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setRequestError(getThrownErrorMessage(err) || 'We could not send the verification email. Please try again.');
    }
  };

  const onPressVerify = async () => {
    if (!signUp) return;
    setRequestError('');
    try {
      await signUp.verifications.verifyEmailCode({
        code,
      });
      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            router.replace('/');
          }
        });
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setRequestError(getThrownErrorMessage(err) || 'We could not verify that code. Please try again or request a new code.');
    }
  };

  if (signUp?.status === 'complete' || isSignedIn) {
    return null;
  }

  const isVerifying = signUp?.status === 'missing_requirements' &&
    signUp?.unverifiedFields.includes('email_address') &&
    signUp?.missingFields.length === 0;

  if (isVerifying) {
    const codeError = errors?.fields?.code?.message || errors?.global?.[0]?.message;
    const visibleCodeError = requestError || codeError;
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}
        bottomOffset={20}
      >
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.foreground, marginBottom: 8 }}>
            Verify your email
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.mutedForeground }}>
            Enter the code sent to {emailAddress}
          </Text>
        </View>

        {visibleCodeError ? (
          <View style={{ backgroundColor: colors.destructive + '1A', padding: 12, borderRadius: colors.radius, marginBottom: 20 }}>
            <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
              {visibleCodeError}
            </Text>
          </View>
        ) : null}

        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Verification Code</Text>
        <TextInput
          value={code}
          keyboardType="numeric"
          onChangeText={setCode}
          style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius, padding: 16, fontSize: 16, marginBottom: 32, fontFamily: 'Inter_400Regular' }}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
        />

        <Pressable
          onPress={onPressVerify}
          disabled={fetchStatus === 'fetching' || !code}
          style={({ pressed }) => [{ backgroundColor: (!code) ? colors.muted : colors.foreground, padding: 18, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1, marginBottom: 16 }]}
        >
          {fetchStatus === 'fetching' ? (
             <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (!code) ? colors.mutedForeground : colors.background }}>Verify</Text>
          )}
        </Pressable>

         <Pressable
           onPress={async () => {
             setRequestError('');
             try {
               await signUp.verifications.sendEmailCode();
             } catch (err) {
               setRequestError(getThrownErrorMessage(err) || 'We could not resend the verification email. Please try again.');
             }
           }}
           style={{ alignItems: 'center', padding: 16 }}
         >
           <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Resend Code</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    );
  }

  const fieldError = errors?.fields?.emailAddress?.message || errors?.fields?.password?.message;
  const globalError = errors?.global?.[0]?.message;
  const visibleError = requestError || fieldError || globalError;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}
      bottomOffset={20}
    >
      <View style={{ marginBottom: 40 }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: colors.foreground, marginBottom: 8 }}>
          Create an account
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.mutedForeground }}>
          Join FixMate to post or bid on jobs
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
        style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius, padding: 16, fontSize: 16, marginBottom: 20, fontFamily: 'Inter_400Regular' }}
        placeholder="name@example.com"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius, padding: 16, fontSize: 16, marginBottom: 32, fontFamily: 'Inter_400Regular' }}
        placeholder="Create a strong password"
        placeholderTextColor={colors.mutedForeground}
      />

      <Pressable
        onPress={onSignUpPress}
        disabled={fetchStatus === 'fetching' || !emailAddress || !password}
        style={({ pressed }) => [{ backgroundColor: (!emailAddress || !password) ? colors.muted : colors.foreground, padding: 18, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 }]}
      >
        {fetchStatus === 'fetching' ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (!emailAddress || !password) ? colors.mutedForeground : colors.background }}>Sign Up</Text>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14 }}>
          Already have an account?{' '}
        </Text>
        <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            Sign In
          </Text>
        </Pressable>
      </View>
      <View nativeID="clerk-captcha" />
    </KeyboardAwareScrollViewCompat>
  );
}
