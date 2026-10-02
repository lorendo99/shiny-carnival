import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useBlockMarketplaceUser,
  useCreateMarketplaceReport,
  type MarketplaceReportInputReason,
  type MarketplaceReportInputTargetType,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const reasons: Array<{ value: MarketplaceReportInputReason; label: string }> = [
  { value: 'unsafe', label: 'Unsafe or dangerous' },
  { value: 'fraud', label: 'Fraud or payment scam' },
  { value: 'abuse', label: 'Abusive or threatening' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

export function MarketplaceSafetyActions({
  targetType,
  targetId,
  blockedUserId,
}: {
  targetType: MarketplaceReportInputTargetType;
  targetId: string;
  blockedUserId?: string;
}) {
  const colors = useColors();
  const report = useCreateMarketplaceReport();
  const block = useBlockMarketplaceUser();
  const [status, setStatus] = useState<string | null>(null);

  const handleReport = () => {
    Alert.alert(
      'Report marketplace content',
      'Choose the reason that best describes the problem.',
      reasons.map((reason) => ({
        text: reason.label,
        onPress: () => report.mutate(
          { data: { targetType, targetId, reason: reason.value } },
          {
            onSuccess: () => setStatus('Report sent'),
            onError: () => setStatus('Could not send report'),
          },
        ),
      })),
    );
  };

  const handleBlock = () => {
    if (!blockedUserId) return;
    Alert.alert(
      'Block participant?',
      'You will no longer see each other’s jobs, quotes, or messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => block.mutate(
            { data: { blockedUserId } },
            {
              onSuccess: () => setStatus('Participant blocked'),
              onError: () => setStatus('Could not block participant'),
            },
          ),
        },
      ],
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <Pressable onPress={handleReport} disabled={report.isPending} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="flag" size={13} color={colors.mutedForeground} />
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.mutedForeground }}>{report.isPending ? 'Sending…' : 'Report'}</Text>
      </Pressable>
      {blockedUserId && (
        <Pressable onPress={handleBlock} disabled={block.isPending} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="slash" size={13} color={colors.mutedForeground} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.mutedForeground }}>{block.isPending ? 'Blocking…' : 'Block'}</Text>
        </Pressable>
      )}
      {status && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary }}>{status}</Text>}
    </View>
  );
}