import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useCreateRepairQuote } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export default function SubmitQuote() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [labor, setLabor] = useState('');
  const [materials, setMaterials] = useState('');
  const [callOutFee, setCallOutFee] = useState('');
  const [duration, setDuration] = useState('');
  const [arrival, setArrival] = useState('');
  const [warranty, setWarranty] = useState('');
  const [availability, setAvailability] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const submitQuote = useCreateRepairQuote();

  const handleSubmit = () => {
    setErrorMsg('');
    const laborPence = Math.round(parseFloat(labor) * 100);
    const materialsPence = Math.round(parseFloat(materials) * 100);
    const callOutFeePence = Math.round(parseFloat(callOutFee || '0') * 100);

    if (isNaN(laborPence) || isNaN(materialsPence) || isNaN(callOutFeePence) || !duration || !arrival || !warranty || !availability || !message) {
      setErrorMsg('Please fill out all fields with valid numbers.');
      return;
    }

    submitQuote.mutate({
      jobId,
      data: {
        laborPence,
        toolsAndMaterialsPence: materialsPence,
         callOutFeePence,
        estimatedDuration: duration,
         estimatedArrival: arrival,
         warranty,
         earliestAvailability: availability,
        message
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/marketplace/jobs/${jobId}/quotes`] });
        router.back();
      },
      onError: (err: any) => {
        setErrorMsg('Failed to submit quote.');
      }
    });
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
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.foreground }}>Send an offer</Text>
      </View>

      {errorMsg ? (
        <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', marginBottom: 16 }}>
          {errorMsg}
        </Text>
      ) : null}
      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
         Keep contact details and payment requests out of your offer. FixMate automatically flags phone numbers and off-platform payment language.
      </Text>

       <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Your labour price (£)</Text>
      <TextInput
        value={labor}
        onChangeText={setLabor}
        keyboardType="decimal-pad"
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. 150.00"
        placeholderTextColor={colors.mutedForeground}
      />

       <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Tools and materials (£)</Text>
      <TextInput
        value={materials}
        onChangeText={setMaterials}
        keyboardType="decimal-pad"
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. 45.50"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Estimated Duration</Text>
      <TextInput
        value={duration}
        onChangeText={setDuration}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. 2 hours"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Call-out Fee (£)</Text>
      <TextInput
        value={callOutFee}
        onChangeText={setCallOutFee}
        keyboardType="decimal-pad"
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. 25.00"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Estimated Arrival</Text>
      <TextInput
        value={arrival}
        onChangeText={setArrival}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. Within 2 hours"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Warranty</Text>
      <TextInput
        value={warranty}
        onChangeText={setWarranty}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. 90 days on labour"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Earliest Availability</Text>
      <TextInput
        value={availability}
        onChangeText={setAvailability}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. Tuesday morning"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Message</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={[styles.input, { minHeight: 100, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="Explain your approach, availability, etc."
        placeholderTextColor={colors.mutedForeground}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={submitQuote.isPending || !labor || !materials || !duration || !arrival || !warranty || !availability || !message}
        style={({ pressed }) => [{ backgroundColor: (submitQuote.isPending || !labor || !materials || !duration || !arrival || !warranty || !availability || !message) ? colors.muted : colors.foreground, padding: 18, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 }]}
      >
        {submitQuote.isPending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (!labor || !materials || !duration || !arrival || !warranty || !availability || !message) ? colors.mutedForeground : colors.background }}>Send offer</Text>
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
