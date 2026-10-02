import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleEmail = () => {
    Linking.openURL('mailto:lorendoelshazly2000@yahoo.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+4407886861325');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Get in Touch</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Whether you have a question about a repair, need help with the marketplace, or want to file a complaint, we are here to help.
        </Text>
      </View>

      <View style={[styles.methodsGroup, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Pressable
          style={({pressed}) => [
            styles.methodRow,
            { borderBottomColor: colors.border, borderBottomWidth: 1, backgroundColor: pressed ? colors.muted + '80' : 'transparent' }
          ]}
          onPress={handleEmail}
        >
          <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
            <Feather name="mail" size={20} color={colors.secondaryForeground} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={[styles.methodLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[styles.methodValue, { color: colors.foreground }]}>lorendoelshazly2000@yahoo.com</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          style={({pressed}) => [
            styles.methodRow,
            { backgroundColor: pressed ? colors.muted + '80' : 'transparent' }
          ]}
          onPress={handlePhone}
        >
          <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
            <Feather name="phone" size={20} color={colors.secondaryForeground} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={[styles.methodLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <Text style={[styles.methodValue, { color: colors.foreground }]}>+44 7886 861325</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={[styles.complaintBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.complaintHeader}>
          <Feather name="file-text" size={20} color={colors.foreground} />
          <Text style={[styles.complaintTitle, { color: colors.foreground }]}>Complaints & Escalation</Text>
        </View>
        <Text style={[styles.complaintText, { color: colors.mutedForeground }]}>
          If you have a dispute with a local engineer or a privacy concern regarding how your data is handled under UK law, please reach out via email. Include your job reference number (if applicable) and a detailed description of the issue so we can investigate properly.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  methodsGroup: {
    borderWidth: 1,
    marginBottom: 32,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  methodValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  complaintBox: {
    padding: 20,
    borderWidth: 1,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  complaintTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  complaintText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
