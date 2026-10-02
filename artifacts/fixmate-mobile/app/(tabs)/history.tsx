import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getDiagnoses, Diagnosis } from '@/lib/storage';
import { useFocusEffect } from 'expo-router';

export default function HistoryTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      getDiagnoses().then(data => {
        if (isActive) {
          setDiagnoses(data);
          setIsLoading(false);
        }
      });
      return () => { isActive = false; };
    }, [])
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: colors.secondary }]}>
        <Feather name="clock" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        No History Yet
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Your past appliance diagnoses will appear here.
      </Text>
      <Pressable
        testID="history-start-btn"
        style={[styles.emptyBtn, { backgroundColor: colors.foreground, borderRadius: colors.radius }]}
        onPress={() => router.push('/')}
      >
        <Text style={[styles.emptyBtnText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>
          Start a Diagnosis
        </Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: Diagnosis }) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <Pressable
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
        onPress={() => router.push(`/diagnosis/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardAppliance, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {item.appliance.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <Text style={[styles.cardDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {date}
          </Text>
        </View>
        <Text style={[styles.cardHeadline, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
          {item.headline}
        </Text>
        <Text style={[styles.cardSymptom, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
          "{item.symptom}"
        </Text>
        <View style={styles.cardFooter}>
          <View style={[styles.costBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="tool" size={12} color={colors.mutedForeground} />
            <Text style={[styles.costText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              Est. £{item.repairCostMin} - £{item.repairCostMax}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={diagnoses}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              History
            </Text>
          </View>
        }
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    letterSpacing: -1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
    maxWidth: '80%',
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
  cardAppliance: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  cardDate: {
    fontSize: 12,
  },
  cardHeadline: {
    fontSize: 16,
    marginBottom: 6,
  },
  cardSymptom: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  costText: {
    fontSize: 12,
  }
});
