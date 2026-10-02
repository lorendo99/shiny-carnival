import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
    >
      <Text style={[styles.header, { color: colors.foreground }]}>How can we help?</Text>

      <View style={[styles.faqGroup, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.faqItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <Text style={[styles.faqQuestion, { color: colors.foreground }]}>How do I get a repair quote?</Text>
          <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>
            Use the camera on the home tab to capture your broken item. We will generate a diagnosis and you can post it to the marketplace for local engineers to review.
          </Text>
        </View>
        <View style={[styles.faqItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <Text style={[styles.faqQuestion, { color: colors.foreground }]}>Is my personal info shared?</Text>
          <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>
            Engineers can see your open job&apos;s postcode, repair details, and photos. After selection, only the winning engineer keeps access to the private thread and evidence. Contact details are shared only if you choose to send them.
          </Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={[styles.faqQuestion, { color: colors.foreground }]}>How does FixMate Plus work?</Text>
          <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>
            Plus gives you evidence-aware diagnosis, private follow-up help, and saved repair history. It is managed securely through your device&apos;s subscription system.
          </Text>
        </View>
      </View>

      <View style={[styles.aiBox, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.aiHeader}>
          <Feather name="cpu" size={24} color={colors.secondaryForeground} />
          <Text style={[styles.aiTitle, { color: colors.secondaryForeground }]}>AI Help Center</Text>
        </View>
        <Text style={[styles.aiText, { color: colors.secondaryForeground }]}>
          For account, subscription, or repair-support questions, contact FixMate from inside the app.
        </Text>
        <Pressable
          style={({pressed}) => [
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
          ]}
          onPress={() => router.push('/contact')}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Contact Support</Text>
        </Pressable>
      </View>

      <Pressable
        style={({pressed}) => [
          styles.contactLink,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={() => router.push('/contact')}
      >
        <View style={styles.contactLinkContent}>
          <Feather name="message-square" size={20} color={colors.foreground} />
          <Text style={[styles.contactLinkText, { color: colors.foreground }]}>Still need help? Contact Us</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
  },
  faqGroup: {
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  aiBox: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  aiTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  aiText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.9,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  contactLink: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  contactLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLinkText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
