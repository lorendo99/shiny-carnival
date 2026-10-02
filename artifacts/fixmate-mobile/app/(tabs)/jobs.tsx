import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useListRepairJobs, useListPublicRepairJobs, useGetEngineerProfile, useCreateEngineerPayoutOnboarding, getListRepairJobsQueryKey, getGetEngineerProfileQueryKey, type PublicRepairJob } from '@workspace/api-client-react';
import { RepairerVerificationCard } from '@/components/RepairerVerificationCard';

export default function JobsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const [role, setRole] = useState<'customer' | 'engineer'>('customer');
  const [payoutSetupError, setPayoutSetupError] = useState('');
  const payoutOnboarding = useCreateEngineerPayoutOnboarding();
  const { data: publicJobs, isLoading: isPublicJobsLoading, refetch: refetchPublicJobs, isRefetching: isRefetchingPublicJobs } = useListPublicRepairJobs();

  const { data: jobs, isLoading: isJobsLoading, refetch, isRefetching } = useListRepairJobs(
    { scope: role === 'customer' ? 'mine' : 'open' },
    { query: { enabled: isSignedIn, queryKey: getListRepairJobsQueryKey({ scope: role === 'customer' ? 'mine' : 'open' }) } }
  );

  const { data: engineerProfile, isLoading: isProfileLoading, refetch: refetchEngineerProfile } = useGetEngineerProfile(
    { query: { enabled: isSignedIn && role === 'engineer', queryKey: getGetEngineerProfileQueryKey() } }
  );

  const startPayoutSetup = () => {
    setPayoutSetupError('');
    payoutOnboarding.mutate(undefined, {
      onSuccess: async ({ url }) => {
        try {
          await WebBrowser.openBrowserAsync(url);
          await refetchEngineerProfile();
        } catch {
          setPayoutSetupError('Stripe payout setup could not be opened. Please try again.');
        }
      },
      onError: () => setPayoutSetupError('Stripe payout setup could not be started. Please try again.'),
    });
  };

  const renderEmpty = () => {
    if (role === 'customer') {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.secondary }]}>
             <Feather name="briefcase" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            No jobs posted
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Need something done? Post a job and get offers from local workers.
          </Text>
          <Pressable
            testID="post-job-empty-btn"
            style={[styles.emptyBtn, { backgroundColor: colors.foreground, borderRadius: colors.radius }]}
            onPress={() => router.push('/jobs/new')}
          >
            <Text style={[styles.emptyBtnText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>
              Post a job
            </Text>
          </Pressable>
        </View>
      );
    } else {
      if (!engineerProfile?.isActive) {
        return (
          <View style={styles.emptyContainer}>
             <View style={[styles.emptyIconWrapper, { backgroundColor: colors.secondary }]}>
               <Feather name="tool" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
               Become a worker
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
             Create a FixMate worker profile to see local jobs and send offers. Profiles show each evidence point separately rather than making a blanket vetting claim.
            </Text>
            <Pressable
              testID="register-profile-btn"
              style={[styles.emptyBtn, { backgroundColor: colors.foreground, borderRadius: colors.radius }]}
              onPress={() => router.push('/jobs/onboarding')}
            >
              <Text style={[styles.emptyBtnText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>
                 Create worker profile
              </Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.secondary }]}>
             <Feather name="inbox" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
             No open jobs
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
             There are no open jobs matching your services right now.
          </Text>
        </View>
      );
    }
  };

  const categoryLabel = (category: PublicRepairJob['category']) => ({
    appliance: 'Appliance repair',
    plumbing: 'Plumbing',
    painting: 'Painting and decorating',
    electrical: 'Electrical',
  }[category]);

  const renderPublicJob = ({ item }: { item: PublicRepairJob }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
          <Text style={{ color: colors.secondaryForeground, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>open</Text>
        </View>
      </View>
      <Text style={[styles.cardType, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
        {categoryLabel(item.category)} • Area {item.postcode}
      </Text>
      <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.description}</Text>
    </View>
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={publicJobs || []}
          keyExtractor={item => item.id}
          renderItem={renderPublicJob}
          contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetchingPublicJobs} onRefresh={refetchPublicJobs} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 24 }}>
              <View style={styles.header}>
                 <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Open local jobs</Text>
                <Pressable
                  testID="sign-in-marketplace-btn"
                  style={[styles.postJobBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={() => router.push('/(auth)/sign-in')}
                >
                  <Feather name="log-in" size={18} color={colors.primaryForeground} />
                </Pressable>
              </View>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 }}>
                 View local jobs and see what needs doing. Sign in to post a job or apply for work.
              </Text>
            </View>
          }
          ListEmptyComponent={
            isPublicJobsLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No open jobs are available yet.</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Pressable
        testID={`job-card-${item.id}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
        onPress={() => router.push(`/jobs/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
            <Text style={{ color: colors.secondaryForeground, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' }}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardType, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
          {categoryLabel(item.category)} • {item.itemType} • {item.status === 'open' ? 'Area' : 'Postcode'} {item.postcode}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
          {item.description}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
             Jobs
          </Text>
          {role === 'customer' && (
            <Pressable
               testID="header-post-job-btn"
               style={[styles.postJobBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
               onPress={() => router.push('/jobs/new')}
            >
               <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          )}
        </View>

        <View style={[styles.roleToggle, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
          <Pressable
            testID="role-customer-btn"
            style={[styles.roleBtn, role === 'customer' && { backgroundColor: colors.foreground, borderRadius: colors.radius - 2 }]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleText, { color: role === 'customer' ? colors.background : colors.mutedForeground, fontFamily: role === 'customer' ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}>
              My Jobs
            </Text>
          </Pressable>
          <Pressable
            testID="role-engineer-btn"
            style={[styles.roleBtn, role === 'engineer' && { backgroundColor: colors.foreground, borderRadius: colors.radius - 2 }]}
            onPress={() => setRole('engineer')}
          >
            <Text style={[styles.roleText, { color: role === 'engineer' ? colors.background : colors.mutedForeground, fontFamily: role === 'engineer' ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}>
              Find Work
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 12 }}>
           Post → get offers → choose a worker → track progress. Keep payments and contact details in FixMate.
        </Text>
        {role === 'engineer' && engineerProfile?.isActive ? (
          <>
            <View style={{ padding: 14, marginTop: 12, marginBottom: 8, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginBottom: 5 }}>
                {engineerProfile.payoutsEnabled ? 'Stripe payouts are ready' : 'Set up Stripe payouts'}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
                FixMate keeps a 15% fee. Your 85% share is transferred to your Stripe balance only after the customer confirms completion.
              </Text>
              {!engineerProfile.payoutsEnabled && (
                <Pressable
                  testID="button-start-payout-setup"
                  onPress={startPayoutSetup}
                  disabled={payoutOnboarding.isPending}
                  style={{ backgroundColor: colors.foreground, borderRadius: colors.radius, padding: 12, alignItems: 'center', opacity: payoutOnboarding.isPending ? 0.65 : 1 }}
                >
                  <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                    {payoutOnboarding.isPending ? 'Opening Stripe…' : 'Set up payouts securely with Stripe'}
                  </Text>
                </Pressable>
              )}
              {payoutSetupError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 8 }}>{payoutSetupError}</Text> : null}
            </View>
            <RepairerVerificationCard profile={engineerProfile} />
          </>
        ) : null}
      </View>

      {isJobsLoading || (role === 'engineer' && isProfileLoading) ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs || []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    letterSpacing: -1,
  },
  postJobBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardType: {
    fontSize: 14,
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
  }
});
