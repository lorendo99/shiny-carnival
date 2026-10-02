import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { initializeRevenueCat, SubscriptionProvider } from '@/lib/revenuecat';
import { ClerkLoaded, ClerkProvider, useAuth, useClerk } from "@clerk/expo";
import { tokenCache } from "@/lib/token-cache";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { useColors } from '@/hooks/useColors';

try {
  initializeRevenueCat();
} catch (err: any) {
  console.warn("RevenueCat Unavailable:", err?.message);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}

function RootLayoutNav() {
  const colors = useColors();

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { color: colors.foreground, fontFamily: 'Fraunces' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Data' }} />
      <Stack.Screen name="help" options={{ title: 'Help Center' }} />
      <Stack.Screen name="contact" options={{ title: 'Contact Us' }} />
      <Stack.Screen name="inventory/[id]" options={{ title: 'Inventory item' }} />
      <Stack.Screen name="repair-report/[id]" options={{ title: 'Repair report' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces: require('../assets/fonts/Fraunces.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ClerkQueryClientCacheInvalidator />
              <AuthBridge />
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <SubscriptionProvider>
                    <RootLayoutNav />
                  </SubscriptionProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
