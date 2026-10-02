import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import {
  getGetInventoryItemQueryKey,
  getListInventoryRemindersQueryKey,
  getListInventoryRepairsQueryKey,
  useCreateInventoryRepair,
  useCreateRepairReportShare,
  useGetInventoryItem,
  useUpdateInventoryReminder,
  type InventoryRepairRecord,
  type RepairReportSelection,
} from '@workspace/api-client-react';

const dateLabel = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';
const moneyLabel = (pence: number | null) => pence == null ? 'Not recorded' : `£${(pence / 100).toFixed(2)}`;

export default function InventoryDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [showRepair, setShowRepair] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const detail = useGetInventoryItem(String(id), { query: { enabled: Boolean(isSignedIn && id), queryKey: getGetInventoryItemQueryKey(String(id)) } });
  const reminders = detail.data?.reminders ?? [];
  const repairs = detail.data?.repairs ?? [];
  const updateReminder = useUpdateInventoryReminder();
  const createRepair = useCreateInventoryRepair();
  const createShare = useCreateRepairReportShare();
  const [repairForm, setRepairForm] = useState({ fault: '', diagnosis: '', finalRepair: '', quote: '', finalCost: '' });
  const [selection, setSelection] = useState<RepairReportSelection>({
    includeItem: true,
    includeModel: true,
    includeProblem: false,
    includeDiagnosis: false,
    includeSafetyWarnings: false,
    includeQuestions: false,
    includeRepairRecord: false,
    mediaRefs: [],
  });
  const [problem, setProblem] = useState('');
  const [questions, setQuestions] = useState('');
  const [repairRecordId, setRepairRecordId] = useState<string | null>(null);

  if (!isSignedIn) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Feather name="lock" size={36} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Sign in to view this item</Text></View>;
  }
  if (detail.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!detail.data) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Feather name="alert-circle" size={36} color={colors.destructive} /><Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Item not found</Text></View>;
  }

  const item = detail.data.item;
  const saveRepair = () => {
    if (!repairForm.fault.trim() || !repairForm.diagnosis.trim() || !repairForm.finalRepair.trim() || createRepair.isPending) return;
    createRepair.mutate({
      itemId: item.id,
      data: {
        fault: repairForm.fault.trim(),
        diagnosis: repairForm.diagnosis.trim(),
        finalRepair: repairForm.finalRepair.trim(),
        quotePence: repairForm.quote ? Math.round(Number(repairForm.quote) * 100) : null,
        finalCostPence: repairForm.finalCost ? Math.round(Number(repairForm.finalCost) * 100) : null,
        beforeMediaRefs: [],
        afterMediaRefs: [],
        completedDate: null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(item.id) });
        queryClient.invalidateQueries({ queryKey: getListInventoryRepairsQueryKey(item.id) });
        setShowRepair(false);
        setRepairForm({ fault: '', diagnosis: '', finalRepair: '', quote: '', finalCost: '' });
      },
    });
  };
  const toggleSelection = (key: keyof Omit<RepairReportSelection, 'mediaRefs'>) => setSelection((current) => ({ ...current, [key]: !current[key] }));
  const share = () => {
    createShare.mutate({
      data: {
        itemId: item.id,
        repairRecordId: selection.includeRepairRecord ? repairRecordId : null,
        problem: selection.includeProblem ? problem.trim() || null : null,
        questions: selection.includeQuestions ? questions.trim() || null : null,
        selection,
      },
    }, {
      onSuccess: (report) => {
        setShowShare(false);
        router.push(`/repair-report/${report.id}`);
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={18} color={colors.foreground} /><Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>Inventory</Text></Pressable>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.secondary }]}><Feather name="home" size={25} color={colors.primary} /></View>
          <Text style={[styles.eyebrow, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{item.category.replaceAll('_', ' ')}</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{item.name}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.manufacturer || 'Manufacturer not recorded'}{item.model ? ` · ${item.model}` : ''}</Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius }]} onPress={() => setShowShare(true)}><Feather name="share-2" size={16} color={colors.background} /><Text style={[styles.primaryText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>Create report</Text></Pressable>
            <Pressable style={[styles.secondaryButton, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={async () => { await AsyncStorage.setItem('@fixmate_pending_inventory_item', item.id); router.replace('/'); }}><Feather name="camera" size={16} color={colors.foreground} /><Text style={[styles.secondaryText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Diagnose</Text></Pressable>
          </View>
        </View>
        <Section title="Item details" colors={colors}>
          <Fact label="Model" value={item.model} colors={colors} />
          <Fact label="Serial number" value={item.serialNumber} colors={colors} />
          <Fact label="Purchased" value={dateLabel(item.purchaseDate)} colors={colors} />
          <Fact label="Warranty ends" value={dateLabel(item.warrantyEndDate)} colors={colors} />
        </Section>
        <Section title="Maintenance reminders" colors={colors}>
          {reminders.length === 0 ? <EmptyText text="No reminders yet." colors={colors} /> : reminders.map((reminder) => (
            <Pressable key={reminder.id} style={styles.row} onPress={() => updateReminder.mutate({ itemId: item.id, reminderId: reminder.id, data: { completed: !reminder.completed } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(item.id) }) })}>
              <Feather name={reminder.completed ? 'check-circle' : 'circle'} size={20} color={reminder.completed ? colors.primary : colors.mutedForeground} />
              <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', textDecorationLine: reminder.completed ? 'line-through' : 'none' }]}>{reminder.title}</Text><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{dateLabel(reminder.dueDate)}</Text></View>
            </Pressable>
          ))}
        </Section>
        <Section title="Diagnosis history" colors={colors}>
          {detail.data.repairs.length === 0 && !detail.data.documents.length && detail.data.item.notes == null ? <EmptyText text="Diagnoses saved against this item will appear here." colors={colors} /> : <Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Use Diagnose to add the next FixMate assessment to this item.</Text>}
        </Section>
        <Section title="Repair records" colors={colors} action={<Pressable onPress={() => setShowRepair(true)}><Feather name="plus-circle" size={22} color={colors.primary} /></Pressable>}>
          {repairs.length === 0 ? <EmptyText text="Keep fault, quote, before/after evidence, and final cost together." colors={colors} /> : repairs.map((repair) => <RepairRow key={repair.id} repair={repair} colors={colors} />)}
        </Section>
      </ScrollView>
      <Modal visible={showRepair} animationType="slide" transparent onRequestClose={() => setShowRepair(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.foreground + '99' }]}><View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.headerRow}><Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Add repair record</Text><Pressable onPress={() => setShowRepair(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable></View>
          {(['fault', 'diagnosis', 'finalRepair', 'quote', 'finalCost'] as const).map((field) => <TextInput key={field} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder={field === 'fault' ? 'What went wrong?' : field === 'diagnosis' ? 'Diagnosis' : field === 'finalRepair' ? 'What was repaired?' : `${field === 'quote' ? 'Quoted' : 'Final'} cost in £`} placeholderTextColor={colors.mutedForeground} value={repairForm[field]} onChangeText={(value) => setRepairForm({ ...repairForm, [field]: value })} multiline={field === 'fault' || field === 'diagnosis' || field === 'finalRepair'} keyboardType={field === 'quote' || field === 'finalCost' ? 'decimal-pad' : 'default'} />)}
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius }]} onPress={saveRepair}><Text style={[styles.primaryText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>{createRepair.isPending ? 'Saving…' : 'Save repair'}</Text></Pressable>
        </View></View>
      </Modal>
      <Modal visible={showShare} animationType="slide" transparent onRequestClose={() => setShowShare(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.foreground + '99' }]}><View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.headerRow}><Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Choose what to share</Text><Pressable onPress={() => setShowShare(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable></View>
          <Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Only the fields you select are stored in the report. Postcodes and diagnosis IDs are never put in the link.</Text>
          {(['includeItem', 'includeModel', 'includeProblem', 'includeDiagnosis', 'includeSafetyWarnings', 'includeQuestions', 'includeRepairRecord'] as const).map((key) => <Pressable key={key} style={styles.row} onPress={() => toggleSelection(key)}><Feather name={selection[key] ? 'check-square' : 'square'} size={20} color={selection[key] ? colors.primary : colors.mutedForeground} /><Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{key.replace('include', '').replace(/([A-Z])/g, ' $1').trim()}</Text></Pressable>)}
          {selection.includeRepairRecord && repairs.length > 0 && <View style={styles.repairPicker}>{repairs.map((repair) => <Pressable key={repair.id} style={styles.row} onPress={() => setRepairRecordId(repair.id)}><Feather name={repairRecordId === repair.id ? 'check-circle' : 'circle'} size={19} color={repairRecordId === repair.id ? colors.primary : colors.mutedForeground} /><Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{repair.fault}</Text></Pressable>)}</View>}
          {selection.includeProblem && <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Problem description" placeholderTextColor={colors.mutedForeground} value={problem} onChangeText={setProblem} />}
          {selection.includeQuestions && <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Questions for the repairer" placeholderTextColor={colors.mutedForeground} value={questions} onChangeText={setQuestions} />}
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius, opacity: createShare.isPending ? 0.6 : 1 }]} onPress={share} disabled={createShare.isPending}><Text style={[styles.primaryText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>{createShare.isPending ? 'Creating…' : 'Create report'}</Text></Pressable>
        </View></View>
      </Modal>
    </View>
  );
}

function Section({ title, children, colors, action }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors>; action?: React.ReactNode }) {
  return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}><View style={styles.headerRow}><Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{title}</Text>{action}</View>{children}</View>;
}

function Fact({ label, value, colors }: { label: string; value: string | null; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.fact}><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text><Text style={[styles.factValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{value || 'Not recorded'}</Text></View>;
}

function RepairRow({ repair, colors }: { repair: InventoryRepairRecord; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.repair, { borderTopColor: colors.border }]}><View style={styles.headerRow}><Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{repair.fault}</Text><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{moneyLabel(repair.finalCostPence)}</Text></View><Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{repair.finalRepair || repair.diagnosis}</Text></View>;
}

function EmptyText({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.muted, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 22, textAlign: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  hero: { borderWidth: 1, padding: 18, marginBottom: 16 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 12, textTransform: 'capitalize', marginBottom: 5 },
  heroTitle: { fontSize: 27, letterSpacing: -0.5, marginBottom: 6 },
  muted: { fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 13 },
  primaryText: { fontSize: 14 },
  secondaryButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1 },
  secondaryText: { fontSize: 14 },
  section: { borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  factValue: { fontSize: 14, maxWidth: '60%', textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  rowTitle: { fontSize: 15, flex: 1 },
  repair: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modal: { padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 38, maxHeight: '90%' },
  modalTitle: { fontSize: 21 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10, minHeight: 46 },
  repairPicker: { borderTopWidth: 1, borderBottomWidth: 1, marginVertical: 8 },
});