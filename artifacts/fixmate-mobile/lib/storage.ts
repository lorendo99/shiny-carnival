import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiagnosisChecklistAnswers } from '@workspace/api-client-react';

export interface Diagnosis {
  id: string;
  appliance: string;
  symptom: string;
  mediaUri?: string | null;
  mediaType?: 'photo' | 'video' | 'audio' | null;
  headline: string;
  likelyProblem: string;
  applianceDetails?: {
    brand?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
    productType?: string | null;
    approximateAge?: string | null;
  };
  otherPossibleCauses?: string[];
  distinguishingEvidence?: string[];
  professionalInspection?: string;
  checklistAnswers?: DiagnosisChecklistAnswers;
  confidence: number;
  repairCostMin: number;
  repairCostMax: number;
  partsCostMin: number;
  partsCostMax: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  safetyLevel: 'safe' | 'caution' | 'professional';
  safetyNote: string;
  nextSteps: string[];
  mediaEvidence?: string[];
  audioEvidence?: string[];
  errorCode?: string | null;
  errorCodeMeaning?: string | null;
  errorCodeSafeChecks?: string[];
  errorCodeResetAdvice?: string | null;
  errorCodeProfessionalNeeded?: string | null;
  errorCodeCommonParts?: string[];
  partsNeeded?: string[];
  requiredTools?: string[];
  diySuitability?: 'yes' | 'with_caution' | 'no';
  professionalParts?: string[];
  coverageAnswers?: {
    manufacturerWarranty: 'yes' | 'no' | 'unsure';
    appliancePlan: 'yes' | 'no' | 'unsure';
    homeInsurance: 'yes' | 'no' | 'unsure';
    recentlyRepaired: 'yes' | 'no' | 'unsure';
  };
  coverageGuidance?: {
    route: 'manufacturer_warranty' | 'appliance_plan' | 'home_insurance' | 'recent_repair' | 'check_coverage' | 'paid_repair';
    heading: string;
    nextSteps: string[];
  };
  mediaAnalysed?: boolean;
  createdAt: string;
}

const STORAGE_KEY = '@fixmate_diagnoses';

export async function getDiagnoses(): Promise<Diagnosis[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get diagnoses:', error);
    return [];
  }
}

export async function getDiagnosis(id: string): Promise<Diagnosis | null> {
  const diagnoses = await getDiagnoses();
  return diagnoses.find((d) => d.id === id) || null;
}

export async function saveDiagnosis(diagnosis: Diagnosis): Promise<void> {
  try {
    const current = await getDiagnoses();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([diagnosis, ...current]));
  } catch (error) {
    console.error('Failed to save diagnosis:', error);
  }
}

export async function updateDiagnosis(id: string, patch: Partial<Diagnosis>): Promise<void> {
  try {
    const current = await getDiagnoses();
    const updated = current.map((diagnosis) => diagnosis.id === id ? { ...diagnosis, ...patch } : diagnosis);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update diagnosis:', error);
  }
}

export async function clearDiagnoses(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
