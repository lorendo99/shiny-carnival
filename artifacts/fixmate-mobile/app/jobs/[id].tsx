import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, TextInput, Keyboard, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  useListRepairJobs,
  useListJobResponses,
  useUpdateJobResponse,
  useListRepairQuotes,
  useCreateRepairQuote,
  useCreateRepairPriceOffer,
  useAgreeRepairPriceOffer,
  useDeclineRepairPriceOffer,
  useAcceptRepairQuote,
  useRejectRepairQuote,
  useConfirmRepairQuotePayment,
  useListJobMessages,
  useSendJobMessage,
  useGetEngineerProfile,
  useReadJobPhoto,
  useCancelRepairPayment,
  useUpdateRepairJobTimeline,
  useCreateRepairReminder,
  useUpdateRepairReminder,
  type RepairReminderKind,
} from '@workspace/api-client-react';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@/lib/revenuecat';
import * as WebBrowser from 'expo-web-browser';
import { getGetEngineerProfileQueryKey, getListJobResponsesQueryKey, getListRepairQuotesQueryKey, getListJobMessagesQueryKey, getListRepairJobsQueryKey } from '@workspace/api-client-react';
import { MarketplaceSafetyActions } from '@/components/MarketplaceSafetyActions';
import { RepairerVerificationCard } from '@/components/RepairerVerificationCard';

function JobPhoto({ jobId, index }: { jobId: string; index: number }) {
  const colors = useColors();
  const { data: blobData, isLoading, error } = useReadJobPhoto(jobId, index, { request: { responseType: 'blob' } as any });
  const blob = blobData as unknown as Blob;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob && blob instanceof Blob) {
      if (Platform.OS === 'web') {
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }
    }
  }, [blob]);

  if (isLoading) return <View style={{ width: 100, height: 100, borderRadius: colors.radius, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (error || !url) return <View style={{ width: 100, height: 100, borderRadius: colors.radius, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}><Feather name="image" size={24} color={colors.mutedForeground} /></View>;

  return <Image source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: colors.radius }} />;
}

const reminderOptions: Array<{ kind: RepairReminderKind; label: string; days: number }> = [
  { kind: 'clean_filter', label: 'Clean filters', days: 30 },
  { kind: 'check_seals', label: 'Check seals', days: 90 },
  { kind: 'replace_batteries', label: 'Replace batteries', days: 180 },
  { kind: 'boiler_service', label: 'Service boiler', days: 365 },
  { kind: 'review_repair', label: 'Review repair', days: 7 },
];

type QuoteSort = 'recommended' | 'price' | 'speed' | 'rating';

function durationMinutes(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(minute|hour|day|week)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * (unit === 'minute' ? 1 : unit === 'hour' ? 60 : unit === 'day' ? 1440 : 10080);
}

function effectiveQuotePrice(quote: any) {
  return quote.agreedTotalPence ?? quote.currentOfferPence ?? quote.totalPence;
}

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { isSubscribed } = useSubscription();

  const [tab, setTab] = useState<'details' | 'quotes' | 'messages'>('details');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [quoteSort, setQuoteSort] = useState<QuoteSort>('recommended');
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [counterPrices, setCounterPrices] = useState<Record<string, string>>({});
  const hasObservedJobRef = useRef(false);
  const previousAgreedJobRef = useRef<string | null>(null);
  const checkoutOpeningRef = useRef<string | null>(null);

  // Job data
  const { data: jobs } = useListRepairJobs({ scope: 'open' }, { query: {
    queryKey: getListRepairJobsQueryKey({ scope: 'open' }),
    refetchInterval: 5000,
  } });
  const { data: myJobs } = useListRepairJobs({ scope: 'mine' }, { query: {
    queryKey: getListRepairJobsQueryKey({ scope: 'mine' }),
    refetchInterval: 5000,
  } });

  const allJobs = [...(jobs || []), ...(myJobs || [])];
  const job = allJobs.find(j => j.id === id);

  const isCustomer = job?.customerId === userId;

  // Engineer Profile
  const { data: profile } = useGetEngineerProfile({ query: { enabled: !isCustomer, queryKey: getGetEngineerProfileQueryKey() } });

  // Job Sub-resources
  const { data: responses, refetch: refetchResponses } = useListJobResponses(id, { query: { enabled: !!id && (isCustomer || !!profile?.isActive), refetchInterval: 10000, queryKey: getListJobResponsesQueryKey(id) } });
  const { data: quotes, refetch: refetchQuotes } = useListRepairQuotes(id, { query: { enabled: !!id, refetchInterval: 10000, queryKey: getListRepairQuotesQueryKey(id) } });

  const updateResponse = useUpdateJobResponse();
  const acceptQuote = useAcceptRepairQuote();
  const rejectQuote = useRejectRepairQuote();
  const createPriceOffer = useCreateRepairPriceOffer();
  const agreePriceOffer = useAgreeRepairPriceOffer();
  const declinePriceOffer = useDeclineRepairPriceOffer();
  const confirmQuotePayment = useConfirmRepairQuotePayment();
  const cancelPayment = useCancelRepairPayment();
  const updateTimeline = useUpdateRepairJobTimeline();
  const createReminder = useCreateRepairReminder();
  const updateReminder = useUpdateRepairReminder();

  const refreshJobs = () => queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey() });

  const myResponse = responses?.find((r: any) => r.engineerId === profile?.userId);
  const hasQuoted = quotes?.some((q: any) => q.engineerId === profile?.userId);

  // Identify engineers the customer can chat with (those who responded or quoted)
  const activeEngineerIds = Array.from(new Set([
    ...(responses?.filter((r: any) => r.status === 'interested').map((r: any) => r.engineerId) || []),
    ...(quotes?.map((q: any) => q.engineerId) || [])
  ]));

  const currentThreadEngineerId = isCustomer ? selectedThread : profile?.userId;

  const { data: allMessages, refetch: refetchMessages } = useListJobMessages(
    id,
    { query: { enabled: !!id && !!currentThreadEngineerId, refetchInterval: 5000, queryKey: getListJobMessagesQueryKey(id) } }
  );

  const messages = allMessages?.filter((m: any) => m.threadEngineerId === currentThreadEngineerId);

  const createMessage = useSendJobMessage();
  const [messageBody, setMessageBody] = useState('');

  const handleSendMessage = () => {
    if (!messageBody.trim() || !currentThreadEngineerId) return;
    createMessage.mutate({
      jobId: id,
      data: { body: messageBody.trim(), engineerId: currentThreadEngineerId }
    }, {
      onSuccess: () => {
        setMessageBody('');
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: getListJobMessagesQueryKey(id) });
      }
    });
  };

  const handleInterest = (status: 'interested' | 'declined') => {
    setStatusMsg(null);
    updateResponse.mutate({ jobId: id, data: { status } }, {
      onSuccess: () => {
        refetchResponses();
        queryClient.invalidateQueries({ queryKey: getListJobResponsesQueryKey(id) });
      },
      onError: () => {
        setStatusMsg({ text: 'Failed to update interest.', type: 'error' });
      }
    });
  };

  const openCheckout = async (quoteId: string, checkoutUrl: string) => {
    if (checkoutOpeningRef.current === quoteId) return;
    checkoutOpeningRef.current = quoteId;
    try {
      await WebBrowser.openBrowserAsync(checkoutUrl);
      handleCheckPayment(quoteId);
    } catch {
      setStatusMsg({ text: 'Secure Checkout could not open. Your agreed price is still saved; try again from this job.', type: 'error' });
    } finally {
      checkoutOpeningRef.current = null;
    }
  };

  const handleAcceptQuote = (quoteId: string) => {
    if (checkoutOpeningRef.current === quoteId) return;
    setStatusMsg(null);
    acceptQuote.mutate({ quoteId }, {
      onSuccess: async (res: any) => {
        refetchQuotes();
        refreshJobs();
        if (res.checkoutUrl) {
          await openCheckout(quoteId, res.checkoutUrl);
        } else {
          setStatusMsg({ text: 'Both sides must agree to the price before payment can start.', type: 'error' });
        }
      },
      onError: () => {
        refreshJobs();
        setStatusMsg({ text: 'Failed to accept quote.', type: 'error' });
      }
    });
  };

  const handleAgreePrice = (quoteId: string, offerId: string) => {
    setStatusMsg(null);
    agreePriceOffer.mutate({ quoteId, offerId }, {
      onSuccess: async (result: any) => {
        refetchQuotes();
        refreshJobs();
        if (result.checkoutUrl) {
          await openCheckout(quoteId, result.checkoutUrl);
        } else {
          setStatusMsg({
            text: result.agreementComplete
              ? 'Both sides agreed. The customer can now pay securely.'
              : 'You agreed to this price. The other person needs to confirm it.',
            type: 'success',
          });
        }
      },
      onError: () => setStatusMsg({ text: 'That price could not be agreed. Refresh and try again.', type: 'error' }),
    });
  };

  const handleCounterPrice = (quoteId: string) => {
    const amountPence = Math.round(Number(counterPrices[quoteId] || 0) * 100);
    if (!Number.isInteger(amountPence) || amountPence < 1) return;
    createPriceOffer.mutate({ quoteId, data: { amountPence } }, {
      onSuccess: () => {
        setCounterPrices((current) => ({ ...current, [quoteId]: '' }));
        refetchQuotes();
        refreshJobs();
        setStatusMsg({ text: 'Price proposal sent. The other person needs to agree, then confirm it.', type: 'success' });
      },
      onError: () => setStatusMsg({ text: 'Price proposal could not be sent. Please try again.', type: 'error' }),
    });
  };

  const handleDeclinePrice = (quoteId: string, offerId: string) => {
    declinePriceOffer.mutate({ quoteId, offerId }, {
      onSuccess: () => {
        refetchQuotes();
        setStatusMsg({ text: 'Price declined. You can suggest a different amount.', type: 'success' });
      },
      onError: () => setStatusMsg({ text: 'Price offer could not be declined.', type: 'error' }),
    });
  };

  const handlePassQuote = (quoteId: string) => {
    rejectQuote.mutate({ quoteId }, {
      onSuccess: () => {
        refetchQuotes();
        setStatusMsg({ text: 'You passed on this worker. Their offer is no longer active.', type: 'success' });
      },
      onError: () => setStatusMsg({ text: 'This offer could not be passed on.', type: 'error' }),
    });
  };

  const handleCheckPayment = (quoteId: string) => {
    setStatusMsg(null);
    confirmQuotePayment.mutate({ quoteId }, {
      onSuccess: () => {
        setStatusMsg({ text: 'Payment confirmed. The engineer can start; their 85% share is released after you confirm completion.', type: 'success' });
        refetchQuotes();
        refreshJobs();
      },
      onError: () => {
        setStatusMsg({ text: 'Payment is not confirmed yet. If you completed checkout, wait a moment and check again.', type: 'error' });
        refetchQuotes();
        refreshJobs();
      },
    });
  };

  useEffect(() => {
    if (!job) return;
    const currentAgreedJob = job.status === 'pending_payment' && job.acceptedQuoteId
      ? `${job.id}:${job.acceptedQuoteId}`
      : null;
    if (!hasObservedJobRef.current) {
      hasObservedJobRef.current = true;
      previousAgreedJobRef.current = currentAgreedJob;
      return;
    }
    const becameAgreed = currentAgreedJob !== null && previousAgreedJobRef.current === null;
    previousAgreedJobRef.current = currentAgreedJob;
    if (isCustomer && becameAgreed && job.acceptedQuoteId) handleAcceptQuote(job.acceptedQuoteId);
  }, [job?.id, job?.status, job?.acceptedQuoteId, isCustomer]);

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const renderDetails = () => (
    <View style={{ padding: 20 }}>
      <View style={[styles.badge, { backgroundColor: colors.secondary, alignSelf: 'flex-start' }]}>
        <Text style={{ color: colors.secondaryForeground, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' }}>
          {job.status.replace('_', ' ')}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.foreground, marginTop: 12, marginBottom: 8 }}>
        {job.title}
      </Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: colors.mutedForeground, marginBottom: 20 }}>
        {job.category === 'plumbing' ? 'Plumbing' : job.category === 'painting' ? 'Painting and decorating' : job.category === 'electrical' ? 'Electrical' : 'Appliance repair'} • {job.itemType} • {isCustomer ? 'Postcode' : job.status === 'open' ? 'Area' : 'Postcode'} {job.postcode}
      </Text>

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 8 }}>Description</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.foreground, lineHeight: 24, marginBottom: 24 }}>
        {job.description}
      </Text>
      <MarketplaceSafetyActions targetType="job" targetId={job.id} blockedUserId={isCustomer ? undefined : job.customerId} />
      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 20 }}>
        Keep payments and contact details in FixMate. Never send deposits or bank details. Use Report or Block if something feels unsafe.
      </Text>

      {job.applianceDetails && Object.values(job.applianceDetails).some(Boolean) && (
        <>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 8 }}>
            Appliance details
          </Text>
          <View style={[styles.applianceDetailsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {([
              ['Brand', job.applianceDetails.brand],
              ['Model number', job.applianceDetails.modelNumber],
              ['Serial number', job.applianceDetails.serialNumber],
              ['Product type', job.applianceDetails.productType],
              ['Approximate age', job.applianceDetails.approximateAge],
            ] as const).map(([label, value]) => value ? (
              <View key={label} style={styles.applianceDetailRow}>
                <Text style={[styles.applianceDetailLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
                <Text style={[styles.applianceDetailValue, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{value}</Text>
              </View>
            ) : null)}
          </View>
        </>
      )}

      <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.timelineHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Repair timeline</Text>
            <Text style={[styles.timelineIntro, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Track the repair from diagnosis to follow-up.</Text>
          </View>
          <Feather name="activity" size={20} color={colors.primary} />
        </View>
        {job.paymentStatus !== 'unpaid' && (
          <View style={{ padding: 12, marginBottom: 12, borderRadius: colors.radius, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
              {job.paymentStatus === 'transferred' ? 'Payout released' : job.paymentStatus === 'transfer_pending' ? 'Payout pending' : job.paymentStatus === 'paid' ? 'Payment confirmed' : 'Payment pending'}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
              {job.paymentStatus === 'transferred'
                ? `£${((job.engineerPayoutPence ?? 0) / 100).toFixed(2)} has been sent to the engineer’s Stripe balance. Bank arrival follows their Stripe payout schedule.`
                : job.paymentStatus === 'transfer_pending'
                  ? 'The customer confirmed the repair. The Stripe transfer is not confirmed yet; retry below to check it.'
                  : `The engineer’s 85% share (£${((job.engineerPayoutPence ?? 0) / 100).toFixed(2)}) is transferred after the customer confirms completion.`}
            </Text>
            {job.platformCommissionPence != null && (
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 5 }}>
                FixMate fee 15%: £{(job.platformCommissionPence / 100).toFixed(2)}
              </Text>
            )}
          </View>
        )}
        {job.timeline.map((event) => {
          const canUpdate = isCustomer && (
            event.key === 'parts_ordered' ||
            (event.key === 'repair_completed' && job.status === 'accepted' && ['paid', 'transfer_pending'].includes(job.paymentStatus))
          );
          return (
            <View key={event.key} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { borderColor: event.completed ? colors.primary : colors.border, backgroundColor: event.completed ? colors.primary : colors.background }]}>
                {event.completed && <Feather name="check" size={11} color={colors.primaryForeground} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineLabel, { color: event.completed ? colors.primary : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{event.label}</Text>
                {event.completedAt && <Text style={[styles.timelineDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{new Date(event.completedAt).toLocaleDateString('en-GB')}</Text>}
              </View>
              {canUpdate && (
                <Pressable
                  onPress={() => updateTimeline.mutate(
                    { jobId: job.id, data: { step: event.key as 'parts_ordered' | 'repair_completed', completed: !event.completed } },
                    { onSuccess: refreshJobs },
                  )}
                  disabled={updateTimeline.isPending}
                  style={[styles.timelineButton, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
                    {event.key === 'repair_completed'
                      ? job.paymentStatus === 'transfer_pending' ? 'Retry payout' : 'Confirm & release'
                      : event.completed ? 'Undo' : 'Done'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {isCustomer && (
          <View style={[styles.remindersBox, { borderTopColor: colors.border }]}>
            <Text style={[styles.reminderTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Set a reminder</Text>
            <View style={styles.reminderChoices}>
              {reminderOptions.map((option) => (
                <Pressable
                  key={option.kind}
                  onPress={() => createReminder.mutate(
                    { jobId: job.id, data: { kind: option.kind, dueAt: new Date(Date.now() + option.days * 86400000).toISOString() } },
                    { onSuccess: refreshJobs },
                  )}
                  disabled={createReminder.isPending}
                  style={[styles.reminderChoice, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            {job.reminders.map((reminder) => (
              <Pressable
                key={reminder.id}
                onPress={() => updateReminder.mutate(
                  { jobId: job.id, reminderId: reminder.id, data: { completed: !reminder.completed } },
                  { onSuccess: refreshJobs },
                )}
                style={styles.reminderRow}
              >
                <Feather name={reminder.completed ? 'check-square' : 'square'} size={16} color={reminder.completed ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.reminderText, { color: reminder.completed ? colors.mutedForeground : colors.foreground, fontFamily: 'Inter_400Regular' }]}>{reminder.label} · {new Date(reminder.dueAt).toLocaleDateString('en-GB')}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {job.photoRefs && job.photoRefs.length > 0 && (
        <>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 8 }}>Photos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {job.photoRefs.map((_: string, idx: number) => (
              <JobPhoto key={idx} jobId={job.id} index={idx} />
            ))}
          </View>
        </>
      )}

      {!isCustomer && profile?.isActive && job.status === 'open' && !myResponse && (
        <View style={{ marginTop: 32, padding: 20, backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 16, textAlign: 'center' }}>
             Can you do this job?
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => handleInterest('declined')}
              style={{ flex: 1, padding: 14, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground }}>Pass</Text>
            </Pressable>
            <Pressable
              onPress={() => handleInterest('interested')}
              style={{ flex: 1, padding: 14, borderRadius: colors.radius, backgroundColor: colors.foreground, alignItems: 'center' }}
            >
               <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.background }}>I can do this</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isCustomer && profile?.isActive && job.status === 'open' && myResponse?.status === 'interested' && !hasQuoted && (
         <View style={{ marginTop: 32, padding: 20, backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 8, textAlign: 'center' }}>
               You can do this job
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.mutedForeground, marginBottom: 16, textAlign: 'center' }}>
               Send an offer with your labour, materials, timing, and availability.
            </Text>
            <Pressable
              onPress={() => router.push(`/jobs/quote?jobId=${job.id}`)}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: colors.radius }}
            >
               <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.primaryForeground }}>Send offer</Text>
            </Pressable>
         </View>
      )}
      {isCustomer && isSubscribed && job.status === 'open' && (
        <View style={{ marginTop: 24, padding: 16, backgroundColor: colors.primary + '1A', borderRadius: colors.radius, borderWidth: 1, borderColor: colors.primary + '33' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Feather name="star" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.primary }}>FixMate Plus Member</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
             You can target an estimated 15% saving on the job. Your worker submits the final offer, so the saving is not automatic or guaranteed.
          </Text>
        </View>
      )}
    </View>
  );

  const renderQuotes = () => {
    if (!quotes || quotes.length === 0) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Feather name="file-text" size={32} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={{ fontFamily: 'Inter_500Medium', color: colors.mutedForeground, textAlign: 'center' }}>
            No quotes submitted yet.
          </Text>
        </View>
      );
    }
    const quoteCandidates = quotes.filter((quote: any) => quote.status === 'pending' || quote.status === 'negotiating');
    const comparisonQuotes = quoteCandidates.length > 0 ? quoteCandidates : quotes;
    const sortedQuotes = [...quotes].sort((a: any, b: any) => {
      if (quoteSort === 'price') return effectiveQuotePrice(a) - effectiveQuotePrice(b);
      if (quoteSort === 'speed') return durationMinutes(a.estimatedDuration) - durationMinutes(b.estimatedDuration);
      if (quoteSort === 'rating') return b.engineerRating - a.engineerRating || b.engineerCompletedJobs - a.engineerCompletedJobs;
      return (b.engineerRating * 10 - effectiveQuotePrice(b) / 10000) - (a.engineerRating * 10 - effectiveQuotePrice(a) / 10000);
    });
    const lowestPrice = comparisonQuotes.reduce((best: any, quote: any) => !best || effectiveQuotePrice(quote) < effectiveQuotePrice(best) ? quote : best, null);
    const fastest = comparisonQuotes.reduce((best: any, quote: any) => !best || durationMinutes(quote.estimatedDuration) < durationMinutes(best.estimatedDuration) ? quote : best, null);
    const bestRated = comparisonQuotes.reduce((best: any, quote: any) => !best || quote.engineerRating > best.engineerRating ? quote : best, null);

    return (
      <View style={{ padding: 20 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.foreground }}>Compare quotes</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.mutedForeground, marginTop: 4 }}>
            Compare total cost, speed, warranty, and repairer history together.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {([
              ['recommended', 'Recommended'],
              ['price', 'Lowest total'],
              ['speed', 'Fastest'],
              ['rating', 'Highest rated'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: quoteSort === value }}
                accessibilityLabel={`Sort quotes by ${label}`}
                onPress={() => setQuoteSort(value)}
                style={{ paddingHorizontal: 9, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: quoteSort === value ? colors.primary : colors.border, backgroundColor: quoteSort === value ? colors.primary : colors.card }}
              >
                <Text style={{ color: quoteSort === value ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[
              ['Lowest total', lowestPrice ? `£${(effectiveQuotePrice(lowestPrice) / 100).toFixed(2)}` : '—', lowestPrice?.engineerName],
              ['Fastest repair', fastest?.estimatedDuration ?? '—', fastest?.engineerName],
              ['Best rating', bestRated ? `${bestRated.engineerRating.toFixed(1)} / 5` : '—', bestRated?.engineerName],
            ].map(([label, value, name]) => (
              <View key={label} style={{ flex: 1, padding: 10, borderRadius: colors.radius, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>{label}</Text>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 4 }}>{value}</Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 }}>{name || 'No quote yet'}</Text>
              </View>
            ))}
          </View>
        </View>
        {sortedQuotes.map((quote: any) => {
          const activeOffer = [...quote.priceOffers].reverse().find((offer: any) => offer.status === 'pending' || offer.status === 'awaiting_proposer');
          const currentPricePence = quote.agreedTotalPence ?? quote.currentOfferPence ?? quote.totalPence;
          const isSelectedForPayment = isCustomer && job.status === 'pending_payment' && job.acceptedQuoteId === quote.id;
          const canNegotiate = job.status === 'open' && quote.status !== 'rejected';
          const customerCanAgree = activeOffer?.status === 'pending' && activeOffer.proposerRole === 'engineer';
          const customerCanConfirm = activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'customer';
          const engineerCanAgree = activeOffer?.status === 'pending' && activeOffer.proposerRole === 'customer';
          const engineerCanConfirm = activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'engineer';
          const canCounter = canNegotiate && (!activeOffer || activeOffer.status === 'awaiting_proposer' || activeOffer.proposerRole === (isCustomer ? 'engineer' : 'customer'));
          return (
          <View key={quote.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground }}>{quote.engineerName}</Text>
              <View style={[styles.badge, { backgroundColor: quote.status === 'accepted' ? colors.primary : colors.muted }]}>
                <Text style={{ color: quote.status === 'accepted' ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                  {quote.status}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.mutedForeground, marginBottom: 16 }}>
              {quote.message}
            </Text>
            <View style={{ padding: 12, marginBottom: 16, borderRadius: colors.radius, backgroundColor: colors.secondary }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 6 }}>Price discussion</Text>
              {quote.priceOffers.map((offer: any) => (
                <Text key={offer.id} style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginBottom: 4 }}>
                  {offer.proposerRole === (isCustomer ? 'customer' : 'engineer') ? 'Your offer' : (isCustomer ? 'Worker offer' : 'Customer offer')}: £{(offer.amountPence / 100).toFixed(2)} · {offer.status.replace('_', ' ')}
                </Text>
              ))}
              {isCustomer && activeOffer?.status === 'pending' && activeOffer.proposerRole === 'customer' && (
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Your price proposal is waiting for the worker to respond.</Text>
              )}
              {isCustomer && activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'engineer' && (
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>You agreed. The worker needs to confirm this price.</Text>
              )}
              {!isCustomer && activeOffer?.status === 'pending' && activeOffer.proposerRole === 'engineer' && (
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Your offer is waiting for the customer to agree.</Text>
              )}
              {!isCustomer && activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'customer' && (
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>You agreed. The customer needs to confirm this price.</Text>
              )}
              {isCustomer && customerCanConfirm && (
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 4 }}>The worker agreed. Confirm the price to finalize.</Text>
              )}
              {!isCustomer && engineerCanConfirm && (
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 4 }}>The customer agreed. Confirm the price to finalize.</Text>
              )}
              {isSelectedForPayment && (
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 4 }}>Both sides agreed. Your job is reserved while payment is completed.</Text>
              )}
            </View>
            <RepairerVerificationCard quote={quote} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Est. Duration</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>{quote.estimatedDuration}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Labor</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>£{(quote.laborPence / 100).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Materials</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>£{(quote.toolsAndMaterialsPence / 100).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Call-out</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>£{(quote.callOutFeePence / 100).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Arrival</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>{quote.estimatedArrival}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Warranty</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>{quote.warranty}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Available</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>{quote.earliestAvailability}</Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginBottom: 12 }}>
              Rating {quote.engineerRating.toFixed(1)} / 5 · {quote.engineerCompletedJobs} completed jobs
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {lowestPrice?.id === quote.id && <Text style={{ color: colors.primaryForeground, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>Lowest total</Text>}
              {fastest?.id === quote.id && <Text style={{ color: colors.primaryForeground, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>Fastest</Text>}
              {bestRated?.id === quote.id && <Text style={{ color: colors.primaryForeground, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>Highest rated</Text>}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Total</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', color: colors.foreground, fontSize: 18 }}>£{(currentPricePence / 100).toFixed(2)}</Text>
            </View>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>FixMate fee (15%)</Text>
                <Text style={{ fontFamily: 'Inter_500Medium', color: colors.foreground }}>£{(quote.platformCommissionPence / 100).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Engineer share after completion (85%)</Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>£{(quote.engineerPayoutPence / 100).toFixed(2)}</Text>
              </View>
            </View>
            {isCustomer && canNegotiate && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                {customerCanAgree && (
                  <Pressable onPress={() => handleAgreePrice(quote.id, activeOffer.id)} style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center' }}>
                    <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>Agree to £{(activeOffer.amountPence / 100).toFixed(2)}</Text>
                  </Pressable>
                )}
                {customerCanConfirm && (
                  <Pressable onPress={() => handleAgreePrice(quote.id, activeOffer.id)} style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center' }}>
                    <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>Confirm agreed price</Text>
                  </Pressable>
                )}
                {canCounter && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      accessibilityLabel="Counteroffer in pounds"
                      keyboardType="decimal-pad"
                      value={counterPrices[quote.id] ?? ''}
                      onChangeText={(value) => setCounterPrices((current) => ({ ...current, [quote.id]: value }))}
                      placeholder={(currentPricePence / 100).toFixed(2)}
                      placeholderTextColor={colors.mutedForeground}
                      style={{ flex: 1, minWidth: 100, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, paddingHorizontal: 12, color: colors.foreground, fontFamily: 'Inter_500Medium' }}
                    />
                    <Pressable disabled={createPriceOffer.isPending || !counterPrices[quote.id]} onPress={() => handleCounterPrice(quote.id)} style={{ padding: 12, borderRadius: colors.radius, backgroundColor: colors.primary, justifyContent: 'center', opacity: createPriceOffer.isPending ? 0.6 : 1 }}>
                      <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }}>Suggest price</Text>
                    </Pressable>
                  </View>
                )}
                {isCustomer && activeOffer?.proposerRole === 'engineer' && activeOffer.status === 'pending' && (
                  <Pressable onPress={() => handleDeclinePrice(quote.id, activeOffer.id)} disabled={declinePriceOffer.isPending} style={{ padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Decline this price</Text>
                  </Pressable>
                )}
                {!activeOffer?.status?.includes('accepted') && (
                  <Pressable onPress={() => handlePassQuote(quote.id)} disabled={rejectQuote.isPending} style={{ padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>{rejectQuote.isPending ? 'Passing…' : 'Pass on this worker'}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {!isCustomer && canNegotiate && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                {engineerCanAgree && (
                  <Pressable onPress={() => handleAgreePrice(quote.id, activeOffer.id)} style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center' }}>
                    <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>Agree to customer's £{(activeOffer.amountPence / 100).toFixed(2)}</Text>
                  </Pressable>
                )}
                {engineerCanConfirm && (
                  <Pressable onPress={() => handleAgreePrice(quote.id, activeOffer.id)} style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center' }}>
                    <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>Confirm agreed price</Text>
                  </Pressable>
                )}
                {canCounter && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      accessibilityLabel="Counteroffer in pounds"
                      keyboardType="decimal-pad"
                      value={counterPrices[quote.id] ?? ''}
                      onChangeText={(value) => setCounterPrices((current) => ({ ...current, [quote.id]: value }))}
                      placeholder={(currentPricePence / 100).toFixed(2)}
                      placeholderTextColor={colors.mutedForeground}
                      style={{ flex: 1, minWidth: 100, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, paddingHorizontal: 12, color: colors.foreground, fontFamily: 'Inter_500Medium' }}
                    />
                    <Pressable disabled={createPriceOffer.isPending || !counterPrices[quote.id]} onPress={() => handleCounterPrice(quote.id)} style={{ padding: 12, borderRadius: colors.radius, backgroundColor: colors.primary, justifyContent: 'center', opacity: createPriceOffer.isPending ? 0.6 : 1 }}>
                      <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }}>Suggest price</Text>
                    </Pressable>
                  </View>
                )}
                {!isCustomer && activeOffer?.proposerRole === 'customer' && activeOffer.status === 'pending' && (
                  <Pressable onPress={() => handleDeclinePrice(quote.id, activeOffer.id)} disabled={declinePriceOffer.isPending} style={{ padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Decline this price</Text>
                  </Pressable>
                )}
              </View>
            )}
            {isSelectedForPayment && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Pressable
                  testID={`button-continue-checkout-${quote.id}`}
                  onPress={() => handleAcceptQuote(quote.id)}
                  disabled={acceptQuote.isPending}
                  style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center', opacity: acceptQuote.isPending ? 0.65 : 1 }}
                >
                  <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>{acceptQuote.isPending ? 'Opening Checkout…' : 'Pay securely with Stripe'}</Text>
                </Pressable>
                <Pressable
                  testID={`button-check-payment-${quote.id}`}
                  onPress={() => handleCheckPayment(quote.id)}
                  disabled={confirmQuotePayment.isPending}
                  style={{ backgroundColor: colors.foreground, padding: 14, borderRadius: colors.radius, alignItems: 'center', opacity: confirmQuotePayment.isPending ? 0.65 : 1 }}
                >
                  <Text style={{ color: colors.background, fontFamily: 'Inter_600SemiBold' }}>{confirmQuotePayment.isPending ? 'Checking payment…' : 'Check payment status'}</Text>
                </Pressable>
                <Pressable
                  testID={`button-cancel-payment-${quote.id}`}
                  onPress={() => cancelPayment.mutate(
                    { quoteId: quote.id },
                    { onSuccess: () => { refetchQuotes(); refreshJobs(); }, onError: () => setStatusMsg({ text: 'Payment could not be cancelled safely. Try again.', type: 'error' }) },
                  )}
                  disabled={cancelPayment.isPending}
                  style={{ padding: 12, borderRadius: colors.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>{cancelPayment.isPending ? 'Cancelling…' : 'Cancel payment selection'}</Text>
                </Pressable>
              </View>
            )}
            <MarketplaceSafetyActions targetType="quote" targetId={quote.id} blockedUserId={isCustomer ? quote.engineerId : undefined} />
          </View>
          );
        })}
      </View>
    );
  };

  const renderMessages = () => {
    if (isCustomer && !selectedThread) {
      if (activeEngineerIds.length === 0) {
        return (
          <View style={{ padding: 40, alignItems: 'center' }}>
             <Feather name="message-circle" size={32} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
             <Text style={{ fontFamily: 'Inter_500Medium', color: colors.mutedForeground, textAlign: 'center' }}>
                No workers have applied yet.
             </Text>
          </View>
        );
      }
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 16 }}>
            Choose a worker to chat
          </Text>
          {activeEngineerIds.map((engId: string) => {
            const resp = responses?.find((r: any) => r.engineerId === engId);
            const qt = quotes?.find((q: any) => q.engineerId === engId);
            const name = qt?.engineerName || resp?.engineerName || 'Unknown Engineer';
            return (
              <View key={engId} style={{ backgroundColor: colors.card, padding: 16, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                <Pressable
                  onPress={() => setSelectedThread(engId)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground, fontSize: 16 }}>{name}</Text>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </Pressable>
                <View style={{ marginTop: 10 }}>
                  <MarketplaceSafetyActions targetType="repairer" targetId={engId} blockedUserId={engId} />
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    // Chat thread view
    return (
      <View style={{ flex: 1 }}>
        {isCustomer && (
          <Pressable onPress={() => setSelectedThread(null)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Feather name="arrow-left" size={20} color={colors.foreground} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Back to Threads</Text>
          </Pressable>
        )}
        <View style={{ padding: 20 }}>
          {messages?.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginBottom: 20 }}>
              No messages yet. Start the conversation!
            </Text>
          ) : (
            messages?.map((msg: any) => {
              const isMe = (isCustomer && msg.senderRole === 'customer') || (!isCustomer && msg.senderRole === 'engineer');
              return (
                <View key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', backgroundColor: isMe ? colors.primary : colors.card, padding: 12, borderRadius: 12, maxWidth: '80%', marginBottom: 12, borderWidth: isMe ? 0 : 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', color: isMe ? colors.primaryForeground : colors.foreground }}>
                    {msg.body}
                  </Text>
                  {!isMe && <MarketplaceSafetyActions targetType="message" targetId={msg.id} blockedUserId={msg.senderId} />}
                </View>
              );
            })
          )}
        </View>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background }}>
          <TextInput
            value={messageBody}
            onChangeText={setMessageBody}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontFamily: 'Inter_400Regular', backgroundColor: colors.card, color: colors.foreground }}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={createMessage.isPending || !messageBody.trim()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: messageBody.trim() ? colors.foreground : colors.muted, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="send" size={18} color={messageBody.trim() ? colors.background : colors.mutedForeground} style={{ marginLeft: 2, marginTop: 2 }} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 16, padding: 4 }}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.foreground }}>Job Details</Text>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 24, gap: 8 }}>
          {(['details', 'quotes', 'messages'] as const).map(t => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: tab === t ? colors.foreground : 'transparent', borderRadius: colors.radius }}
            >
              <Text style={{ fontFamily: tab === t ? 'Inter_600SemiBold' : 'Inter_500Medium', color: tab === t ? colors.background : colors.mutedForeground, textTransform: 'capitalize' }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {statusMsg && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ backgroundColor: statusMsg.type === 'error' ? colors.destructive + '1A' : colors.primary + '1A', padding: 12, borderRadius: colors.radius }}>
            <Text style={{ color: statusMsg.type === 'error' ? colors.destructive : colors.primary, fontFamily: 'Inter_500Medium' }}>
              {statusMsg.text}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={[1]}
        keyExtractor={() => '1'}
        renderItem={() => (
          <>
            {tab === 'details' && renderDetails()}
            {tab === 'quotes' && renderQuotes()}
            {tab === 'messages' && renderMessages()}
          </>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  applianceDetailsCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  applianceDetailRow: {
    gap: 3,
  },
  applianceDetailLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  applianceDetailValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  timelineCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  timelineIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: 13,
  },
  timelineDate: {
    fontSize: 11,
    marginTop: 2,
  },
  timelineButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  remindersBox: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  reminderTitle: {
    fontSize: 14,
  },
  reminderChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChoice: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderText: {
    fontSize: 13,
  },
});
