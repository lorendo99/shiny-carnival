import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/expo";
import Purchases from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncPremium } from "@workspace/api-client-react";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "fixmate_plus";
let isRevenueCatConfigured = false;
const ANONYMOUS_SUBSCRIPTION_ID_KEY = "@fixmate_subscription_analytics_id";

export type SubscriptionEventName =
  | "plus_screen_viewed"
  | "monthly_plan_selected"
  | "annual_plan_selected"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_failed"
  | "restore_completed";

export type SubscriptionPlan = "monthly" | "annual";

type SubscriptionEvent = {
  eventName: SubscriptionEventName;
  plan?: SubscriptionPlan;
  packageIdentifier?: string;
  productIdentifier?: string;
};

let anonymousSubscriptionIdPromise: Promise<string | null> | null = null;

async function getAnonymousSubscriptionId(): Promise<string | null> {
  if (!anonymousSubscriptionIdPromise) {
    anonymousSubscriptionIdPromise = AsyncStorage.getItem(ANONYMOUS_SUBSCRIPTION_ID_KEY)
      .then(async (existing) => {
        if (existing) return existing;
        const created = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        await AsyncStorage.setItem(ANONYMOUS_SUBSCRIPTION_ID_KEY, created);
        return created;
      })
      .catch(() => null);
  }
  return anonymousSubscriptionIdPromise;
}

function getRevenueCatApiKey() {
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY;
  }

  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY;
  }

  return undefined;
}

export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn("RevenueCat Public API Key not found. Proceeding gracefully without subscription functionality.");
    return;
  }

  if (isRevenueCatConfigured) return;
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  isRevenueCatConfigured = true;
}

function useSubscriptionContext() {
  const { userId, isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();
  const syncPremium = useSyncPremium();
  const [syncError, setSyncError] = useState<string | null>(null);
  const identityRef = useRef<string | null>(null);
  const trackSubscriptionEvent = useCallback(async (event: SubscriptionEvent): Promise<void> => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;
    try {
      const token = await getToken();
      const anonymousId = await getAnonymousSubscriptionId();
      await fetch(`${domain}/api/mobile-analytics/subscription-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...event, anonymousId }),
      });
    } catch {
      // Subscription analytics must never block a purchase or restore flow.
    }
  }, [getToken]);
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      const apiKey = getRevenueCatApiKey();
      if (!apiKey || !isSignedIn) return null;
      return await Purchases.getCustomerInfo();
    },
    staleTime: 60 * 1000,
    enabled: Boolean(isSignedIn),
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      const apiKey = getRevenueCatApiKey();
      if (!apiKey) return null;
      return await Purchases.getOfferings();
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: async () => { await customerInfoQuery.refetch(); await syncPremium.mutateAsync().catch((e) => setSyncError(e?.message || "Premium verification failed.")); },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      return Purchases.restorePurchases();
    },
    onSuccess: async () => { await customerInfoQuery.refetch(); await syncPremium.mutateAsync().catch((e) => setSyncError(e?.message || "Premium verification failed.")); },
  });

  useEffect(() => {
    if (!isRevenueCatConfigured || !userId || !isSignedIn || identityRef.current === userId) return;
    let active = true;
    (async () => {
      try {
        await Purchases.logIn(userId);
        identityRef.current = userId;
        await queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
        await customerInfoQuery.refetch();
        if (active) await syncPremium.mutateAsync();
      } catch (e: any) {
        if (active) setSyncError(e?.message || "Subscription sync is unavailable.");
      }
    })();
    return () => { active = false; };
  }, [userId, isSignedIn]);

  useEffect(() => {
    if (isSignedIn || !identityRef.current) return;
    identityRef.current = null;
    Purchases.logOut().catch(() => undefined);
    queryClient.removeQueries({ queryKey: ["revenuecat"] });
  }, [isSignedIn]);

  const isSubscribed = customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isStoreConfigured: Boolean(getRevenueCatApiKey()),
    syncError,
    trackSubscriptionEvent,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
