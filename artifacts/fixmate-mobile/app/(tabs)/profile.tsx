import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth, useClerk } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import { useSubscription, REVENUECAT_ENTITLEMENT_IDENTIFIER } from '@/lib/revenuecat';
import { useDeleteAccount } from '@workspace/api-client-react';
import { clearDiagnoses } from '@/lib/storage';

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSubscribed, isLoading } = useSubscription();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const deleteAccount = useDeleteAccount();
  const [simpleLanguage, setSimpleLanguage] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@fixmate_simple_language').then((value) => setSimpleLanguage(value === 'true'));
  }, []);

  const confirmAccountDeletion = () => {
    Alert.alert(
      'Delete your FixMate account?',
      'This permanently removes your account, diagnoses, jobs, messages, and profile. Legally required payment records may be retained in de-identified form. Active App Store subscriptions must be cancelled separately in your Apple subscription settings.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              await clearDiagnoses();
              await signOut().catch(() => undefined);
              router.replace('/');
            } catch (error) {
              Alert.alert(
                'Account not deleted',
                error instanceof Error ? error.message : 'Please try again or contact support.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 120,
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Profile
        </Text>
      </View>

      {/* Subscription Banner */}
      <Pressable
        testID="plus-banner"
        style={({ pressed }) => [
          styles.plusBanner,
          {
            backgroundColor: isSubscribed ? colors.foreground : colors.primary,
            borderRadius: colors.radius,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
        onPress={() => router.push('/plus')}
      >
        <View style={styles.plusBannerContent}>
          <Text style={[
            styles.plusTitle,
            { color: isSubscribed ? colors.background : colors.foreground, fontFamily: 'Inter_700Bold' }
          ]}>
            FixMate Plus {isSubscribed && 'Active'}
          </Text>
          <Text style={[
            styles.plusText,
            { color: isSubscribed ? colors.muted : colors.foreground, fontFamily: 'Inter_500Medium', opacity: 0.9 }
          ]}>
            {isSubscribed
              ? 'Your FixMate Plus benefits are active.'
              : 'Unlock detailed repair guides and pro tips.'}
          </Text>
        </View>
        <Feather
          name="chevron-right"
          size={24}
          color={isSubscribed ? colors.background : colors.foreground}
        />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        Settings
      </Text>
      <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.settingLeft}>
            <Feather name="type" size={20} color={colors.foreground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Simple language</Text>
              <Text style={[styles.settingHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Use shorter, clearer wording where available.</Text>
            </View>
          </View>
          <Switch accessibilityLabel="Use simple language" value={simpleLanguage} onValueChange={(value) => { setSimpleLanguage(value); void AsyncStorage.setItem('@fixmate_simple_language', String(value)); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.card} />
        </View>
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/privacy')}
          testID="profile-privacy-row"
        >
          <View style={styles.settingLeft}>
            <Feather name="shield" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Privacy & Data</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/terms')}
          testID="profile-terms-row"
        >
          <View style={styles.settingLeft}>
            <Feather name="file-text" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Terms & Conditions</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 24 }]}>
        Support
      </Text>
      <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Pressable
          style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
          onPress={() => router.push('/help')}
          testID="profile-help-row"
        >
          <View style={styles.settingLeft}>
            <Feather name="help-circle" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Help Center</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={[styles.settingRow, { borderBottomColor: isSignedIn ? colors.border : 'transparent', borderBottomWidth: isSignedIn ? 1 : 0 }]}
          onPress={() => router.push('/contact')}
          testID="profile-contact-row"
        >
          <View style={styles.settingLeft}>
            <Feather name="message-square" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Contact Us</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
        {isSignedIn ? (
          <>
            <Pressable
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => {
                signOut();
              }}
              testID="profile-signout-row"
            >
              <View style={styles.settingLeft}>
                <Feather name="log-out" size={20} color={colors.destructive} />
                <Text style={[styles.settingText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>Sign Out</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.settingRow}
              onPress={confirmAccountDeletion}
              disabled={deleteAccount.isPending}
              testID="profile-delete-account-row"
            >
              <View style={styles.settingLeft}>
                <Feather name="trash-2" size={20} color={colors.destructive} />
                <Text style={[styles.settingText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>
                  {deleteAccount.isPending ? 'Deleting Account…' : 'Delete Account'}
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.settingRow}
            onPress={() => router.push('/(auth)/sign-in')}
            testID="profile-signin-row"
          >
            <View style={styles.settingLeft}>
              <Feather name="log-in" size={20} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Sign In</Text>
            </View>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    letterSpacing: -1,
  },
  plusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 32,
  },
  plusBannerContent: {
    flex: 1,
    paddingRight: 16,
  },
  plusTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  plusText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  settingsGroup: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  settingHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
