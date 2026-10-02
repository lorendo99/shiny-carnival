import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useRegisterEngineer } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const register = useRegisterEngineer();

  const handleRegister = () => {
    setErrorMsg('');
    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    if (!displayName || !postcode || skills.length === 0) {
      setErrorMsg('Please fill out all fields and provide at least one skill.');
      return;
    }
    register.mutate(
      { data: { displayName, postcode, skills } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/marketplace/engineers/me'] });
          router.back();
        },
        onError: (err: any) => {
          setErrorMsg('Failed to activate profile.');
        }
      }
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      bottomOffset={20}
    >
      <View style={{ marginBottom: 32, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
         <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.foreground }}>Worker profile</Text>
      </View>

      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.mutedForeground, marginBottom: 32, lineHeight: 24 }}>
          FixMate connects you with customers in your area. Your profile will show identity, business, insurance, qualification, review, and completed-job evidence separately as each becomes available. FixMate does not claim that every worker is fully vetted.
      </Text>

      {errorMsg ? (
        <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', marginBottom: 16 }}>
          {errorMsg}
        </Text>
      ) : null}

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Display Name</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. John D."
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Postcode (UK)</Text>
      <TextInput
        value={postcode}
        onChangeText={setPostcode}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. SW1A 1AA"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Skills (comma-separated)</Text>
      <TextInput
        value={skillsStr}
        onChangeText={setSkillsStr}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. Plumbing, Washing Machines"
        placeholderTextColor={colors.mutedForeground}
      />

      <Pressable
        onPress={handleRegister}
        disabled={register.isPending || !displayName || !postcode || !skillsStr}
        style={({ pressed }) => [{ backgroundColor: (register.isPending || !displayName || !postcode || !skillsStr) ? colors.muted : colors.foreground, padding: 18, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1, marginTop: 32 }]}
      >
        {register.isPending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (register.isPending || !displayName || !postcode || !skillsStr) ? colors.mutedForeground : colors.background }}>Create worker profile</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular'
  }
});
