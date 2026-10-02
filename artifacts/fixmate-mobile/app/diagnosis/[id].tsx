import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getDiagnosis, updateDiagnosis, Diagnosis } from '@/lib/storage';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useSubscription } from '@/lib/revenuecat';
import {
  applyDiagnosisChecklist,
  diagnosisChecklistQuestions,
  type ChecklistAnswer,
  type DiagnosisChecklistAnswers,
  useAskDiagnosisAssistant,
} from '@workspace/api-client-react';

export default function DiagnosisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isSubscribed } = useSubscription();
  const assistant = useAskDiagnosisAssistant();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<{ role: 'user' | 'assistant'; content: string; safetyLevel?: string }[]>([]);
  const [assistantError, setAssistantError] = useState('');
  const [checklistAnswers, setChecklistAnswers] = useState<DiagnosisChecklistAnswers>({});

  useEffect(() => {
    let isActive = true;
    if (id) {
      getDiagnosis(id).then(data => {
        if (isActive) {
          setDiagnosis(data);
          setChecklistAnswers(data?.checklistAnswers ?? {});
          setIsLoading(false);
        }
      });
    }
    return () => { isActive = false; };
  }, [id]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!diagnosis) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error', headerTransparent: true }} />
        <Feather name="alert-circle" size={48} color={colors.destructive} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Diagnosis Not Found
        </Text>
        <Pressable
          testID="back-btn"
          style={[styles.backBtn, { backgroundColor: colors.foreground, borderRadius: colors.radius }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.background, fontFamily: 'Inter_600SemiBold' }]}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const isSafetyProfessional = diagnosis.safetyLevel === 'professional';
  const isSafetyCaution = diagnosis.safetyLevel === 'caution';

  const safetyColor = isSafetyProfessional ? colors.destructive : isSafetyCaution ? colors.primary : colors.primary;
  const safetyBg = isSafetyProfessional ? colors.secondary : colors.secondary;
  const interactiveResult = applyDiagnosisChecklist(diagnosis, checklistAnswers);

  const answerChecklist = (key: keyof DiagnosisChecklistAnswers, answer: ChecklistAnswer) => {
    const next = { ...checklistAnswers, [key]: answer };
    setChecklistAnswers(next);
    if (id) {
      updateDiagnosis(String(id), { checklistAnswers: next });
    }
  };
  const askExpert = async () => {
    if (!id || question.trim().length < 2 || turns.length >= 8) return;
    const asked = question.trim();
    setQuestion('');
    setAssistantError('');
    try {
      const answer = await assistant.mutateAsync({ diagnosisId: String(id), data: {
        question: asked,
        history: turns.slice(-8).map(({ role, content }) => ({ role, content })),
      }});
      setTurns(prev => [...prev, { role: 'user' as const, content: asked }, { role: 'assistant' as const, content: answer.answer, safetyLevel: answer.safetyLevel }].slice(-8));
    } catch (error) {
      setQuestion(asked);
      setAssistantError(error instanceof Error ? error.message : 'FixMate Expert is unavailable.');
    }
  };

  const postDiagnosisAsJob = () => {
    const applianceLabel = diagnosis.appliance.replace(/_/g, ' ');
    const applianceDetails = diagnosis.applianceDetails
      ? Object.entries(diagnosis.applianceDetails)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      : '';
    const description = [
      diagnosis.headline,
      `Most likely cause: ${diagnosis.likelyProblem}`,
      diagnosis.symptom ? `Reported issue: ${diagnosis.symptom}` : '',
      applianceDetails ? `Appliance details: ${applianceDetails}` : '',
      `Safety note: ${diagnosis.safetyNote}`,
    ].filter(Boolean).join('\n\n').slice(0, 1200);

    router.push({
      pathname: '/jobs/new',
      params: {
        diagnosisId: String(diagnosis.id),
        title: `${applianceLabel} repair`,
        itemType: applianceLabel,
        description,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: colors.foreground,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 56, // Header height approx
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <View style={styles.headerInfo}>
            <Text style={[styles.label, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              {diagnosis.appliance.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={[styles.confidence, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              {diagnosis.confidence}% Match
            </Text>
          </View>
          <Text style={[styles.headline, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {diagnosis.headline}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <View style={[styles.problemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              MOST LIKELY CAUSE
            </Text>
            <Text style={[styles.problemText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {interactiveResult.likelyProblem}
            </Text>
          </View>
        </Animated.View>

        {diagnosis.applianceDetails && Object.values(diagnosis.applianceDetails).some(Boolean) ? (
          <Animated.View entering={FadeInUp.delay(250).duration(400)}>
            <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                APPLIANCE DETAILS
              </Text>
              <View style={styles.detailsGrid}>
                {([
                  ['Brand', diagnosis.applianceDetails.brand],
                  ['Model number', diagnosis.applianceDetails.modelNumber],
                  ['Serial number', diagnosis.applianceDetails.serialNumber],
                  ['Product type', diagnosis.applianceDetails.productType],
                  ['Approximate age', diagnosis.applianceDetails.approximateAge],
                ] as const).map(([label, value]) => value ? (
                  <View key={label} style={styles.detailValue}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
                    <Text style={[styles.detailText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{value}</Text>
                  </View>
                ) : null)}
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(280).duration(400)}>
          <View style={[styles.causesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              OTHER POSSIBILITIES
            </Text>
            {diagnosis.otherPossibleCauses?.length ? (
              <View style={styles.causeSection}>
                <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Other plausible causes</Text>
                {interactiveResult.otherPossibleCauses?.map((cause, index) => (
                  <View key={`${cause}-${index}`} style={styles.causeRow}>
                    <View style={[styles.causeDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{cause}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {diagnosis.distinguishingEvidence?.length ? (
              <View style={styles.causeSection}>
                <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Evidence that would distinguish them</Text>
                {diagnosis.distinguishingEvidence.map((evidence, index) => (
                  <View key={`${evidence}-${index}`} style={styles.causeRow}>
                    <Feather name="search" size={14} color={colors.primary} />
                    <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{evidence}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {diagnosis.professionalInspection ? (
              <View style={[styles.inspectionSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>When professional inspection is required</Text>
                <Text style={[styles.causeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{diagnosis.professionalInspection}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={[styles.safetyCard, { backgroundColor: safetyBg, borderLeftColor: safetyColor, borderRadius: colors.radius - 4 }]}>
            <Feather
              name={isSafetyProfessional ? "alert-triangle" : isSafetyCaution ? "alert-circle" : "shield"}
              size={20}
              color={safetyColor}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.safetyTitle, { color: safetyColor, fontFamily: 'Inter_700Bold' }]}>
                {isSafetyProfessional ? "PROFESSIONAL REPAIR RECOMMENDED" : isSafetyCaution ? "PROCEED WITH CAUTION" : "SAFE TO INSPECT"}
              </Text>
              <Text style={[styles.safetyText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                {diagnosis.safetyNote}
              </Text>
            </View>
          </View>
        </Animated.View>

        {(diagnosis.mediaEvidence?.length || diagnosis.audioEvidence?.length) ? (
          <Animated.View entering={FadeInUp.delay(320).duration(400)}>
            <View style={[styles.causesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {diagnosis.audioEvidence?.length ? 'SOUND EVIDENCE · SUPPORTING ONLY' : 'MEDIA EVIDENCE'}
              </Text>
              {diagnosis.mediaEvidence?.map((evidence, index) => (
                <View key={`media-${index}`} style={styles.causeRow}>
                  <Feather name="eye" size={14} color={colors.primary} />
                  <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{evidence}</Text>
                </View>
              ))}
              {diagnosis.audioEvidence?.map((evidence, index) => (
                <View key={`audio-${index}`} style={styles.causeRow}>
                  <Feather name="volume-2" size={14} color={colors.primary} />
                  <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{evidence}</Text>
                </View>
              ))}
              {diagnosis.audioEvidence?.length ? (
                <Text style={[styles.causeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 5 }]}>
                  A recording supports the written description; it cannot confirm a fault on its own.
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {(diagnosis.errorCode || diagnosis.errorCodeMeaning || diagnosis.errorCodeSafeChecks?.length) ? (
          <Animated.View entering={FadeInUp.delay(340).duration(400)}>
            <View style={[styles.causesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                ERROR-CODE LOOKUP{diagnosis.errorCode ? ` · ${diagnosis.errorCode}` : ''}
              </Text>
              {diagnosis.errorCodeMeaning ? <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}><Text style={{ fontFamily: 'Inter_600SemiBold' }}>Likely meaning: </Text>{diagnosis.errorCodeMeaning}</Text> : null}
              {diagnosis.errorCodeSafeChecks?.length ? (
                <View style={styles.causeSection}>
                  <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Safe checks</Text>
                  {diagnosis.errorCodeSafeChecks.map((check, index) => <Text key={index} style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>• {check}</Text>)}
                </View>
              ) : null}
              {diagnosis.errorCodeResetAdvice ? <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}><Text style={{ fontFamily: 'Inter_600SemiBold' }}>Reset guidance: </Text>{diagnosis.errorCodeResetAdvice}</Text> : null}
              {diagnosis.errorCodeProfessionalNeeded ? <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}><Text style={{ fontFamily: 'Inter_600SemiBold' }}>Professional escalation: </Text>{diagnosis.errorCodeProfessionalNeeded}</Text> : null}
              {diagnosis.errorCodeCommonParts?.length ? <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}><Text style={{ fontFamily: 'Inter_600SemiBold' }}>Common parts: </Text>{diagnosis.errorCodeCommonParts.join(', ')}</Text> : null}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(345).duration(400)}>
          <View style={[styles.causesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>REPAIR PLANNING</Text>
            <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Parts and tools checklist</Text>
            <View style={styles.causeSection}>
              <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Likely parts needed</Text>
              {diagnosis.partsNeeded?.length ? diagnosis.partsNeeded.map((part, index) => <Text key={index} style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>• {part}</Text>) : <Text style={[styles.causeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No specific part can be identified confidently yet.</Text>}
            </View>
            <View style={styles.causeSection}>
              <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Required tools</Text>
              {diagnosis.requiredTools?.length ? diagnosis.requiredTools.map((tool, index) => <Text key={index} style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>• {tool}</Text>) : <Text style={[styles.causeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Check the appliance manual before choosing tools.</Text>}
            </View>
            <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              <Text style={{ fontFamily: 'Inter_600SemiBold' }}>Approximate parts price: </Text>£{diagnosis.partsCostMin} - £{diagnosis.partsCostMax}. Estimate only; no retailer links are provided.
            </Text>
            <Text style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular', marginTop: 6 }]}>
              <Text style={{ fontFamily: 'Inter_600SemiBold' }}>DIY suitability: </Text>{diagnosis.diySuitability === 'yes' ? 'Suitable for a careful DIY repair' : diagnosis.diySuitability === 'with_caution' ? 'Possible with caution and the right experience' : 'Not suitable for DIY; use a qualified professional'}
            </Text>
            {diagnosis.professionalParts?.length ? (
              <View style={styles.causeSection}>
                <Text style={[styles.causeHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Professional-only parts or fitting</Text>
                {diagnosis.professionalParts.map((part, index) => <Text key={index} style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>• {part}</Text>)}
              </View>
            ) : null}
          </View>
        </Animated.View>

        {diagnosis.coverageGuidance ? <Animated.View entering={FadeInUp.delay(360).duration(400)}>
          <View style={[styles.coverageGuidance, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>BEFORE PAID REPAIR</Text>
            <Text style={[styles.coverageHeading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{diagnosis.coverageGuidance.heading}</Text>
            {diagnosis.coverageGuidance.nextSteps.map((step, index) => (
              <Text key={index} style={[styles.causeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{index + 1}. {step}</Text>
            ))}
          </View>
        </Animated.View> : null}

        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>INTERACTIVE CHECK</Text>
            <Text style={[styles.checklistTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Narrow this down</Text>
            <Text style={[styles.checklistIntro, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Each answer updates the likely cause and next steps.
            </Text>
            {diagnosisChecklistQuestions.map(({ key, question }) => (
              <View key={key} style={styles.checklistQuestion}>
                <Text style={[styles.checklistQuestionText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{question}</Text>
                <View style={styles.checklistOptions}>
                  {(['yes', 'no', 'unsure'] as ChecklistAnswer[]).map((answer) => {
                    const selected = checklistAnswers[key] === answer;
                    return (
                      <Pressable
                        key={answer}
                        onPress={() => answerChecklist(key, answer)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.checklistOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.background }]}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>
                          {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>REPAIR COST</Text>
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              £{diagnosis.repairCostMin} - £{diagnosis.repairCostMax}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>PARTS COST</Text>
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              £{diagnosis.partsCostMin} - £{diagnosis.partsCostMax}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.nextStepsSection}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
            NEXT STEPS
          </Text>
          <View style={[styles.stepsContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {interactiveResult.nextSteps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={[styles.stepDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.stepText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={[styles.expertCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.expertHeading}>
            <Feather name="message-circle" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.expertTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>FixMate Expert</Text>
              <Text style={[styles.expertCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Ask a private follow-up about this diagnosis</Text>
            </View>
          </View>
          {turns.map((turn, index) => (
            <View key={`${turn.role}-${index}`} style={[styles.turn, { backgroundColor: turn.role === 'user' ? colors.secondary : colors.background }]}>
              <Text style={[styles.turnText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{turn.content}</Text>
              {turn.safetyLevel && <Text style={[styles.safetyStatus, { color: turn.safetyLevel === 'professional' ? colors.destructive : colors.primary }]}>{turn.safetyLevel}</Text>}
            </View>
          ))}
          {assistantError ? <Text style={[styles.assistantError, { color: colors.destructive }]}>{assistantError}</Text> : null}
          <TextInput value={question} onChangeText={setQuestion} editable={!assistant.isPending && turns.length < 8}
            placeholder="What should I check next?" placeholderTextColor={colors.mutedForeground}
            style={[styles.expertInput, { color: colors.foreground, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
            onSubmitEditing={askExpert} returnKeyType="send" />
          <Pressable onPress={askExpert} disabled={assistant.isPending || question.trim().length < 2 || turns.length >= 8}
            style={[styles.askButton, { backgroundColor: colors.primary, opacity: assistant.isPending ? 0.6 : 1 }]}>
            {assistant.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.askText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>Ask Expert</Text>}
          </Pressable>
        </Animated.View>

        {!isSubscribed && (
          <Animated.View entering={FadeIn.delay(700).duration(400)}>
            <Pressable
              style={({ pressed }) => [
                styles.upsellBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
              onPress={() => router.push('/plus')}
            >
              <Text style={[styles.upsellText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
                 Unlock evidence-aware diagnosis with FixMate Plus
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(800).duration(400)}>
          <Pressable
            style={({ pressed }) => [
              styles.upsellBtn,
              {
                backgroundColor: colors.foreground,
                borderRadius: colors.radius,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                marginTop: isSubscribed ? 8 : 16
              }
            ]}
            onPress={postDiagnosisAsJob}
          >
            <Text style={[styles.upsellText, { color: colors.background, fontFamily: 'Inter_700Bold' }]}>
              Get Quotes from Local Engineers
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backBtnText: {
    fontSize: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  confidence: {
    fontSize: 14,
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
    marginBottom: 32,
  },
  problemCard: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  problemText: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailsCard: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  detailValue: {
    width: '46%',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 19,
  },
  causesCard: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    gap: 15,
  },
  causeSection: {
    gap: 9,
  },
  causeHeading: {
    fontSize: 14,
    lineHeight: 20,
  },
  causeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  causeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  causeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  coverageGuidance: {
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  coverageHeading: {
    fontSize: 17,
    lineHeight: 23,
  },
  inspectionSection: {
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 24,
    gap: 12,
  },
  checklistCard: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    gap: 14,
  },
  checklistTitle: {
    fontSize: 20,
    marginTop: -6,
  },
  checklistIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
  },
  checklistQuestion: {
    gap: 9,
  },
  checklistQuestionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  checklistOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  checklistOption: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  safetyTitle: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
  },
  nextStepsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  stepsContainer: {
    borderWidth: 1,
    padding: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  upsellBtn: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  upsellText: {
    fontSize: 16,
  },
  expertCard: { borderWidth: 1, padding: 16, marginBottom: 24 },
  expertHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  expertTitle: { fontSize: 18 },
  expertCaption: { fontSize: 13, marginTop: 3 },
  turn: { padding: 10, borderRadius: 10, marginBottom: 8 },
  turnText: { fontSize: 14, lineHeight: 20 },
  safetyStatus: { fontSize: 11, marginTop: 5, textTransform: 'capitalize' },
  assistantError: { fontSize: 13, marginBottom: 8 },
  expertInput: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12, marginTop: 4 },
  askButton: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  askText: { fontSize: 14 }
});
