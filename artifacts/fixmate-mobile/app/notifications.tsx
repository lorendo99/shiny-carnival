import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

const PREFS_KEY = '@fixmate_notification_prefs';

type Prefs = {
  jobAccepted: boolean;
  quotes: boolean;
  messages: boolean;
  updates: boolean;
};

const DEFAULT_PREFS: Prefs = {
  jobAccepted: true,
  quotes: true,
  messages: true,
  updates: true,
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((data) => {
      if (data) {
        try {
          setPrefs(JSON.parse(data));
        } catch (e) {}
      }
    });
  }, []);

  const togglePref = async (key: keyof Prefs) => {
    const nextPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(nextPrefs);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(nextPrefs));
  };

  const openWebCenter = async () => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) {
      await WebBrowser.openBrowserAsync(`https://${domain}/notifications`);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
    >
      <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={20} color={colors.secondaryForeground} style={{ marginTop: 2 }} />
        <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
          Native background delivery is not active until account sync and push registration are added. These settings control your local preferences for when push notifications are fully supported.
        </Text>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: colors.foreground }]}>Job Accepted</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>When an engineer accepts your repair job.</Text>
          </View>
          <Switch
            value={prefs.jobAccepted}
            onValueChange={() => togglePref('jobAccepted')}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: colors.foreground }]}>New Quotes</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>When a price is provided for your job.</Text>
          </View>
          <Switch
            value={prefs.quotes}
            onValueChange={() => togglePref('quotes')}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: colors.foreground }]}>Private Messages</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>Chat messages from your engineer.</Text>
          </View>
          <Switch
            value={prefs.messages}
            onValueChange={() => togglePref('messages')}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.title, { color: colors.foreground }]}>Extra Info & Payments</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>Payment updates and requests for more details.</Text>
          </View>
          <Switch
            value={prefs.updates}
            onValueChange={() => togglePref('updates')}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        </View>
      </View>

      <Pressable
        style={({pressed}) => [
          styles.webButton,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={openWebCenter}
      >
        <View style={styles.webButtonContent}>
          <Feather name="globe" size={20} color={colors.foreground} />
          <Text style={[styles.webButtonText, { color: colors.foreground }]}>Web Notification Center</Text>
        </View>
        <Feather name="external-link" size={20} color={colors.mutedForeground} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  group: {
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  webButton: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  webButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
