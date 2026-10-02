import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { EngineerProfile, RepairQuote } from '@workspace/api-client-react';

type Props =
  | { profile: EngineerProfile; quote?: never }
  | { profile?: never; quote: RepairQuote };

export function RepairerVerificationCard(props: Props) {
  const colors = useColors();
  const values = props.profile
    ? {
        identity: props.profile.identityVerified,
        business: props.profile.businessDetailsVerified,
        insurance: props.profile.insuranceEvidenceProvided,
        qualifications: props.profile.qualificationsProvided,
        rating: props.profile.rating,
        reviews: props.profile.reviewCount,
        jobs: props.profile.completedJobs,
      }
    : {
        identity: props.quote.engineerIdentityVerified,
        business: props.quote.engineerBusinessDetailsVerified,
        insurance: props.quote.engineerInsuranceEvidenceProvided,
        qualifications: props.quote.engineerQualificationsProvided,
        rating: props.quote.engineerRating,
        reviews: props.quote.engineerReviewCount,
        jobs: props.quote.engineerCompletedJobs,
      };
  const evidence = [
    ['Identity verified', values.identity],
    ['Business details verified', values.business],
    ['Insurance evidence provided', values.insurance],
    ['Qualifications provided', values.qualifications],
  ] as const;

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.heading}>
        <Feather name="shield" size={15} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Repairer evidence</Text>
      </View>
      <View style={styles.list}>
        {evidence.map(([label, present]) => (
          <Text key={label} style={[styles.item, { color: present ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {present ? '✓' : '—'} {label}
          </Text>
        ))}
        <Text style={[styles.item, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{values.rating.toFixed(1)} / 5</Text> customer reviews ({values.reviews})
        </Text>
        <Text style={[styles.item, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{values.jobs}</Text> completed FixMate jobs
        </Text>
      </View>
      <Text style={[styles.note, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        These are individual evidence points, not a claim that every repairer is fully vetted.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, marginTop: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  title: { fontSize: 13 },
  list: { gap: 5 },
  item: { fontSize: 12, lineHeight: 17 },
  note: { fontSize: 11, lineHeight: 16, marginTop: 9 },
});