import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSubscription } from '@/lib/revenuecat';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function PlusScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { offerings, isSubscribed, isLoading, purchase, restore, isPurchasing, isRestoring, isStoreConfigured, trackSubscriptionEvent } = useSubscription();
  const [pendingPackage, setPendingPackage] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void trackSubscriptionEvent({ eventName: 'plus_screen_viewed' });
  }, [trackSubscriptionEvent]);

  const getPlan = (pkg: any) => (
    pkg?.packageType === 'ANNUAL' || /annual|year/i.test(pkg?.identifier || '')
      ? 'annual'
      : pkg?.packageType === 'MONTHLY' || /month/i.test(pkg?.identifier || '')
        ? 'monthly'
        : undefined
  ) as 'monthly' | 'annual' | undefined;

  const getEventDetails = (pkg: any) => ({
    plan: getPlan(pkg),
    packageIdentifier: pkg?.identifier,
    productIdentifier: pkg?.product?.identifier,
  });

  const confirmPurchase = async () => {
    if (!pendingPackage) return;
    const details = getEventDetails(pendingPackage);
    void trackSubscriptionEvent({
      eventName: 'purchase_started',
      ...details,
    });
    try {
      await purchase(pendingPackage);
      void trackSubscriptionEvent({
        eventName: 'purchase_completed',
        ...details,
      });
      setPendingPackage(null);
      router.back();
    } catch (err: any) {
      void trackSubscriptionEvent({
        eventName: 'purchase_failed',
        ...details,
      });
      setPendingPackage(null);
      setMessage(err?.message || 'The purchase could not be completed.');
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      void trackSubscriptionEvent({ eventName: 'restore_completed' });
      setMessage('Your purchases have been restored.');
    } catch (err: any) {
      setMessage(err?.message || 'Purchases could not be restored.');
    }
  };

  const currentOffering = offerings?.current;
  const packages = [...(currentOffering?.availablePackages || [])].sort((a: any, b: any) => {
    const rank = (pkg: any) => pkg.packageType === 'ANNUAL' || /annual|year/i.test(pkg.identifier) ? 0 : pkg.packageType === 'MONTHLY' || /month/i.test(pkg.identifier) ? 1 : 2;
    return rank(a) - rank(b);
  });
  const annual = packages.find((pkg: any) => pkg.packageType === 'ANNUAL' || /annual|year/i.test(pkg.identifier));
  const monthly = packages.find((pkg: any) => pkg.packageType === 'MONTHLY' || /month/i.test(pkg.identifier));
  const annualSavings = annual && monthly && Number(annual.product.price) > 0
    ? Math.max(0, 1 - Number(annual.product.price) / (Number(monthly.product.price) * 12))
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: colors.foreground,
          presentation: 'modal'
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.primary }]}>
            <Feather name="tool" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            FixMate Plus
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Get clearer repair decisions, private follow-up help, and your diagnosis history in one place.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.features}>
          {[
            'Evidence-aware AI diagnosis',
            'Private diagnosis follow-up expert',
            'Saved diagnosis history',
            'Marketplace coordination',
            'Estimated 15% repair saving (not guaranteed or automatic)'
          ].map((feat, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={14} color={colors.accentForeground} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                {feat}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.spacer} />

        {isLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isSubscribed ? (
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={[styles.activeCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
            <Feather name="check-circle" size={32} color={colors.secondaryForeground} style={{ marginBottom: 12 }} />
            <Text style={[styles.activeTitle, { color: colors.secondaryForeground, fontFamily: 'Inter_700Bold' }]}>
              You're all set!
            </Text>
            <Text style={[styles.activeText, { color: colors.secondaryForeground, fontFamily: 'Inter_400Regular' }]}>
              Your FixMate Plus subscription is currently active.
            </Text>
          </Animated.View>
        ) : packages.length === 0 ? (
          <View style={[styles.activeCard, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Text style={[styles.activeTitle, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              In-App Purchases Unavailable
            </Text>
            <Text style={[styles.activeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {isStoreConfigured
                ? 'The App Store could not load the available plans. No payment has been taken. Please try again later.'
                : 'FixMate Plus cannot be purchased in this build. No payment has been taken.'}
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.packagesContainer}>
            {packages.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                testID={`purchase-${pkg.identifier}`}
                style={({ pressed }) => [
                  styles.packageCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: (isPurchasing || pressed) ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                  }
                ]}
                disabled={isPurchasing}
                onPress={() => {
                  const plan = getPlan(pkg);
                  if (plan) {
                    void trackSubscriptionEvent({
                      eventName: plan === 'monthly' ? 'monthly_plan_selected' : 'annual_plan_selected',
                      ...getEventDetails(pkg),
                    });
                  }
                  setPendingPackage(pkg);
                }}
              >
                <View style={styles.packageLeft}>
                  <Text style={[styles.packageTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    {pkg.packageType === 'ANNUAL' || /annual|year/i.test(pkg.identifier) ? 'Annual' : pkg.packageType === 'MONTHLY' || /month/i.test(pkg.identifier) ? 'Monthly' : (pkg.product.title || 'Premium')}
                  </Text>
                  <Text style={[styles.packageDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {pkg.product.description || (pkg === annual && annualSavings !== null ? `${Math.round(annualSavings * 100)}% estimated annual saving` : 'Full access to FixMate Plus')}
                  </Text>
                </View>
                <View style={[styles.packageRight, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}>
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.priceText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
                      {pkg.product.priceString}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        <Pressable
          testID="restore-btn"
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isRestoring || isLoading}
        >
          {isRestoring ? (
             <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              Restore Purchases
            </Text>
          )}
        </Pressable>
        <Text style={[styles.renewalText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Payment is charged to your App Store account when you confirm. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store subscription settings.
        </Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => router.push('/privacy')} testID="paywall-privacy-link">
            <Text style={[styles.legalLinkText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Privacy Policy</Text>
          </Pressable>
          <Text style={{ color: colors.mutedForeground }}>•</Text>
          <Pressable onPress={() => router.push('/terms')} testID="paywall-terms-link">
            <Text style={[styles.legalLinkText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Terms of Use</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal transparent visible={!!pendingPackage || !!message} animationType="fade" onRequestClose={() => { setPendingPackage(null); setMessage(null); }}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.foreground + 'B3' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={pendingPackage ? 'shield' : 'check'} size={22} color={colors.secondaryForeground} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {pendingPackage ? 'Confirm subscription' : 'Purchase status'}
            </Text>
            <Text style={[styles.modalText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {pendingPackage
                ? `${pendingPackage.product.title} for ${pendingPackage.product.priceString}. You can manage or cancel through your app store account.`
                : message}
            </Text>
            {pendingPackage ? (
              <View style={styles.modalActions}>
                <Pressable testID="cancel-purchase" style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]} onPress={() => setPendingPackage(null)}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Not now</Text>
                </Pressable>
                <Pressable testID="confirm-purchase" style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]} onPress={confirmPurchase} disabled={isPurchasing}>
                  {isPurchasing ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }}>Continue</Text>}
                </Pressable>
              </View>
            ) : (
              <Pressable testID="dismiss-message" style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]} onPress={() => setMessage(null)}>
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  features: {
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
  },
  spacer: {
    flex: 1,
  },
  loadingArea: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  activeCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  activeTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  activeText: {
    fontSize: 15,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 21,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  packagesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
  },
  packageLeft: {
    flex: 1,
    paddingRight: 16,
  },
  packageTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 14,
  },
  packageRight: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  priceText: {
    fontSize: 16,
  },
  restoreBtn: {
    alignItems: 'center',
    padding: 16,
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  renewalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  legalLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  }
});
