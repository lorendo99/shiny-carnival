import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import {
  getListInventoryItemsQueryKey,
  useCreateInventoryItem,
  useListInventoryItems,
  type InventoryItemCategory,
} from '@workspace/api-client-react';

const categories: Array<{ value: InventoryItemCategory; label: string }> = [
  { value: 'kitchen_appliances', label: 'Kitchen' },
  { value: 'heating_equipment', label: 'Heating' },
  { value: 'tvs_electronics', label: 'Electronics' },
  { value: 'plumbing_fixtures', label: 'Plumbing' },
  { value: 'garden_equipment', label: 'Garden' },
];

function categoryLabel(category: InventoryItemCategory) {
  return categories.find((entry) => entry.value === category)?.label ?? category;
}

export default function InventoryTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<InventoryItemCategory | 'all'>('all');
  const [form, setForm] = useState({
    name: '',
    category: 'kitchen_appliances' as InventoryItemCategory,
    manufacturer: '',
    model: '',
    warrantyEndDate: '',
  });
  const items = useListInventoryItems({
    query: {
      enabled: Boolean(isSignedIn),
      queryKey: getListInventoryItemsQueryKey(),
      staleTime: 30_000,
    },
  });
  const create = useCreateInventoryItem();
  const visibleItems = (items.data ?? []).filter((item) => filter === 'all' || item.category === filter);

  const save = () => {
    if (!form.name.trim() || create.isPending) return;
    create.mutate({
      data: {
        category: form.category,
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        warrantyEndDate: form.warrantyEndDate || null,
      },
    }, {
      onSuccess: (item) => {
        queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
        setShowAdd(false);
        setForm({ name: '', category: 'kitchen_appliances', manufacturer: '', model: '', warrantyEndDate: '' });
        router.push(`/inventory/${item.id}`);
      },
    });
  };

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 64 }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="lock" size={28} color={colors.primary} /></View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Your household inventory</Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Sign in to keep appliance details, warranty dates, repairs, and reminders together.</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius }]} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={[styles.primaryButtonText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120, paddingHorizontal: 20, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Inventory</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>The useful details for every repair.</Text>
              </View>
              <Pressable accessibilityLabel="Add household item" style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={() => setShowAdd(true)}>
                <Feather name="plus" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.filterRow}>
              <Pressable style={[styles.filter, { borderColor: colors.border, backgroundColor: filter === 'all' ? colors.foreground : colors.card }]} onPress={() => setFilter('all')}>
                <Text style={{ color: filter === 'all' ? colors.background : colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>All</Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable key={category.value} style={[styles.filter, { borderColor: colors.border, backgroundColor: filter === category.value ? colors.foreground : colors.card }]} onPress={() => setFilter(category.value)}>
                  <Text style={{ color: filter === category.value ? colors.background : colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>{category.label}</Text>
                </Pressable>
              ))}
            </View>
            {items.isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
            {items.isError && <Text style={[styles.error, { color: colors.destructive }]}>We could not load your inventory. Pull to try again.</Text>}
          </View>
        }
        ListEmptyComponent={!items.isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="clipboard" size={28} color={colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Nothing recorded yet</Text>
            <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Add a household item so its diagnosis history and maintenance reminders stay together.</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius }]} onPress={() => setShowAdd(true)}>
              <Text style={[styles.primaryButtonText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>Add an item</Text>
            </Pressable>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push(`/inventory/${item.id}`)}>
            <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Feather name="home" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardCategory, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{categoryLabel(item.category)}</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.name}</Text>
              <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{[item.manufacturer, item.model].filter(Boolean).join(' · ') || 'Model not recorded'}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      />
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.foreground + '99' }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <KeyboardAwareScrollViewCompat
              contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 28 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bottomOffset={88}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerRow}><Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Add household item</Text><Pressable onPress={() => setShowAdd(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable></View>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Name, e.g. Washing machine" placeholderTextColor={colors.mutedForeground} value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} autoFocus />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Category</Text>
              <View style={styles.categoryGrid}>{categories.map((category) => <Pressable key={category.value} style={[styles.categoryChoice, { borderColor: colors.border, backgroundColor: form.category === category.value ? colors.secondary : colors.background }]} onPress={() => setForm({ ...form, category: category.value })}><Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>{category.label}</Text></Pressable>)}</View>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Manufacturer (optional)" placeholderTextColor={colors.mutedForeground} value={form.manufacturer} onChangeText={(value) => setForm({ ...form, manufacturer: value })} />
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Model number (optional)" placeholderTextColor={colors.mutedForeground} value={form.model} onChangeText={(value) => setForm({ ...form, model: value })} />
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Warranty end YYYY-MM-DD (optional)" placeholderTextColor={colors.mutedForeground} value={form.warrantyEndDate} onChangeText={(value) => setForm({ ...form, warrantyEndDate: value })} />
              {create.isError && <Text style={[styles.error, { color: colors.destructive }]}>Could not save this item. Check the details and try again.</Text>}
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.foreground, borderRadius: colors.radius, opacity: create.isPending ? 0.6 : 1 }]} onPress={save} disabled={create.isPending}><Text style={[styles.primaryButtonText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>{create.isPending ? 'Saving…' : 'Save item'}</Text></Pressable>
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 32, letterSpacing: -1 },
  subtitle: { fontSize: 15, marginTop: 5 },
  addButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  filter: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardCategory: { fontSize: 12, marginBottom: 4 },
  cardTitle: { fontSize: 17, marginBottom: 4 },
  cardMeta: { fontSize: 13 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 18 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320, marginBottom: 24 },
  primaryButton: { paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
  primaryButtonText: { fontSize: 15 },
  error: { textAlign: 'center', marginVertical: 12, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 22 },
  inputLabel: { fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  categoryChoice: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
});