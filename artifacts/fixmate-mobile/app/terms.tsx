import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';

const sections = [
  ['Accepting these terms', 'These Terms & Conditions govern your use of FixMate, including diagnosis, saved history, and the local repair marketplace. By using FixMate, you agree to these terms. FixMate is for adults aged 18 and over in the United Kingdom.'],
  ['Repair guidance and safety', 'FixMate provides informational AI guidance, not a guarantee, inspection, certification, or substitute for a qualified professional. Do not use it to decide whether to work on gas, mains electricity, boilers, fire hazards, exposed wiring, pressurised systems, flooding, fumes, or other dangerous situations. Stop work and seek qualified help whenever safety is uncertain.'],
  ['Your account and content', 'Keep your account secure and provide accurate information. You retain ownership of your photos, videos, descriptions, and other content, while giving FixMate the limited permission needed to store, process, and share it to provide diagnosis, support, and marketplace services. Do not upload unnecessary sensitive personal data or content you do not have permission to use.'],
  ['Local repair marketplace', 'Engineers are independent service providers, not FixMate employees. FixMate helps prepare jobs, compare quotes, and communicate, but does not guarantee an engineer, identity, qualification, workmanship, price, insurance, or outcome. Open jobs and competing quote details may be visible to eligible engineers; private applicant messages and evidence remain private per applicant. The displayed potential 15% saving is an estimate only and is never automatically deducted from a quote or payment.'],
  ['Payments and FixMate Plus', 'Marketplace payments are processed by Stripe for real-world repair services. FixMate Plus is a digital subscription purchased through Apple’s in-app purchase system. Your Apple ID account is charged when you confirm the purchase. Prices, renewal, cancellation, and refunds are controlled by the relevant store. Subscriptions renew automatically unless cancelled through your store account at least 24 hours before the current period ends. You can manage or cancel it in Apple subscription settings, and Restore Purchases is available in the app. Apple’s Standard Licensed Application End User License Agreement also applies.'],
  ['Acceptable use and deletion', 'Do not misuse FixMate, submit unlawful or malicious content, impersonate another person, harass users, manipulate quotes, or create safety risks. You can delete your account from Profile. Diagnoses, customer jobs, messages, and removable evidence are deleted where possible; records needed for legal, payment, fraud, tax, or dispute obligations may be retained in de-identified form.'],
  ['General terms', 'FixMate may not always be available or error-free. Nothing in these terms limits rights that cannot legally be excluded. We may update these terms when the service or law changes. These terms are governed by the laws of England and Wales, except where mandatory consumer protections require otherwise.'],
];

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms & Conditions</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Clear terms for using FixMate.</Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>Effective date: 11 September 2026</Text>
      </View>
      {sections.map(([title, text]) => (
        <View key={title} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={19} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          </View>
          <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>{text}</Text>
        </View>
      ))}
      <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
        Questions or complaints? <Link href="/contact" style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Contact FixMate</Link>. See also our <Link href="/privacy" style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Privacy Policy</Link>.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  date: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8 },
  section: { padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  sectionText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginTop: 4 },
});