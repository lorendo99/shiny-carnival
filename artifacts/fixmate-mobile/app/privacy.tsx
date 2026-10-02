import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Data, Clearly Explained</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          We operate as an AI-driven repair assistant and local marketplace. Here is a summary of how we handle your information.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="lock" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Identity & Authentication</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
          We use Clerk to securely manage your account. We collect your email and name, but never store passwords on our servers.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="database" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Diagnosis & Evidence</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
          Your item descriptions and photos are processed by OpenAI to generate repair guidance. Media is stored securely and moved to long-term storage only when you post a job.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="server" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Marketplace Visibility</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
          Verified local engineers can view open jobs, postcodes, and photos. After selection, only the winning engineer keeps access to the private thread and evidence. Contact details are shared only if you choose to send them.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="credit-card" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Processors</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
          Stripe is used only for payments to engineers for real-world repair services. FixMate Plus is purchased through Apple In-App Purchase and managed with RevenueCat. We also use Clerk for authentication and OpenAI for diagnostics. Full card data is never stored by FixMate.
        </Text>
      </View>

      <View style={[styles.alertSection, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="alert-triangle" size={20} color={colors.destructive} />
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Important Warnings</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.destructive, opacity: 0.9 }]}>
          • Do not upload sensitive personal data (private mail, ID docs, people in backgrounds).{'\n\n'}
          • FixMate is designed strictly for adults. We do not process data of individuals under 18.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.sectionHeader}>
          <Feather name="shield" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>UK Rights & Control</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
          Under UK law, you have the right to access, correct, restrict, or delete your data. Signed-in users can permanently delete their account from Profile. Marketplace payment records that must be retained for legal or financial obligations are de-identified where possible. To exercise other rights or lodge a complaint, please use our{' '}
          <Link href="/contact" style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Contact Us</Link> channel.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  section: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertSection: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
});
