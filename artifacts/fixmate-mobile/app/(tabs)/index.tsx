import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { saveDiagnosis, Diagnosis } from '@/lib/storage';
import { useCreateDiagnosis, useExtractApplianceLabel, useRequestUploadUrl, type ApplianceDetails, type CoverageAnswers as ApiCoverageAnswers } from '@workspace/api-client-react';

const APPLIANCES = [
  { id: 'washing_machine', label: 'Washing Machine', icon: 'droplet' as const },
  { id: 'dishwasher', label: 'Dishwasher', icon: 'disc' as const },
  { id: 'oven', label: 'Oven / Stove', icon: 'thermometer' as const },
  { id: 'fridge', label: 'Fridge', icon: 'wind' as const },
  { id: 'dryer', label: 'Tumble Dryer', icon: 'sun' as const },
  { id: 'other', label: 'Other', icon: 'tool' as const },
];

function HeaderSprig({ color }: { color: string }) {
  return (
    <Svg width={80} height={138} viewBox="0 0 70 150" fill="none">
      <Path d="M35 148 C35 108 33 60 38 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      {[20, 38, 56, 74, 92, 110].map((y, i) => (
        <React.Fragment key={y}>
          <Path d={`M36 ${y} C ${22 - i} ${y - 6}, ${16 - i} ${y - 18}, ${24 - i} ${y - 24} C34 ${y - 16}, 37 ${y - 8}, 36 ${y}`} fill={color} opacity={0.85} />
          <Path d={`M36 ${y + 8} C ${50 + i} ${y + 2}, ${56 + i} ${y - 10}, ${48 + i} ${y - 16} C38 ${y - 8}, 35 ${y}, 36 ${y + 8}`} fill={color} opacity={0.6} />
        </React.Fragment>
      ))}
      <Circle cx={38} cy={8} r={4.5} fill={color} />
    </Svg>
  );
}

type SafetyAnswer = '' | 'yes' | 'no' | 'unsure';
type SafetyQuestionKey = 'hazard' | 'injury' | 'connected';
type SafetyAnswers = Record<SafetyQuestionKey, SafetyAnswer>;
type CoverageAnswer = '' | 'yes' | 'no' | 'unsure';
type CoverageQuestionKey = 'manufacturerWarranty' | 'appliancePlan' | 'homeInsurance' | 'recentlyRepaired';
type CoverageAnswers = Record<CoverageQuestionKey, CoverageAnswer>;

const SAFETY_QUESTIONS: Array<{ key: SafetyQuestionKey; question: string }> = [
  { key: 'hazard', question: 'Smoke, burning smell, sparks, gas smell, flooding, or exposed wiring?' },
  { key: 'injury', question: 'Is anyone injured or in immediate danger?' },
  { key: 'connected', question: 'Is the appliance still connected to power or water?' },
];

const COVERAGE_QUESTIONS: Array<{ key: CoverageQuestionKey; question: string }> = [
  { key: 'manufacturerWarranty', question: 'Is it still under the manufacturer warranty?' },
  { key: 'appliancePlan', question: 'Is it covered by an appliance plan?' },
  { key: 'homeInsurance', question: 'Is it covered by home insurance?' },
  { key: 'recentlyRepaired', question: 'Was it recently repaired?' },
];

const APPLIANCE_DETAIL_FIELDS: Array<{
  key: keyof ApplianceDetails;
  label: string;
  placeholder: string;
}> = [
  { key: 'brand', label: 'Brand', placeholder: 'e.g. Bosch' },
  { key: 'modelNumber', label: 'Model number', placeholder: 'e.g. WGG24409GB' },
  { key: 'serialNumber', label: 'Serial number', placeholder: 'e.g. 123456789' },
  { key: 'productType', label: 'Product type', placeholder: 'e.g. 9kg washing machine' },
  { key: 'approximateAge', label: 'Approximate age', placeholder: 'e.g. about 6 years' },
];

export default function HomeTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedAppliance, setSelectedAppliance] = useState<string>('');
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [simpleLanguage, setSimpleLanguage] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [safetyAnswers, setSafetyAnswers] = useState<SafetyAnswers>({
    hazard: '',
    injury: '',
    connected: '',
  });
  const [safetyCleared, setSafetyCleared] = useState(false);
  const [coverageAnswers, setCoverageAnswers] = useState<CoverageAnswers>({
    manufacturerWarranty: '',
    appliancePlan: '',
    homeInsurance: '',
    recentlyRepaired: '',
  });
  const [applianceDetails, setApplianceDetails] = useState<ApplianceDetails>({});
  const [labelScanError, setLabelScanError] = useState('');
  const [isLabelScanning, setIsLabelScanning] = useState(false);
  const [labelImageUri, setLabelImageUri] = useState<string | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [mediaMime, setMediaMime] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isRecordingSound, setIsRecordingSound] = useState(false);
  const recordingStartedRef = useRef(false);
  const { isSignedIn } = useAuth();
  const createDiagnosis = useCreateDiagnosis();
  const extractApplianceLabel = useExtractApplianceLabel();
  const requestUploadUrl = useRequestUploadUrl();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder, 250);

  useEffect(() => {
    AsyncStorage.getItem('@fixmate_pending_inventory_item').then((value) => {
      if (value) setInventoryItemId(value);
    });
    AsyncStorage.getItem('@fixmate_simple_language').then((value) => setSimpleLanguage(value === 'true'));
  }, []);

  useEffect(() => {
    if (!recordingStartedRef.current || audioRecorderState.isRecording || !audioRecorderState.url) return;
    recordingStartedRef.current = false;
    setIsRecordingSound(false);
    setMediaUri(audioRecorderState.url);
    setMediaType('audio');
    setMediaName(`sound-${Date.now()}.m4a`);
    setMediaMime('audio/mp4');
  }, [audioRecorderState.isRecording, audioRecorderState.url, isRecordingSound]);

  const safetyComplete = Object.values(safetyAnswers).every(Boolean);
  const immediateDanger =
    safetyAnswers.hazard === 'yes' ||
    safetyAnswers.hazard === 'unsure' ||
    safetyAnswers.injury === 'yes' ||
    safetyAnswers.injury === 'unsure';
  const needsShutdown = safetyAnswers.connected === 'yes' || safetyAnswers.connected === 'unsure';
  const requiresSafetyConfirmation = immediateDanger || needsShutdown;
  const safetyReady = safetyComplete && (!requiresSafetyConfirmation || safetyCleared);
  const coverageComplete = Object.values(coverageAnswers).every(Boolean);
  const hasApplianceDetails = Object.values(applianceDetails).some((value) => Boolean(value));

  const answerSafetyQuestion = (key: SafetyQuestionKey, answer: Exclude<SafetyAnswer, ''>) => {
    setSafetyAnswers((current) => ({ ...current, [key]: answer }));
    setSafetyCleared(false);
  };

  const updateApplianceDetail = (key: keyof ApplianceDetails, value: string) => {
    setApplianceDetails((current) => ({ ...current, [key]: value.trim() ? value : null }));
  };

  const answerCoverageQuestion = (key: CoverageQuestionKey, answer: Exclude<CoverageAnswer, ''>) => {
    setCoverageAnswers((current) => ({ ...current, [key]: answer }));
  };

  const handlePickMedia = async (source: 'camera' | 'library') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setErrorMsg('');

    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status } = permission;
    if (status !== 'granted') {
      setErrorMsg(`Permission needed to access your ${source === 'camera' ? 'camera' : 'photo library'}.`);
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: source === 'library',
      quality: 0.8,
      videoMaxDuration: 30,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'photo');
      setMediaName(asset.fileName || asset.uri.split('/').pop() || `evidence.${asset.type === 'video' ? 'mp4' : 'jpg'}`);
      setMediaMime(asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'));
    }
  };

  const handleRecordSound = async () => {
    setErrorMsg('');
    try {
      if (isRecordingSound) {
        await audioRecorder.stop();
        return;
      }
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Microphone permission is needed to record a sound clip.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record({ forDuration: 15 });
      recordingStartedRef.current = true;
      setIsRecordingSound(true);
    } catch {
      setIsRecordingSound(false);
      setErrorMsg('The sound recording could not start. Check microphone permission and try again.');
    }
  };

  const handlePickLabel = async (source: 'camera' | 'library') => {
    if (!isSignedIn) {
      router.push('/(auth)/sign-in');
      return;
    }
    if (!safetyReady) {
      setLabelScanError('Complete the safety check before scanning a label.');
      return;
    }

    setLabelScanError('');
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setLabelScanError(`Permission needed to access your ${source === 'camera' ? 'camera' : 'photo library'}.`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
        });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setLabelImageUri(asset.uri);
    setIsLabelScanning(true);
    try {
      const localResponse = await fetch(asset.uri);
      if (!localResponse.ok) throw new Error('The label photo could not be read.');
      const blob = await localResponse.blob();
      const contentType = asset.mimeType || blob.type || 'image/jpeg';
      if (!contentType.startsWith('image/')) throw new Error('Please choose a photo of the appliance label.');
      if (!blob.size || blob.size > 15 * 1024 * 1024) throw new Error('Label photos must be 15 MB or smaller.');
      const name = asset.fileName || `appliance-label.${contentType.split('/')[1] || 'jpg'}`;
      const signed = await requestUploadUrl.mutateAsync({
        data: { name, size: blob.size, contentType },
      });
      const uploaded = await fetch(signed.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!uploaded.ok) throw new Error(`Label photo upload failed (${uploaded.status}).`);

      const extracted = await extractApplianceLabel.mutateAsync({
        data: {
          media: {
            objectPath: signed.objectPath,
            uploadToken: signed.uploadToken,
            name,
            contentType,
            size: blob.size,
          },
        },
      });
      setApplianceDetails(extracted.details);
    } catch (error) {
      setLabelScanError(error instanceof Error ? error.message : 'FixMate could not read that label. Try a sharper, well-lit photo.');
    } finally {
      setIsLabelScanning(false);
    }
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    if (!selectedAppliance) {
      setErrorMsg('Please select an appliance type.');
      return;
    }
    if (!symptom.trim()) {
      setErrorMsg('Please describe the symptom.');
      return;
    }
    if (!safetyComplete) {
      setErrorMsg('Please answer all three safety questions before continuing.');
      return;
    }
    if (!safetyReady) {
      setErrorMsg('Please follow the safety steps before continuing.');
      return;
    }
    if (!coverageComplete) {
      setErrorMsg('Please answer all four coverage questions before continuing.');
      return;
    }
    if (!isSignedIn) {
      router.push('/(auth)/sign-in');
      return;
    }

    setIsAnalyzing(true);

    try {
      let media: { objectPath: string; uploadToken: string; name: string; contentType: string; size: number } | null = null;
      if (mediaUri) {
        const localResponse = await fetch(mediaUri);
        if (!localResponse.ok) throw new Error('The selected evidence could not be read.');
        const blob = await localResponse.blob();
        const name = mediaName || 'evidence';
         const contentType = mediaMime || blob.type || (mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/mp4' : 'image/jpeg');
         const maxSize = contentType.startsWith('audio/') ? 15 * 1024 * 1024 : 60 * 1024 * 1024;
         if (!blob.size || blob.size > maxSize) throw new Error(contentType.startsWith('audio/') ? 'Sound clips must be 15 MB or smaller and no longer than 15 seconds.' : 'Evidence must be between 1 byte and 60 MB.');
         if (!contentType.startsWith('image/') && !contentType.startsWith('video/') && !contentType.startsWith('audio/')) throw new Error('Please choose an image, video, or sound file.');
        const signed = await requestUploadUrl.mutateAsync({ data: { name, size: blob.size, contentType } });
        const uploaded = await fetch(signed.uploadURL, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
        if (!uploaded.ok) throw new Error(`Evidence upload failed (${uploaded.status}).`);
        media = { objectPath: signed.objectPath, uploadToken: signed.uploadToken, name, contentType, size: blob.size };
      }
      const result = await createDiagnosis.mutateAsync({
        data: {
          itemType: selectedAppliance,
          symptom: symptom.trim(),
          media,
          mediaName: media?.name ?? null,
          applianceDetails: hasApplianceDetails ? applianceDetails : undefined,
           errorCode: errorCode.trim() || null,
           coverageAnswers: coverageAnswers as ApiCoverageAnswers,
            inventoryItemId,
        },
      });
      const diagnosis: Diagnosis = {
        ...result,
        appliance: result.itemType,
        symptom: symptom.trim(),
        mediaUri,
        mediaType,
        createdAt: result.generatedAt,
      };
      await saveDiagnosis(diagnosis);
      await AsyncStorage.removeItem('@fixmate_pending_inventory_item');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/diagnosis/${result.id}`);

      // Reset form on success
      setSelectedAppliance('');
      setSymptom('');
       setErrorCode('');
      setCoverageAnswers({
        manufacturerWarranty: '',
        appliancePlan: '',
        homeInsurance: '',
        recentlyRepaired: '',
      });
      setApplianceDetails({});
      setLabelScanError('');
      setLabelImageUri(null);
      setSafetyAnswers({ hazard: '', injury: '', connected: '' });
      setSafetyCleared(false);
      setMediaUri(null);
      setMediaType(null);
      setMediaName(null);
      setMediaMime(null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Diagnosis could not be completed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 120, // Extra padding for tab bar
        paddingHorizontal: 20,
      }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerHalo, { backgroundColor: colors.primary }]} />
        <View style={styles.headerSprig}><HeaderSprig color={colors.accent} /></View>
        <View style={styles.headerMark}>
          <View style={[styles.markRing, { borderColor: colors.primary }]}>
            <Feather name="tool" size={17} color={colors.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
            FIXMATE · HOME REPAIR DESK
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Fraunces' }]}>
          {simpleLanguage ? 'What is wrong?' : "What's broken?"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {simpleLanguage ? 'Choose the item and tell us what happened.' : "Select your appliance and tell us what's wrong."}
        </Text>
        {errorMsg ? (
          <Text accessibilityRole="alert" style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', marginTop: 12 }}>
            {errorMsg}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Fraunces' }]}>
        Appliance Type
      </Text>
      <View style={styles.grid}>
        {APPLIANCES.map((appliance) => {
          const isSelected = selectedAppliance === appliance.id;
          return (
            <Pressable
              key={appliance.id}
              testID={`appliance-${appliance.id}`}
              style={[
                styles.applianceCard,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                }
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setSelectedAppliance(appliance.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${appliance.label}${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Feather
                name={appliance.icon}
                size={24}
                color={isSelected ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.applianceLabel,
                  {
                    color: isSelected ? colors.primaryForeground : colors.foreground,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium'
                  }
                ]}
                numberOfLines={1}
              >
                {appliance.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.coverageSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.safetyHeading}>
          <Feather name="file-text" size={20} color={colors.primary} />
          <View style={styles.safetyHeadingCopy}>
            <Text style={[styles.safetyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Check cover before paying for repair
            </Text>
            <Text style={[styles.safetySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              We’ll point you to warranty, plan, insurance, or recent-repair support first.
            </Text>
          </View>
        </View>
        <View style={styles.safetyQuestions}>
          {COVERAGE_QUESTIONS.map(({ key, question }) => (
            <View key={key} style={styles.safetyQuestion}>
              <Text style={[styles.safetyQuestionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{question}</Text>
              <View style={styles.safetyOptions}>
                {(['yes', 'no', 'unsure'] as const).map((answer) => {
                  const selected = coverageAnswers[key] === answer;
                  return (
                    <Pressable
                      key={answer}
                      testID={`coverage-${key}-${answer}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${question}: ${answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}`}
                      accessibilityState={{ selected }}
                      style={[styles.safetyOption, { backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border }]}
                      onPress={() => answerCoverageQuestion(key, answer)}
                    >
                      <Text style={[styles.safetyOptionText, { color: selected ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                        {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        {!coverageComplete ? (
          <Text style={[styles.coverageRequired, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Answer each question before requesting a diagnosis.
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.safetyTriage,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.safetyHeading}>
          <Feather name="shield" size={20} color={colors.primary} />
          <View style={styles.safetyHeadingCopy}>
            <Text style={[styles.safetyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Quick safety check
            </Text>
            <Text style={[styles.safetySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Answer these before requesting a diagnosis. Evidence will not upload until this check is complete.
            </Text>
          </View>
        </View>

        <View style={styles.safetyQuestions}>
          {SAFETY_QUESTIONS.map(({ key, question }) => (
            <View key={key} style={styles.safetyQuestion}>
              <Text style={[styles.safetyQuestionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                {question}
              </Text>
              <View style={styles.safetyOptions}>
                {(['yes', 'no', 'unsure'] as const).map((answer) => {
                  const selected = safetyAnswers[key] === answer;
                  return (
                    <Pressable
                      key={answer}
                      testID={`safety-${key}-${answer}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${question}: ${answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}`}
                      accessibilityState={{ selected }}
                      style={[
                        styles.safetyOption,
                        {
                          backgroundColor: selected ? colors.primary : colors.background,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => answerSafetyQuestion(key, answer)}
                    >
                      <Text
                        style={[
                          styles.safetyOptionText,
                          {
                            color: selected ? colors.primaryForeground : colors.mutedForeground,
                            fontFamily: 'Inter_600SemiBold',
                          },
                        ]}
                      >
                        {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {requiresSafetyConfirmation ? (
          <View
            style={[
              styles.safetyAlert,
              {
                backgroundColor: immediateDanger ? colors.card : colors.secondary,
                borderColor: immediateDanger ? colors.destructive : colors.border,
              },
            ]}
          >
            <Feather name="alert-triangle" size={19} color={immediateDanger ? colors.destructive : colors.foreground} />
            <View style={styles.safetyAlertCopy}>
              <Text style={[styles.safetyAlertTitle, { color: immediateDanger ? colors.destructive : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {immediateDanger ? 'Stop and make the area safe first' : 'Switch it off before checking anything'}
              </Text>
              {immediateDanger ? (
                <>
                  <Text style={[styles.safetyAlertText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                    Move away from smoke, gas, sparks, flooding, or exposed wiring. Do not touch switches or the appliance if doing so could be dangerous.
                  </Text>
                  <Text style={[styles.safetyAlertText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                    Call 999 for an immediate fire, gas, or injury emergency, and contact a qualified professional.
                  </Text>
                </>
              ) : null}
              {needsShutdown ? (
                <Text style={[styles.safetyAlertText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  Switch off and unplug the appliance, or turn off its water supply, before inspecting it.
                </Text>
              ) : null}
              {!safetyCleared ? (
                <Pressable
                  testID="safety-confirm"
                  style={({ pressed }) => [styles.safetyConfirm, { backgroundColor: colors.foreground, opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => setSafetyCleared(true)}
                >
                  <Text style={[styles.safetyConfirmText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>
                    I am safe and have followed these steps
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.safetyConfirmed}>
                  <Feather name="check" size={15} color={colors.destructive} />
                  <Text style={[styles.safetyConfirmedText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>
                    Safety steps acknowledged. Continue only if the danger is no longer present.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : safetyComplete ? (
          <View style={styles.safetyReady}>
            <Feather name="check" size={15} color={colors.accentForeground} />
            <Text style={[styles.safetyReadyText, { color: colors.accentForeground, fontFamily: 'Inter_500Medium' }]}>
              Safety check complete. You can continue.
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.labelSection,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.labelHeading}>
          <View style={styles.labelHeadingCopy}>
            <Text style={[styles.labelEyebrow, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              OPTIONAL BUT USEFUL
            </Text>
            <Text style={[styles.labelTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Appliance label
            </Text>
            <Text style={[styles.labelSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Photograph the rating label and FixMate will read the details for you. Check every value before using it.
            </Text>
          </View>
          <Feather name="maximize" size={20} color={colors.primary} />
        </View>
        <View style={styles.labelActions}>
          <Pressable
            testID="button-scan-label-camera"
            style={({ pressed }) => [styles.labelButton, { backgroundColor: colors.primary, opacity: pressed || isLabelScanning ? 0.7 : 1 }]}
            onPress={() => handlePickLabel('camera')}
            disabled={isLabelScanning}
          >
            {isLabelScanning ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="camera" size={16} color={colors.primaryForeground} />}
            <Text style={[styles.labelButtonText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
              {isLabelScanning ? 'Reading label…' : 'Photograph label'}
            </Text>
          </Pressable>
          <Pressable
            testID="button-scan-label-library"
            style={({ pressed }) => [styles.labelLibraryButton, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed || isLabelScanning ? 0.7 : 1 }]}
            onPress={() => handlePickLabel('library')}
            disabled={isLabelScanning}
          >
            <Feather name="image" size={16} color={colors.foreground} />
            <Text style={[styles.labelLibraryButtonText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Choose photo
            </Text>
          </Pressable>
        </View>
        {labelScanError ? (
          <Text style={[styles.labelError, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>
            {labelScanError}
          </Text>
        ) : null}
        {labelImageUri ? (
          <Image source={{ uri: labelImageUri }} style={styles.labelPreview} resizeMode="cover" />
        ) : null}
        {hasApplianceDetails ? (
          <View style={[styles.labelFields, { borderTopColor: colors.border }]}>
            <View style={styles.labelReviewNote}>
              <Feather name="check" size={14} color={colors.accentForeground} />
              <Text style={[styles.labelReviewText, { color: colors.accentForeground, fontFamily: 'Inter_500Medium' }]}>
                Review and edit the extracted details before continuing.
              </Text>
            </View>
            {APPLIANCE_DETAIL_FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} style={styles.labelField}>
                <Text style={[styles.labelFieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                  {label}
                </Text>
                <View style={[styles.labelInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    value={applianceDetails[key] ?? ''}
                    onChangeText={(value) => updateApplianceDetail(key, value)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    maxLength={key === 'serialNumber' ? 160 : key === 'approximateAge' ? 80 : 120}
                    style={[styles.labelInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                  />
                  {applianceDetails[key] ? (
                    <Pressable
                      testID={`button-delete-label-${key}`}
                      accessibilityLabel={`Delete ${label}`}
                      onPress={() => updateApplianceDetail(key, '')}
                      style={styles.labelClear}
                    >
                      <Feather name="x" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 32 }]}>
        Evidence (Optional)
      </Text>
      <View style={[
        styles.mediaUpload,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        }
      ]}>
         {mediaUri ? (
          mediaType === 'photo' ? (
            <Image source={{ uri: mediaUri }} style={[styles.mediaPreview, { borderRadius: colors.radius - 4 }]} />
           ) : (
            <View style={styles.mediaEmpty}>
              <Feather name={mediaType === 'audio' ? 'volume-2' : 'video'} size={30} color={colors.primary} />
              <Text style={[styles.mediaText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{mediaType === 'audio' ? 'Sound clip attached' : 'Video attached'}</Text>
              <Text style={[styles.mediaSubtext, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{mediaType === 'audio' ? 'Supporting evidence · up to 15 seconds' : 'Up to 30 seconds'}</Text>
            </View>
          )
        ) : (
          <View style={styles.mediaEmpty}>
            <View style={[styles.mediaIconWrapper, { backgroundColor: colors.secondary }]}>
              <Feather name="camera" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.mediaText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
              Add a photo or video
            </Text>
            <Text style={[styles.mediaSubtext, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Help us see the issue clearly
            </Text>
          </View>
        )}
        <View style={styles.mediaActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Take a photo" testID="open-camera" style={({ pressed }) => [styles.mediaAction, { backgroundColor: colors.foreground, opacity: pressed ? 0.72 : 1 }]} onPress={() => handlePickMedia('camera')}>
            <Feather name="camera" size={18} color={colors.background} />
            <Text style={[styles.mediaActionText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>Camera</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo or video from your library" testID="open-library" style={({ pressed }) => [styles.mediaAction, { backgroundColor: colors.secondary, opacity: pressed ? 0.72 : 1 }]} onPress={() => handlePickMedia('library')}>
            <Feather name="image" size={18} color={colors.secondaryForeground} />
            <Text style={[styles.mediaActionText, { color: colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Library</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={isRecordingSound ? 'Stop recording supporting sound' : 'Record supporting sound'} testID="record-sound" style={({ pressed }) => [styles.mediaAction, { backgroundColor: isRecordingSound ? colors.destructive : colors.secondary, opacity: pressed ? 0.72 : 1 }]} onPress={handleRecordSound}>
            <Feather name={isRecordingSound ? 'square' : 'volume-2'} size={18} color={isRecordingSound ? colors.background : colors.secondaryForeground} />
            <Text style={[styles.mediaActionText, { color: isRecordingSound ? colors.background : colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' }]}>{isRecordingSound ? 'Stop' : 'Record sound'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 32 }]}>
              {simpleLanguage ? 'Tell us what happened' : 'Describe the issue'}
      </Text>
      <TextInput
        testID="symptom-input"
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            borderRadius: colors.radius,
            fontFamily: 'Inter_400Regular'
          }
        ]}
        placeholder="e.g., The drum isn't spinning and there's a loud grinding noise..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={symptom}
        onChangeText={setSymptom}
        accessibilityLabel="Describe the problem"
        accessibilityHint="You can use your device keyboard microphone to dictate."
        allowFontScaling
      />
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 24 }]}>Error code (optional)</Text>
      <TextInput
        testID="error-code-input"
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius, fontFamily: 'Inter_400Regular' }]}
        placeholder="e.g. E15, F21, 4C"
        placeholderTextColor={colors.mutedForeground}
        value={errorCode}
        onChangeText={setErrorCode}
        maxLength={80}
        accessibilityLabel="Error code, optional"
        allowFontScaling
      />
      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: -10 }}>
        Enter a code or photograph the display. FixMate will explain safe checks and when to call a professional.
      </Text>

      <Pressable
        testID="submit-btn"
        style={[
          styles.submitBtn,
          {
            backgroundColor: (isAnalyzing || !selectedAppliance || !symptom.trim()) ? colors.muted : colors.foreground,
            borderRadius: colors.radius,
            marginTop: 32
          }
        ]}
        disabled={isAnalyzing || !selectedAppliance || !symptom.trim()}
        onPress={handleAnalyze}
        accessibilityRole="button"
        accessibilityLabel={isAnalyzing ? 'Analyzing issue' : 'Diagnose issue'}
        accessibilityState={{ disabled: isAnalyzing || !selectedAppliance || !symptom.trim() }}
      >
        <Text style={[
          styles.submitBtnText,
          {
            color: (isAnalyzing || !selectedAppliance || !symptom.trim()) ? colors.mutedForeground : colors.background,
            fontFamily: 'Inter_600SemiBold'
          }
        ]}>
          {isAnalyzing ? 'Analyzing...' : 'Diagnose Issue'}
        </Text>
        {!isAnalyzing && (
          <Feather name="arrow-right" size={20} color={colors.background} />
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 28,
    paddingBottom: 22,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerHalo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -76,
    top: -118,
    opacity: 0.19,
  },
  headerSprig: {
    position: 'absolute',
    right: -17,
    top: 17,
    opacity: 0.22,
  },
  headerMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 20,
  },
  markRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.35,
  },
  title: {
    fontSize: 34,
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  safetyTriage: {
    marginTop: 32,
    padding: 18,
    borderWidth: 1,
    gap: 16,
  },
  safetyHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  safetyHeadingCopy: {
    flex: 1,
    gap: 3,
  },
  safetyTitle: {
    fontSize: 16,
  },
  safetySubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  safetyQuestions: {
    gap: 14,
  },
  safetyQuestion: {
    gap: 9,
  },
  safetyQuestionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  safetyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  safetyOption: {
    minWidth: 62,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
  },
  safetyOptionText: {
    fontSize: 13,
  },
  safetyAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  safetyAlertCopy: {
    flex: 1,
    gap: 7,
  },
  safetyAlertTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  safetyAlertText: {
    fontSize: 13,
    lineHeight: 19,
  },
  safetyConfirm: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  safetyConfirmText: {
    fontSize: 12,
  },
  safetyConfirmed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 2,
  },
  safetyConfirmedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  safetyReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  safetyReadyText: {
    fontSize: 13,
  },
  coverageSection: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  coverageRequired: {
    fontSize: 12,
    lineHeight: 17,
  },
  labelSection: {
    marginTop: 32,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  labelHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  labelHeadingCopy: {
    flex: 1,
    gap: 4,
  },
  labelEyebrow: {
    fontSize: 11,
    letterSpacing: 1,
  },
  labelTitle: {
    fontSize: 17,
  },
  labelSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  labelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  labelButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  labelButtonText: {
    fontSize: 12,
  },
  labelLibraryButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  labelLibraryButtonText: {
    fontSize: 12,
  },
  labelError: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelPreview: {
    width: '100%',
    height: 130,
    borderRadius: 10,
  },
  labelFields: {
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  labelReviewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  labelReviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  labelField: {
    gap: 6,
  },
  labelFieldLabel: {
    fontSize: 12,
  },
  labelInputWrap: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14,
  },
  labelClear: {
    padding: 10,
  },
  applianceCard: {
    width: '46%', // approximate 2 cols
    marginHorizontal: '2%',
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applianceLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  mediaUpload: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 4,
    minHeight: 140,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  mediaAction: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
  },
  mediaActionText: {
    fontSize: 14,
  },
  mediaPreview: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  mediaEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  mediaIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaText: {
    fontSize: 16,
  },
  mediaSubtext: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 18,
  }
});
