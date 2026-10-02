import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetRepairReportShare, getGetRepairReportShareQueryKey } from '@workspace/api-client-react';

function valueText(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, nested]) => `${key}: ${valueText(nested)}`).join('\n');
  return String(value ?? '');
}

export default function RepairReportScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const report = useGetRepairReportShare(String(id), { query: { enabled: Boolean(id), queryKey: getGetRepairReportShareQueryKey(String(id)) } });
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
      <Stack.Screen options={{ title: 'Repair report' }} />
      <View style={styles.brand}><View style={[styles.brandMark, { backgroundColor: colors.primary }]}><Feather name="tool" size={16} color={colors.foreground} /></View><Text style={[styles.brandText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>fixmate</Text></View>
      {report.isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />}
      {report.isError && <View style={styles.center}><Feather name="alert-circle" size={32} color={colors.destructive} /><Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Report unavailable</Text><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>This report may have expired or been revoked.</Text></View>}
      {report.data && <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}><View style={styles.reportHeading}><View><Text style={[styles.eyebrow, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Repair handover</Text><Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Approved details</Text></View><Feather name="check-circle" size={25} color={colors.primary} /></View><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Created {new Date(report.data.createdAt).toLocaleDateString('en-GB')}</Text>{Object.entries(report.data.fields).map(([key, value]) => <View key={key} style={[styles.field, { borderTopColor: colors.border }]}><Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{key.replace(/([A-Z])/g, ' $1')}</Text><Text style={[styles.fieldValue, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{valueText(value)}</Text></View>)}<View style={[styles.footer, { backgroundColor: colors.secondary }]}><Feather name="shield" size={15} color={colors.primary} /><Text style={[styles.footerText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Only details explicitly approved by the owner are shown.</Text></View></View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  brandMark: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 20 },
  card: { borderWidth: 1, padding: 18 },
  reportHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eyebrow: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24 },
  muted: { fontSize: 14, lineHeight: 20 },
  field: { borderTopWidth: 1, paddingVertical: 14, marginTop: 14 },
  fieldLabel: { fontSize: 12, textTransform: 'capitalize', marginBottom: 5 },
  fieldValue: { fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, marginTop: 14, borderRadius: 12 },
  footerText: { flex: 1, fontSize: 13 },
  center: { alignItems: 'center', paddingTop: 60, gap: 12 },
});