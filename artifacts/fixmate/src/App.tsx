import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useCreateDiagnosis,
  useExtractApplianceLabel,
  getListDiagnosesQueryKey,
  useListDiagnoses,
  useRequestUploadUrl,
  useAskDiagnosisAssistant,
  type DiagnosisResult,
  type CoverageAnswers as ApiCoverageAnswers,
  type ApplianceDetails,
  type DiagnosisAssistantInputHistoryItem,
  type DiagnosisAssistantResultSafetyLevel,
  type UploadedMedia,
  applyDiagnosisChecklist,
  diagnosisChecklistQuestions,
  type ChecklistAnswer,
  type DiagnosisChecklistAnswers,
} from '@workspace/api-client-react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { AccessibilityPreferencesProvider, useAccessibilityPreferences } from '@/lib/accessibility';
import { trackEvent } from '@/lib/analytics';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Marketplace from '@/pages/marketplace';
import PrivacyPage from '@/pages/privacy';
import DeleteAccountPage from '@/pages/delete-account';
import TermsPage from '@/pages/terms';
import ContactPage from '@/pages/contact';
import HelpPage from '@/pages/help';
import AboutPage from '@/pages/about';
import DemoPage from '@/pages/demo';
import NotificationsPage from '@/pages/notifications';
import InventoryPage, { InventoryDetailPage, RepairReportPage } from '@/pages/inventory';
import RepairGuidePage from '@/pages/repair-guide';
import { getRepairGuide, repairGuides } from '@/data/repairGuides';
import { routeMetadata, setPageMetadata } from '@/lib/seo';
import { Header, Footer } from '@/components/layout';
import { captureCampaignAttribution } from '@/lib/attribution';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  Check,
  Clipboard,
  FileImage,
  HardHat,
  House,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Microwave,
  Refrigerator,
  ShieldCheck,
  ScanLine,
  Tv,
  UserRound,
  Volume2,
  WashingMachine,
  Wrench,
  X,
  Send,
  Share2,
} from 'lucide-react';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
  Link,
} from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
]);

type SafetyAnswer = '' | 'yes' | 'no' | 'unsure';
type SafetyQuestionKey = 'hazard' | 'injury' | 'connected';
type SafetyAnswers = Record<SafetyQuestionKey, SafetyAnswer>;
type CoverageAnswer = '' | 'yes' | 'no' | 'unsure';
type CoverageQuestionKey = 'manufacturerWarranty' | 'appliancePlan' | 'homeInsurance' | 'recentlyRepaired';
type CoverageAnswers = Record<CoverageQuestionKey, CoverageAnswer>;

type SpeechRecognitionEventLike = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const safetyQuestions: Array<{ key: SafetyQuestionKey; question: string }> = [
  { key: 'hazard', question: 'Is there smoke, a burning smell, sparks, a gas smell, flooding, or exposed wiring?' },
  { key: 'injury', question: 'Is anyone injured or in immediate danger?' },
  { key: 'connected', question: 'Is the appliance still connected to power or water?' },
];

const coverageQuestions: Array<{ key: CoverageQuestionKey; question: string }> = [
  { key: 'manufacturerWarranty', question: 'Is it still under the manufacturer warranty?' },
  { key: 'appliancePlan', question: 'Is it covered by an appliance plan?' },
  { key: 'homeInsurance', question: 'Is it covered by home insurance?' },
  { key: 'recentlyRepaired', question: 'Was it recently repaired?' },
];

const applianceDetailFields: Array<{
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function confidenceBand(confidence: number): string {
  if (confidence >= 80) return 'high';
  if (confidence >= 60) return 'medium';
  return 'low';
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

const DB_NAME = 'fixmate_draft';
const STORE_NAME = 'draft_media';

async function saveDraftMedia(file: File) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, 'media');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

async function loadDraftMedia(): Promise<File | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const getReq = tx.objectStore(STORE_NAME).get('media');
      getReq.onsuccess = () => resolve(getReq.result as File);
      getReq.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

async function clearDraftMedia() {
  return new Promise<void>((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete('media');
        tx.oncomplete = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
  },
  variables: {
    colorPrimary: '#c48527',
    colorForeground: '#17232d',
    colorMutedForeground: '#536671',
    colorDanger: '#b74635',
    colorBackground: '#fffdf7',
    colorInput: '#f4f6f1',
    colorInputForeground: '#17232d',
    colorNeutral: '#b9c9c2',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf7] rounded-3xl w-[440px] max-w-full overflow-hidden border border-[#dfe5df] shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#17232d] font-extrabold',
    headerSubtitle: 'text-[#536671]',
    socialButtonsBlockButtonText: 'text-[#17232d] font-bold',
    formFieldLabel: 'text-[#344952] font-bold',
    footerActionLink: 'text-[#9a6119] font-extrabold',
    footerActionText: 'text-[#536671]',
    dividerText: 'text-[#70817f]',
    identityPreviewEditButton: 'text-[#9a6119]',
    formFieldSuccessText: 'text-[#29705f]',
    alertText: 'text-[#7a3026]',
    logoBox: 'h-12',
    logoImage: 'h-11',
    socialButtonsBlockButton: 'border-[#cad8d2] bg-[#f8faf5]',
    formButtonPrimary: 'bg-[#f2b94b] text-[#17232d] font-extrabold hover:bg-[#f6c55f]',
    formFieldInput: 'bg-[#f8faf5] border-[#cad8d2] text-[#17232d]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#dfe5df]',
    alert: 'bg-[#fce8e2] border-[#efc5bb]',
    otpCodeFieldInput: 'border-[#cad8d2] text-[#17232d]',
    formFieldRow: 'text-[#17232d]',
    main: 'gap-5',
  },
};

function Home() {
  const [itemType, setItemType] = useState('');
  const [symptom, setSymptom] = useState('');
  const [errorCode, setErrorCode] = useState('');
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
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [applianceDetails, setApplianceDetails] = useState<ApplianceDetails>({});
  const [labelScanPending, setLabelScanPending] = useState(false);
  const [labelScanError, setLabelScanError] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasStartedDraftUpload, setHasStartedDraftUpload] = useState(false);
  const [evidenceChoice, setEvidenceChoice] = useState<'unset' | 'with_media' | 'without_media'>('unset');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [checklistAnswers, setChecklistAnswers] = useState<DiagnosisChecklistAnswers>({});
  const [showHandoff, setShowHandoff] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantTurns, setAssistantTurns] = useState<DiagnosisAssistantInputHistoryItem[]>([]);
  const [assistantSafety, setAssistantSafety] = useState<DiagnosisAssistantResultSafetyLevel | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const diagnosisFormRef = useRef<HTMLFormElement>(null);
  const safetySectionRef = useRef<HTMLElement>(null);
  const activeUploadRef = useRef<XMLHttpRequest | null>(null);
  const uploadVersionRef = useRef(0);
  const hasTrackedEngagement = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const diagnosis = useCreateDiagnosis();
  const labelExtraction = useExtractApplianceLabel();
  const uploadRequest = useRequestUploadUrl();
  const assistant = useAskDiagnosisAssistant();
  const { isSignedIn, user } = useUser();
  const diagnosisHistory = useListDiagnoses({
    query: {
      queryKey: getListDiagnosesQueryKey(),
      enabled: Boolean(isSignedIn),
      staleTime: 30_000,
    },
  });
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { simpleLanguage } = useAccessibilityPreferences();

  const itemOptions = [
    { name: 'Washing machine', icon: WashingMachine },
    { name: 'Refrigerator', icon: Refrigerator },
    { name: 'Dishwasher', icon: House },
    { name: 'Oven or stove', icon: Microwave },
    { name: 'Television', icon: Tv },
    { name: 'Something else', icon: Wrench },
  ];

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

  const answerCoverageQuestion = (key: CoverageQuestionKey, answer: Exclude<CoverageAnswer, ''>) => {
    setCoverageAnswers((current) => ({ ...current, [key]: answer }));
  };

  const updateApplianceDetail = (key: keyof ApplianceDetails, value: string) => {
    setApplianceDetails((current) => ({ ...current, [key]: value.trim() ? value : null }));
  };

  useEffect(() => {
    const loadDrafts = async () => {
      const guide = getRepairGuide(new URLSearchParams(window.location.search).get('guide'));
      const savedItem = sessionStorage.getItem('draft_itemType');
      if (savedItem) setItemType(savedItem);
      else if (guide) setItemType(guide.itemType);

      const savedSymptom = sessionStorage.getItem('draft_symptom');
      if (savedSymptom) setSymptom(savedSymptom);
      else if (guide) setSymptom(guide.symptom);
      const savedErrorCode = sessionStorage.getItem('draft_errorCode');
      if (savedErrorCode) setErrorCode(savedErrorCode);
      const savedCoverage = sessionStorage.getItem('draft_coverageAnswers');
      if (savedCoverage) {
        try {
          setCoverageAnswers(JSON.parse(savedCoverage) as CoverageAnswers);
        } catch {
          sessionStorage.removeItem('draft_coverageAnswers');
        }
      }
      const savedInventoryItemId = sessionStorage.getItem('fixmate_inventory_item_id');
      if (savedInventoryItemId) setInventoryItemId(savedInventoryItemId);

      const file = await loadDraftMedia();
      if (file) {
        setLocalFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMediaName(file.name);
        setEvidenceChoice('with_media');
      }
    };
    loadDrafts();
  }, []);

  useEffect(() => {
    const attribution = captureCampaignAttribution();
    if (!attribution || sessionStorage.getItem('fixmate_attribution_tracked')) return;
    trackEvent('campaign_attribution_captured', attribution);
    sessionStorage.setItem('fixmate_attribution_tracked', 'true');
  }, []);

  useEffect(() => {
    if (isSignedIn) setShowAuthGate(false);
  }, [isSignedIn]);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
  }, []);

  const startVoiceInput = () => {
    setVoiceError(null);
    const SpeechRecognitionConstructor = (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setVoiceError('Voice input is not available in this browser. You can use your keyboard microphone instead.');
      return;
    }
    speechRecognitionRef.current?.stop();
    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setSymptom((current) => `${current}${current.trim() ? ' ' : ''}${transcript}`.slice(0, 500));
    };
    recognition.onerror = () => {
      setVoiceError('We could not hear that. Check microphone permission and try again.');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    speechRecognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => {
    if (itemType) sessionStorage.setItem('draft_itemType', itemType);
    else sessionStorage.removeItem('draft_itemType');
    if (symptom) sessionStorage.setItem('draft_symptom', symptom);
    else sessionStorage.removeItem('draft_symptom');
    if (errorCode) sessionStorage.setItem('draft_errorCode', errorCode);
    else sessionStorage.removeItem('draft_errorCode');
    sessionStorage.setItem('draft_coverageAnswers', JSON.stringify(coverageAnswers));

    if (!hasTrackedEngagement.current && (itemType || symptom.length > 5)) {
      trackEvent('diagnosis_form_engaged');
      hasTrackedEngagement.current = true;
    }
  }, [itemType, symptom, errorCode, coverageAnswers]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (isSignedIn && safetyReady && localFile && !media && !hasStartedDraftUpload && !uploadError) {
      setHasStartedDraftUpload(true);
      startUpload(localFile, 'restored_draft');
    }
  }, [isSignedIn, safetyReady, localFile, media, hasStartedDraftUpload, uploadError]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!itemType || !symptom.trim() || !safetyReady || !coverageComplete) return;

    if (!isSignedIn) {
      if (!showAuthGate) trackEvent('auth_gate_opened', { location: 'diagnosis_submit' });
      setShowAuthGate(true);
      return;
    }

    if (diagnosis.isPending || uploadRequest.isPending || Boolean(localFile && !media)) return;

    setResult(null);
    setShowHandoff(false);
    setCopied(false);

    trackEvent('diagnosis_requested', {
      item_type: itemType,
      has_media: Boolean(media),
      media_kind: media?.contentType.startsWith('audio/')
        ? 'audio'
        : media?.contentType.startsWith('video/') ? 'video' : media ? 'image' : 'none',
    });

    diagnosis.mutate(
      {
        data: {
          itemType,
          symptom: symptom.trim(),
          media,
          mediaName,
          applianceDetails: hasApplianceDetails ? applianceDetails : undefined,
          errorCode: errorCode.trim() || null,
          coverageAnswers: coverageAnswers as ApiCoverageAnswers,
           inventoryItemId,
        },
      },
      {
        onSuccess: (data) => {
          sessionStorage.removeItem('draft_itemType');
          sessionStorage.removeItem('draft_symptom');
           sessionStorage.removeItem('draft_errorCode');
           sessionStorage.removeItem('draft_coverageAnswers');
           sessionStorage.removeItem('fixmate_inventory_item_id');
           setInventoryItemId(null);
          clearDraftMedia();

          setResult(data);
           setApplianceDetails({});
           setLabelScanError(null);
           setCoverageAnswers({
             manufacturerWarranty: '',
             appliancePlan: '',
             homeInsurance: '',
             recentlyRepaired: '',
           });
          queryClient.setQueryData<DiagnosisResult[]>(
            getListDiagnosesQueryKey(),
            (current = []) => [data, ...current.filter(({ id }) => id !== data.id)].slice(0, 20),
          );
          trackEvent('diagnosis_completed', {
            item_type: data.itemType,
            safety_level: data.safetyLevel,
            difficulty: data.difficulty,
            confidence_band: confidenceBand(data.confidence),
            media_analysed: data.mediaAnalysed,
          });
        },
        onError: () => {
          trackEvent('diagnosis_failed', {
            item_type: itemType,
            has_media: Boolean(media),
          });
        },
      },
    );
  };

  const startDiagnosisFlow = () => {
    trackEvent('diagnosis_cta_clicked', { location: 'hero' });
    diagnosisFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('item-type-heading')?.focus(), 350);
  };

  const shareFixMate = async () => {
    const shareData = {
      title: 'FixMate — UK household repair guidance',
      text: 'FixMate helps you understand what may be wrong, what it could cost, and what to do next when something breaks.',
      url: `${window.location.origin}${basePath || '/'}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus('shared');
        trackEvent('fixmate_shared', { method: 'web_share' });
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus('copied');
        trackEvent('fixmate_shared', { method: 'clipboard' });
      }
      window.setTimeout(() => setShareStatus('idle'), 2400);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        const fallback = document.createElement('textarea');
        fallback.value = shareData.url;
        fallback.setAttribute('readonly', '');
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
        setShareStatus('copied');
        trackEvent('fixmate_shared', { method: 'clipboard_fallback' });
        window.setTimeout(() => setShareStatus('idle'), 2400);
      } catch {
        setShareStatus('idle');
      }
    }
  };

  const continueWithoutPhoto = () => {
    setEvidenceChoice('without_media');
    trackEvent('evidence_skipped', { reason: 'continue_without_photo' });
    safetySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openProfessionalHandoff = (diagnosisResult: DiagnosisResult, autoPrompted = false) => {
    setResult(diagnosisResult);
    setShowHandoff(true);
    trackEvent('professional_handoff_opened', {
      item_type: diagnosisResult.itemType,
      safety_level: diagnosisResult.safetyLevel,
      auto_prompted: autoPrompted,
    });
    window.setTimeout(() => document.getElementById('professional-handoff')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const uploadToStorage = (url: string, file: File, version: number) =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      activeUploadRef.current = request;
      request.open('PUT', url);
      request.setRequestHeader('Content-Type', file.type);
      request.upload.onprogress = (progress) => {
        if (progress.lengthComputable && version === uploadVersionRef.current) {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      };
      request.onload = () =>
        request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error('The upload did not finish. Please try again.'));
      request.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
      request.onabort = () => reject(new Error('Upload cancelled.'));
      request.send(file);
    });

  const startUpload = async (file: File, source: string) => {
    activeUploadRef.current?.abort();
    const version = ++uploadVersionRef.current;
    setUploadError(null);
    setUploadProgress(0);
    trackEvent('evidence_upload_started', {
      source,
      media_kind: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'video',
    });

    try {
      const upload = await uploadRequest.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      await uploadToStorage(upload.uploadURL, file, version);
      if (version !== uploadVersionRef.current) return;

      setMedia({
        objectPath: upload.objectPath,
        uploadToken: upload.uploadToken,
        name: file.name,
        contentType: file.type,
        size: file.size,
      });
      setUploadProgress(100);

      trackEvent('evidence_upload_completed', {
        source,
        media_kind: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'video',
      });
    } catch (error) {
      if (version !== uploadVersionRef.current) return;
      setUploadProgress(0);
      setHasStartedDraftUpload(false);
      setUploadError(
        error instanceof Error
          ? error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
          : 'The upload could not finish. Please try again.',
      );
      trackEvent('evidence_upload_failed', {
        source,
        media_kind: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'video',
      });
    }
  };

  const onFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    source: 'library' | 'camera',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      trackEvent('evidence_upload_rejected', { reason: 'unsupported_type', source });
      setUploadError('Use a JPG, PNG, WebP, MP4, WebM, MOV, or short audio clip.');
      return;
    }
    const sizeLimit = file.type.startsWith('image/')
      ? MAX_IMAGE_BYTES
      : file.type.startsWith('audio/') ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES;
    if (file.size > sizeLimit) {
      trackEvent('evidence_upload_rejected', {
        reason: 'too_large',
        source,
        media_kind: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'video',
      });
      setUploadError(
        file.type.startsWith('image/')
          ? 'Photos must be 15 MB or smaller.'
          : file.type.startsWith('audio/')
            ? 'Audio clips must be 15 MB or smaller and no longer than 15 seconds.'
            : 'Videos must be 60 MB or smaller and no longer than 30 seconds.',
      );
      return;
    }

    trackEvent(isSignedIn ? 'evidence_selected' : 'evidence_selected_before_auth', {
      source,
      media_kind: file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : 'video'
    });

    setEvidenceChoice('with_media');
    setLocalFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaName(file.name);
    setMedia(null);
    setUploadError(null);
    setUploadProgress(0);
    setHasStartedDraftUpload(false);

    await saveDraftMedia(file).catch((e) => {
      console.warn('Could not save draft media to IndexedDB:', e);
    });

    if (isSignedIn && safetyReady) {
      setHasStartedDraftUpload(true);
      startUpload(file, source);
    }
  };

  const onLabelFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isSignedIn) {
      setLabelScanError('Sign in before scanning an appliance label.');
      setLocation('/sign-in');
      return;
    }
    if (!safetyReady) {
      setLabelScanError('Complete the safety check before scanning a label.');
      return;
    }
    if (!file.type.startsWith('image/') || !ALLOWED_MEDIA_TYPES.has(file.type)) {
      setLabelScanError('Use a JPG, PNG, or WebP photo of the appliance label.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLabelScanError('Label photos must be 15 MB or smaller.');
      return;
    }

    setLabelScanPending(true);
    setLabelScanError(null);
    try {
      const upload = await uploadRequest.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      const uploaded = await fetch(upload.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploaded.ok) throw new Error(`Label photo upload failed (${uploaded.status}).`);

      const extracted = await labelExtraction.mutateAsync({
        data: {
          media: {
            objectPath: upload.objectPath,
            uploadToken: upload.uploadToken,
            name: file.name,
            contentType: file.type,
            size: file.size,
          },
        },
      });
      setApplianceDetails(extracted.details);
    } catch (error) {
      setLabelScanError(
        error instanceof Error
          ? error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
          : 'FixMate could not read that label. Try a sharper, well-lit photo.',
      );
    } finally {
      setLabelScanPending(false);
    }
  };

  const clearMedia = async () => {
    uploadVersionRef.current += 1;
    activeUploadRef.current?.abort();
    activeUploadRef.current = null;
    setMediaName(null);
    setMedia(null);
    setLocalFile(null);
    setEvidenceChoice('unset');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setHasStartedDraftUpload(false);
    await clearDraftMedia();
    trackEvent('evidence_removed');
  };

  const diagnosisError =
    diagnosis.error instanceof Error
      ? diagnosis.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
      : null;

  const displayedResult = result ?? diagnosisHistory.data?.[0] ?? null;
  const displayedResultId = displayedResult?.id ?? null;
  const interactiveResult = displayedResult
    ? applyDiagnosisChecklist(displayedResult, checklistAnswers)
    : null;
  const isResultLoading =
    diagnosis.isPending ||
    (Boolean(isSignedIn) && diagnosisHistory.isPending && !displayedResult);

  useEffect(() => {
    setAssistantTurns([]);
    setAssistantQuestion('');
    setAssistantSafety(null);
    assistant.reset();
  }, [displayedResultId]);

  useEffect(() => {
    if (!displayedResultId) {
      setChecklistAnswers({});
      return;
    }
    try {
      const stored = localStorage.getItem(`fixmate_checklist_${displayedResultId}`);
      setChecklistAnswers(stored ? JSON.parse(stored) as DiagnosisChecklistAnswers : {});
    } catch {
      setChecklistAnswers({});
    }
  }, [displayedResultId]);

  const answerChecklist = (key: keyof DiagnosisChecklistAnswers, answer: ChecklistAnswer) => {
    if (!displayedResultId) return;
    setChecklistAnswers((current) => {
      const next = { ...current, [key]: answer };
      try {
        localStorage.setItem(`fixmate_checklist_${displayedResultId}`, JSON.stringify(next));
      } catch {
        // The checklist remains useful for this session if storage is unavailable.
      }
      return next;
    });
    trackEvent('diagnosis_checklist_answered', { question: key, answer });
  };

  const askAssistant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn || !displayedResult || assistant.isPending) return;
    const question = assistantQuestion.trim();
    if (question.length < 2) return;

    trackEvent('assistant_question_started', { item_type: displayedResult.itemType });

    const history = assistantTurns.slice(-8);
    assistant.mutate(
      { diagnosisId: displayedResult.id, data: { question, history } },
      {
        onSuccess: (response) => {
          trackEvent('assistant_question_completed', { safety_level: response.safetyLevel });
          setAssistantSafety(response.safetyLevel);
          setAssistantTurns((turns) => [
            ...turns,
            { role: 'user' as const, content: question },
            { role: 'assistant' as const, content: response.answer },
          ].slice(-8));
          setAssistantQuestion('');
        },
        onError: () => {
          trackEvent('assistant_question_failed');
        }
      },
    );
  };

  const copyDetails = async (diagnosisResult: DiagnosisResult) => {
    const details = `${diagnosisResult.itemType}: ${diagnosisResult.headline}\nLikely problem: ${diagnosisResult.likelyProblem}\nEstimated repair: £${diagnosisResult.repairCostMin}–£${diagnosisResult.repairCostMax}`;
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      trackEvent('diagnosis_copied', {
        item_type: diagnosisResult.itemType,
        safety_level: diagnosisResult.safetyLevel,
      });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const needsProfessional = displayedResult && (displayedResult.safetyLevel === 'professional' || displayedResult.confidence < 60);
  const showPricing = displayedResult && (displayedResult.confidence >= 60 && displayedResult.safetyLevel !== 'professional');

  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />

       <main id="main-content" className="fixmate-shell flex-1">
         <section className="hero">
            <div className="eyebrow"><span className="eyebrow-line" /> A calmer way to start a repair in the UK</div>
            <h1>{simpleLanguage ? 'Repair answers for your home' : 'Home repair guidance for UK households'}</h1>
            <p className="hero-copy">{simpleLanguage ? 'Take a photo, get safe guidance, and know what to do next.' : 'When an appliance breaks, FixMate helps you understand likely faults, check safety, estimate UK repair costs, and choose a practical next step.'}</p>
            <div className="hero-actions">
              <button type="button" className="hero-primary-button" onClick={startDiagnosisFlow} data-testid="button-start-diagnosis">
                <Camera size={17} aria-hidden="true" /> Diagnose a problem <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link href="/sign-up" className="hero-secondary-button" onClick={() => trackEvent('auth_cta_selected', { action: 'create_account', location: 'hero' })}>
                Create a free account
              </Link>
              <button type="button" className="hero-share-button" onClick={shareFixMate} data-testid="button-share-fixmate">
                {shareStatus === 'idle' ? <Share2 size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                {shareStatus === 'shared' ? 'Shared' : shareStatus === 'copied' ? 'Link copied' : 'Share FixMate'}
              </button>
            </div>
            <div className="hero-flow" aria-label="How FixMate works">
              <div className="hero-flow-step"><span>01</span><strong>Take a photo</strong></div>
              <div className="hero-flow-arrow" aria-hidden="true">→</div>
              <div className="hero-flow-step"><span>02</span><strong>Get safe guidance</strong></div>
              <div className="hero-flow-arrow" aria-hidden="true">→</div>
              <div className="hero-flow-step"><span>03</span><strong>Find parts or a repairer</strong></div>
            </div>
        </section>

        <section className="guide-discovery" aria-labelledby="popular-guides-heading">
          <div className="guide-discovery-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Start with a common problem</div>
              <h2 id="popular-guides-heading">Popular repair guides for UK homes</h2>
            </div>
            <Link href="/repair-guides/dishwasher-not-draining" className="guide-discovery-all">Browse guides <ArrowRight size={15} /></Link>
          </div>
          <div className="guide-discovery-grid">
            {repairGuides.slice(0, 4).map((guide) => (
              <Link
                href={`/repair-guides/${guide.slug}`}
                className="guide-discovery-card"
                key={guide.slug}
                onClick={() => trackEvent('repair_guide_cta_clicked', { guide: guide.slug, location: 'homepage' })}
              >
                <span>{guide.eyebrow}</span>
                <strong>{guide.heading}<ArrowRight size={15} aria-hidden="true" /></strong>
              </Link>
            ))}
          </div>
        </section>

        <div className="workspace">
          <form ref={diagnosisFormRef} id="diagnosis-form" className="panel diagnosis-form" onSubmit={submit} data-testid="form-diagnosis">
            <div className="form-header mb-6">
               <h2 className="text-xl font-bold text-[#17232d] mb-1">{simpleLanguage ? 'What is wrong?' : "What's the problem?"}</h2>
              <p className="text-sm text-[#536671]">Tell us what's broken and we'll help you figure out the next steps.</p>
            </div>

             <label className="field-label" id="item-type-heading" tabIndex={-1}>What stopped working?</label>
            <div className="item-grid" role="group" aria-label="Item type">
              {itemOptions.map(({ name, icon: Icon }) => (
                <button
                  type="button"
                  key={name}
                  className="item-choice"
                  aria-pressed={itemType === name}
                  onClick={() => setItemType(name)}
                  data-testid={`button-item-${name.toLowerCase().replaceAll(' ', '-')}`}
                >
                  <Icon className="item-icon" strokeWidth={1.7} />
                  <span className="item-name">{name}</span>
                </button>
              ))}
            </div>

             <label className="field-label" htmlFor="symptom">{simpleLanguage ? 'What happened?' : 'What is it doing — or not doing?'}</label>
            <div className="symptom-wrap">
              <textarea
                id="symptom"
                className="symptom-input"
                value={symptom}
                maxLength={500}
                onChange={(event) => setSymptom(event.target.value)}
                 aria-required="true"
                 aria-describedby="symptom-help"
                 aria-invalid={Boolean(voiceError)}
                placeholder="For example: It hums for a minute, then stops. There is a small puddle underneath."
                data-testid="input-symptom"
              />
              <span className="char-count">{symptom.length} / 500</span>
               <button type="button" className="voice-input-button" onClick={isListening ? () => speechRecognitionRef.current?.stop() : startVoiceInput} aria-pressed={isListening} aria-label={isListening ? 'Stop voice input' : 'Use voice input'}>
                 <Volume2 size={15} aria-hidden="true" /> {isListening ? 'Stop listening' : 'Speak'}
               </button>
            </div>
             <p id="symptom-help" className="field-help">You can type, use your keyboard microphone, or press Speak.</p>
              {voiceError && <p className="field-error" role="alert">{voiceError}</p>}

             <section className={`evidence-section ${evidenceChoice === 'with_media' ? 'selected' : ''}`} aria-labelledby="evidence-heading">
               <div className="evidence-section-heading">
                 <div>
                   <div className="problem-card-label">Recommended first step</div>
                   <h3 id="evidence-heading">Add a photo of the problem</h3>
                   <p>A clear photo gives FixMate more to work with. Video and short sound clips can add supporting clues.</p>
                 </div>
                 <div className="evidence-heading-icon"><Camera size={21} aria-hidden="true" /></div>
               </div>
               <div className={`evidence-dropzone ${localFile ? 'has-file' : ''}`}>
                 {!localFile ? (
                   <div className="dropzone-empty">
                     <div className="dropzone-icon"><Camera size={24} strokeWidth={1.5} /></div>
                     <div className="dropzone-text">
                       <strong>Show us what you can see</strong>
                       <span>Your file stays local until the safety check is complete.</span>
                     </div>
                     <div className="dropzone-actions">
                       <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={(event) => onFileChange(event, 'library')} hidden data-testid="input-media-file" />
                       <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => onFileChange(event, 'camera')} hidden data-testid="input-media-camera" />
                       <button type="button" onClick={() => cameraInputRef.current?.click()} className="media-button media-button-primary" disabled={uploadRequest.isPending} data-testid="button-capture-evidence">
                         <Camera size={14}/> Take a photo
                       </button>
                       <button type="button" onClick={() => fileInputRef.current?.click()} className="media-button" disabled={uploadRequest.isPending} data-testid="button-choose-evidence">
                         <FileImage size={14}/> Choose a file
                       </button>
                     </div>
                     <button type="button" className="evidence-skip-button" onClick={continueWithoutPhoto} data-testid="button-continue-without-photo">
                       Continue without a photo <ArrowRight size={14} aria-hidden="true" />
                     </button>
                   </div>
                 ) : (
                   <div className="dropzone-filled">
                     <div className="preview-container">
                       {localFile.type.startsWith('audio/') ? (
                         <div className="audio-preview"><Volume2 size={24} /><span>Sound clip attached</span><audio src={previewUrl!} controls /></div>
                       ) : localFile.type.startsWith('video/') ? (
                         <video src={previewUrl!} className="preview-media" autoPlay muted loop playsInline />
                       ) : (
                         <img src={previewUrl!} className="preview-media" alt="Evidence" />
                       )}
                     </div>
                     <div className="preview-info">
                       <strong>{mediaName}</strong>
                       <span className="preview-status">
                         {uploadRequest.isPending || (isSignedIn && localFile && !media && hasStartedDraftUpload && !uploadError) ? 'Uploading securely...' : media ? 'Ready for analysis' : 'Queued for analysis'}
                       </span>
                       {(uploadRequest.isPending || (isSignedIn && localFile && !media && hasStartedDraftUpload && !uploadError)) && (
                         <div className="upload-track mt-1.5"><div className="upload-fill" style={{width: `${uploadProgress}%`}}/></div>
                       )}
                       {uploadError && (
                         <button type="button" className="text-xs font-bold text-[#934328] underline mt-1" onClick={() => {
                           if (localFile) {
                             setHasStartedDraftUpload(true);
                             startUpload(localFile, 'retry');
                           }
                         }}>Retry upload</button>
                       )}
                     </div>
                     <button type="button" onClick={clearMedia} className="remove-media-button" aria-label="Remove evidence" disabled={uploadRequest.isPending}><X size={14}/></button>
                   </div>
                 )}
               </div>
               {uploadError && <div className="upload-error mt-3" role="alert" data-testid="status-upload-error"><AlertTriangle size={14} />{uploadError}</div>}
             </section>

             <label className="field-label" htmlFor="error-code">Error code (optional)</label>
            <input
              id="error-code"
              className="symptom-input"
              value={errorCode}
              maxLength={80}
              onChange={(event) => setErrorCode(event.target.value)}
              placeholder="For example: E15, F21, 4C"
              data-testid="input-error-code"
            />
            <p className="text-xs text-[#536671] -mt-3 mb-5">
              Enter the code, or add a clear photo of the display and FixMate will look for it.
            </p>

             <section ref={safetySectionRef} className="safety-triage" aria-labelledby="safety-check-heading" aria-describedby="safety-check-help">
              <div className="safety-triage-heading">
                <ShieldCheck size={20} />
                <div>
                  <h3 id="safety-check-heading">Quick safety check</h3>
                   <p id="safety-check-help">{simpleLanguage ? 'Answer these first. Your photo or recording will not upload until this check is complete.' : 'Answer these before requesting a diagnosis. Evidence will not upload until this check is complete.'}</p>
                </div>
              </div>
              <div className="safety-questions">
                {safetyQuestions.map(({ key, question }) => (
                  <div className="safety-question" key={key}>
                    <p>{question}</p>
                    <div className="safety-options" role="group" aria-label={question}>
                      {(['yes', 'no', 'unsure'] as const).map((answer) => (
                        <button
                          type="button"
                          key={answer}
                          className="safety-option"
                          aria-pressed={safetyAnswers[key] === answer}
                          onClick={() => answerSafetyQuestion(key, answer)}
                        >
                          {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {requiresSafetyConfirmation && (
                <div className={`safety-triage-alert ${immediateDanger ? 'immediate' : 'caution'}`} role="alert">
                  <AlertTriangle size={19} />
                  <div>
                    <strong>{immediateDanger ? 'Stop and make the area safe first' : 'Switch it off before checking anything'}</strong>
                    <ul>
                      {immediateDanger && (
                        <>
                          <li>Move away from smoke, gas, sparks, flooding, or exposed wiring.</li>
                          <li>Do not touch switches or the appliance if doing so could be dangerous. Call 999 for an immediate fire, gas, or injury emergency.</li>
                          <li>Contact a qualified professional rather than attempting a repair yourself.</li>
                        </>
                      )}
                      {needsShutdown && (
                        <li>Switch off and unplug the appliance, or turn off its water supply, before inspecting it.</li>
                      )}
                    </ul>
                    {!safetyCleared && (
                      <button type="button" className="safety-confirm-button" onClick={() => setSafetyCleared(true)}>
                        I am safe and have followed these steps
                      </button>
                    )}
                    {safetyCleared && (
                      <p className="safety-confirmed"><Check size={14} /> Safety steps acknowledged. Continue only if the danger is no longer present.</p>
                    )}
                  </div>
                </div>
              )}

              {safetyComplete && !requiresSafetyConfirmation && (
                <p className="safety-ready"><Check size={15} /> Safety check complete. You can continue.</p>
              )}
            </section>

            <section className="coverage-section" aria-labelledby="coverage-heading">
              <div className="coverage-heading">
                <ShieldCheck size={20} />
                <div>
                  <h3 id="coverage-heading">Check cover before paying for repair</h3>
                  <p>These answers help FixMate point you to warranty, plan, insurance, or recent-repair support first.</p>
                </div>
              </div>
              <div className="coverage-questions">
                {coverageQuestions.map(({ key, question }) => (
                  <div className="coverage-question" key={key}>
                    <strong>{question}</strong>
                    <div className="coverage-options" role="group" aria-label={question}>
                      {(['yes', 'no', 'unsure'] as const).map((answer) => (
                        <button
                          type="button"
                          key={answer}
                          className={coverageAnswers[key] === answer ? 'selected' : ''}
                          aria-pressed={coverageAnswers[key] === answer}
                          onClick={() => answerCoverageQuestion(key, answer)}
                        >
                          {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!coverageComplete && <p className="coverage-required">Answer each coverage question before requesting a diagnosis.</p>}
            </section>

            <section className="label-details-section" aria-labelledby="label-details-heading">
              <div className="label-details-heading">
                <div>
                  <div className="problem-card-label">Optional but useful</div>
                  <h3 id="label-details-heading">Appliance label</h3>
                  <p>Photograph the rating label and FixMate will read the details for you. Check every value before using it.</p>
                </div>
                <ScanLine size={20} aria-hidden="true" />
              </div>
              <input
                ref={labelInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={onLabelFileChange}
                hidden
                data-testid="input-label-file"
              />
              <button
                type="button"
                className="label-scan-button"
                onClick={() => labelInputRef.current?.click()}
                disabled={!safetyReady || labelScanPending || uploadRequest.isPending}
                data-testid="button-scan-label"
              >
                {labelScanPending ? <><LoaderCircle size={15} className="animate-spin" /> Reading label…</> : <><ScanLine size={15} /> Photograph label</>}
              </button>
              {labelScanError && <div className="label-scan-error" role="alert"><AlertTriangle size={14} />{labelScanError}</div>}
              {hasApplianceDetails && (
                <div className="label-fields">
                  <div className="label-fields-note"><Check size={14} /> Review and edit the extracted details before continuing.</div>
                  {applianceDetailFields.map(({ key, label, placeholder }) => (
                    <label className="label-field" key={key}>
                      <span>{label}</span>
                      <div className="label-field-input">
                        <input
                          value={applianceDetails[key] ?? ''}
                          onChange={(event) => updateApplianceDetail(key, event.target.value)}
                          placeholder={placeholder}
                          maxLength={key === 'serialNumber' ? 160 : key === 'approximateAge' ? 80 : 120}
                        />
                        {applianceDetails[key] && (
                          <button type="button" onClick={() => updateApplianceDetail(key, '')} aria-label={`Delete ${label}`}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {!isSignedIn && (
              <div className="mb-5 p-4 bg-[#f8faf5] border border-[#cad8d2] rounded-xl flex gap-3 items-start">
                <ShieldCheck size={20} className="text-[#29705f] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-[0.8rem] font-bold text-[#17232d] mb-1">Privacy check</h4>
                  <p className="text-[0.75rem] text-[#536671] leading-relaxed">
                     Sign in to upload your evidence and receive your repair diagnosis. Your draft and locally selected evidence stay in this browser while you sign in.
                  </p>
                </div>
              </div>
            )}

             {showAuthGate && !isSignedIn && (
               <div className="auth-gate" role="alert" data-testid="panel-auth-gate">
                 <div className="auth-gate-icon"><LockKeyhole size={18} /></div>
                 <div className="auth-gate-copy">
                   <strong>One quick sign-in before your answer</strong>
                   <p>Sign in to upload your evidence and receive your repair diagnosis.</p>
                   <span>Your draft and locally selected evidence stay in this browser while you sign in.</span>
                   <div className="auth-gate-actions">
                     <button type="button" className="auth-gate-primary" onClick={() => { trackEvent('auth_cta_selected', { action: 'sign_in', location: 'diagnosis_auth_gate' }); setLocation('/sign-in'); }}>Sign in</button>
                     <button type="button" className="auth-gate-secondary" onClick={() => { trackEvent('auth_cta_selected', { action: 'create_account', location: 'diagnosis_auth_gate' }); setLocation('/sign-up'); }}>Create a free account</button>
                   </div>
                 </div>
               </div>
             )}

             <button type="submit" className="submit-button" aria-describedby="submit-help" disabled={!itemType || !symptom.trim() || !safetyReady || !coverageComplete || diagnosis.isPending || uploadRequest.isPending || Boolean(localFile && !media && hasStartedDraftUpload && !uploadError)} data-testid="button-submit-diagnosis">
               {diagnosis.isPending ? <><LoaderCircle size={17} className="animate-spin" />Reading the clues…</> : <>Get my diagnosis <ArrowRight size={17} /></>}
            </button>
             <p id="submit-help" className="field-help">{!itemType || !symptom.trim() ? 'Choose an item and describe the problem.' : !safetyReady ? 'Complete the safety check before continuing.' : !coverageComplete ? 'Answer each cover question before continuing.' : !isSignedIn ? 'You can review the value first. Sign-in is only needed to upload evidence and receive your diagnosis.' : 'Your answer will be checked against the safety guidance.'}</p>
             <p className="ai-limitations"><ShieldCheck size={14} aria-hidden="true" /> FixMate offers guidance, not a safety decision. Stop and contact a qualified professional if anything is dangerous or unclear.</p>
            <div className="footnote"><ShieldCheck size={12} /> {isSignedIn ? 'Your diagnosis is linked to your secure account' : 'No credit card required'}</div>

            {diagnosis.isError && (
              <div className="error-box" role="alert" data-testid="status-diagnosis-error">
                <AlertTriangle size={17} />
                <p>{diagnosisError ?? "We couldn't get a read on that just now. Your details are still here — give it another try."}</p>
                <button type="button" onClick={(e) => { e.preventDefault(); submit({ preventDefault: () => {} } as FormEvent<HTMLFormElement>); }} data-testid="button-retry-diagnosis">Retry</button>
              </div>
            )}
          </form>

          <aside className="side-panel" aria-live="polite">
            {isResultLoading ? (
              <div
                className="loading-content"
                data-testid="status-diagnosis-loading"
                role="status"
                aria-label={diagnosis.isPending ? 'Generating diagnosis' : 'Loading saved diagnosis'}
              >
                <div className="loading-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-box" />
                <p className="loading-copy">
                  {diagnosis.isPending
                    ? 'Looking for the most likely explanation, not every possible one.'
                    : 'Loading your latest saved repair plan.'}
                </p>
              </div>
            ) : displayedResult ? (
              <div className="result-content" data-testid="panel-diagnosis-result">
                <div className="result-header">
                  <div>
                    <div className="result-label">Your first answer</div>
                    <h2>{displayedResult.headline}</h2>
                  </div>
                  <div className="result-id">#{displayedResult.id.slice(-5)}</div>
                </div>
                <div className="problem-card">
                  <div className="problem-card-label">Likely problem</div>
                  <p data-testid="text-likely-problem">{interactiveResult?.likelyProblem}</p>
                </div>
                 <section className="post-diagnosis-choice" aria-labelledby="post-diagnosis-heading" data-testid="panel-post-diagnosis-choice">
                   <div className="problem-card-label">Choose your next move</div>
                   <h3 id="post-diagnosis-heading">What would you like to do next?</h3>
                   <div className="post-diagnosis-options">
                     <button type="button" className="post-diagnosis-option diy" onClick={() => {
                       trackEvent('diagnosis_next_step_selected', { choice: 'self_repair' });
                       document.getElementById('parts-tools-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     }} data-testid="button-self-repair">
                       <Wrench size={17} />
                       <span><strong>I want to fix it myself</strong><small>Use the parts, tools, and safe next-step checklist.</small></span>
                       <ArrowRight size={15} />
                     </button>
                     <button type="button" className="post-diagnosis-option professional" onClick={() => openProfessionalHandoff(displayedResult, true)} data-testid="button-find-local-repairer">
                       <HardHat size={17} />
                       <span><strong>Find a local repairer</strong><small>Get quotes from repairers who understand the problem.</small></span>
                       <ArrowRight size={15} />
                     </button>
                   </div>
                 </section>
                {displayedResult.applianceDetails && Object.values(displayedResult.applianceDetails).some(Boolean) && (
                  <div className="label-result-card" data-testid="panel-appliance-details">
                    <div className="problem-card-label">Appliance details</div>
                    <div className="label-result-grid">
                      {applianceDetailFields.map(({ key, label }) => displayedResult.applianceDetails?.[key] ? (
                        <div key={key} className="label-result-value">
                          <span>{label}</span>
                          <strong>{displayedResult.applianceDetails[key]}</strong>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}
                <div className="causes-card" data-testid="panel-possible-causes">
                  <div className="problem-card-label">Possible causes</div>
                  <div className="cause-block">
                    <strong>Most likely cause</strong>
                    <p>{interactiveResult?.likelyProblem}</p>
                  </div>
                  {interactiveResult?.otherPossibleCauses?.length ? (
                    <div className="cause-block">
                      <strong>Other plausible causes</strong>
                      <ul>{interactiveResult.otherPossibleCauses.map((cause, index) => <li key={`${cause}-${index}`}>{cause}</li>)}</ul>
                    </div>
                  ) : null}
                  {displayedResult.distinguishingEvidence?.length ? (
                    <div className="cause-block">
                      <strong>Evidence that would distinguish them</strong>
                      <ul>{displayedResult.distinguishingEvidence.map((evidence, index) => <li key={`${evidence}-${index}`}>{evidence}</li>)}</ul>
                    </div>
                  ) : null}
                  {displayedResult.professionalInspection && (
                    <div className="cause-block inspection-note">
                      <strong>When professional inspection is required</strong>
                      <p>{displayedResult.professionalInspection}</p>
                    </div>
                  )}
                </div>
                <section className="diagnosis-checklist" aria-labelledby="checklist-heading">
                  <div className="problem-card-label">Interactive check</div>
                  <h3 id="checklist-heading">Answer a few quick questions</h3>
                  <p className="checklist-intro">Each answer narrows the likely cause and changes the next safest step.</p>
                  {diagnosisChecklistQuestions.map(({ key, question }) => (
                    <div className="checklist-question" key={key}>
                      <strong>{question}</strong>
                      <div className="checklist-options" role="group" aria-label={question}>
                        {(['yes', 'no', 'unsure'] as ChecklistAnswer[]).map((answer) => (
                          <button
                            type="button"
                            key={answer}
                            className={checklistAnswers[key] === answer ? 'selected' : ''}
                            aria-pressed={checklistAnswers[key] === answer}
                            onClick={() => answerChecklist(key, answer)}
                          >
                            {answer === 'unsure' ? 'Not sure' : answer === 'yes' ? 'Yes' : 'No'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(checklistAnswers).length > 0 && (
                    <button type="button" className="checklist-reset" onClick={() => {
                      setChecklistAnswers({});
                      if (displayedResultId) localStorage.removeItem(`fixmate_checklist_${displayedResultId}`);
                    }}>
                      Reset answers
                    </button>
                  )}
                </section>
                <div className={`evidence-card ${displayedResult.mediaAnalysed ? 'analysed' : ''}`} data-testid="panel-media-evidence">
                  <div className="problem-card-label">{displayedResult.mediaAnalysed ? 'Media evidence used' : 'Media evidence'}</div>
                  {displayedResult.mediaEvidence.length ? (
                    <ul>{displayedResult.mediaEvidence.map((clue, index) => <li key={`${clue}-${index}`}>{clue}</li>)}</ul>
                  ) : (
                    <p>{displayedResult.mediaAnalysed ? 'The file was inspected, but it did not add a reliable clue to this result.' : 'This result is based on your written description only.'}</p>
                  )}
                  {displayedResult.audioEvidence.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#dce5df]">
                      <strong className="block mb-2">Sound evidence (supporting only)</strong>
                      <ul>{displayedResult.audioEvidence.map((clue, index) => <li key={`${clue}-${index}`}>{clue}</li>)}</ul>
                      <p className="text-xs text-[#536671] mt-2">A recording can support a diagnosis, but it cannot confirm the fault on its own.</p>
                    </div>
                  )}
                </div>
                {(displayedResult.errorCode || displayedResult.errorCodeMeaning || displayedResult.errorCodeSafeChecks.length > 0) && (
                  <div className="evidence-card" data-testid="panel-error-code">
                    <div className="problem-card-label">Error-code lookup{displayedResult.errorCode ? ` · ${displayedResult.errorCode}` : ''}</div>
                    {displayedResult.errorCodeMeaning && <p><strong>Likely meaning:</strong> {displayedResult.errorCodeMeaning}</p>}
                    {displayedResult.errorCodeSafeChecks.length > 0 && (
                      <div className="cause-block">
                        <strong>Safe checks</strong>
                        <ul>{displayedResult.errorCodeSafeChecks.map((check, index) => <li key={`${check}-${index}`}>{check}</li>)}</ul>
                      </div>
                    )}
                    {displayedResult.errorCodeResetAdvice && <p><strong>Reset guidance:</strong> {displayedResult.errorCodeResetAdvice}</p>}
                    {displayedResult.errorCodeProfessionalNeeded && <p><strong>When to call a professional:</strong> {displayedResult.errorCodeProfessionalNeeded}</p>}
                    {displayedResult.errorCodeCommonParts.length > 0 && <p><strong>Common parts involved:</strong> {displayedResult.errorCodeCommonParts.join(', ')}</p>}
                  </div>
                )}
                <section className="parts-tools-card" aria-labelledby="parts-tools-heading">
                  <div className="problem-card-label">Repair planning</div>
                  <h3 id="parts-tools-heading">Parts and tools checklist</h3>
                  <div className="parts-tools-grid">
                    <div>
                      <strong>Likely parts needed</strong>
                      {displayedResult.partsNeeded.length ? <ul>{displayedResult.partsNeeded.map((part, index) => <li key={`${part}-${index}`}>{part}</li>)}</ul> : <p>No specific part can be identified confidently yet.</p>}
                    </div>
                    <div>
                      <strong>Required tools</strong>
                      {displayedResult.requiredTools.length ? <ul>{displayedResult.requiredTools.map((tool, index) => <li key={`${tool}-${index}`}>{tool}</li>)}</ul> : <p>Check the appliance manual before choosing tools.</p>}
                    </div>
                  </div>
                  <p className="parts-price"><strong>Approximate parts price:</strong> £{displayedResult.partsCostMin}–£{displayedResult.partsCostMax}. This is an estimate, not a retailer listing.</p>
                  <p><strong>DIY suitability:</strong> {displayedResult.diySuitability === 'yes' ? 'Suitable for a careful DIY repair' : displayedResult.diySuitability === 'with_caution' ? 'Possible with caution and the right experience' : 'Not suitable for DIY; use a qualified professional'}</p>
                  {displayedResult.professionalParts.length > 0 && (
                    <div className="professional-parts"><strong>Professional-only parts or fitting</strong><ul>{displayedResult.professionalParts.map((part, index) => <li key={`${part}-${index}`}>{part}</li>)}</ul></div>
                  )}
                  <p className="no-retailer-links">FixMate does not link to retailers here. Check compatibility, availability, price, and any affiliate disclosure before buying.</p>
                </section>
                <section className="coverage-guidance" aria-labelledby="coverage-guidance-heading">
                  <div className="problem-card-label">Before paid repair</div>
                  <h3 id="coverage-guidance-heading">{displayedResult.coverageGuidance.heading}</h3>
                  <ol>{displayedResult.coverageGuidance.nextSteps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol>
                </section>
                <div className="confidence">
                  <div className="confidence-top"><span>Confidence in this read</span><strong>{Math.round(displayedResult.confidence)}%</strong></div>
                  <div className="confidence-track"><div className="confidence-fill" style={{ width: `${Math.min(100, Math.max(0, displayedResult.confidence))}%` }} /></div>
                </div>
                <div className="result-stats">
                  <div className="stat"><span className="stat-label">Repair estimate</span><strong className="stat-value">£{displayedResult.repairCostMin}–£{displayedResult.repairCostMax}</strong></div>
                  <div className="stat"><span className="stat-label">Parts estimate</span><strong className="stat-value">£{displayedResult.partsCostMin}–£{displayedResult.partsCostMax}</strong></div>
                  {needsProfessional && (
                    <div className="stat" style={{ gridColumn: '1 / -1' }}>
                      <span className="stat-label text-[#8a9b97]">Note</span>
                      <strong className="stat-value text-[#70817f]" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        Estimates are indicative only — professional inspection needed
                      </strong>
                    </div>
                  )}
                  <div className="stat"><span className="stat-label">Difficulty</span><strong className="stat-value">{displayedResult.difficulty}</strong></div>
                  <div className="stat"><span className="stat-label">Item</span><strong className="stat-value">{displayedResult.itemType}</strong></div>
                </div>
                <div className={`safety ${displayedResult.safetyLevel}`} data-testid="status-safety-note">
                  {displayedResult.safetyLevel === 'professional' ? <HardHat size={17} /> : displayedResult.safetyLevel === 'caution' ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}
                  <div><strong>{displayedResult.safetyLevel === 'professional' ? 'Best left to a professional' : displayedResult.safetyLevel === 'caution' ? 'A little caution first' : 'Looks safe to explore'}</strong><p>{displayedResult.safetyNote}</p></div>
                </div>
                <div className="next-steps">
                  <div className="next-heading">Your next steps</div>
                   <ul className="next-list">{interactiveResult?.nextSteps.map((step, index) => <li key={`${step}-${index}`} data-testid={`text-next-step-${index}`}>{step}</li>)}</ul>
                </div>
                <div className="result-actions">
                  <button type="button" className="secondary-button" onClick={() => copyDetails(displayedResult)} data-testid="button-copy-diagnosis">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? 'Copied' : 'Copy details'}</button>
                   <button type="button" className={`secondary-button ${needsProfessional ? 'primary-small' : ''}`} onClick={() => openProfessionalHandoff(displayedResult)} data-testid="button-find-professional">
                    <HardHat size={14} />{needsProfessional ? 'Connect with a professional' : 'Find someone to fix it'}
                  </button>
                </div>
                 {isSignedIn && (
                   <section className="expert-panel" aria-labelledby="expert-heading">
                     <div className="expert-heading">
                       <div>
                         <div className="problem-card-label">Private follow-up</div>
                         <h3 id="expert-heading">FixMate Expert</h3>
                       </div>
                       <Wrench size={18} aria-hidden="true" />
                     </div>
                     <p className="expert-context">Ask about this {displayedResult.itemType} diagnosis, its next steps, or the safety advice above.</p>
                     <div className="expert-messages" aria-live="polite">
                       {assistantTurns.map((turn, index) => (
                         <div className={`expert-message ${turn.role}`} key={`${turn.role}-${index}`}>
                           <span>{turn.role === 'user' ? 'You' : 'FixMate Expert'}</span>
                           <p>{turn.content}</p>
                         </div>
                       ))}
                       {assistant.isPending && <div className="expert-pending" role="status"><LoaderCircle size={14} className="animate-spin" /> Reviewing this diagnosis…</div>}
                     </div>
                     {assistant.isError && (
                       <div className="expert-error" role="alert">
                         <AlertTriangle size={14} /> We couldn’t answer that just now. Please try again.
                       </div>
                     )}
                     {assistantSafety && (
                       <div className={`expert-safety expert-safety-${assistantSafety}`} role="status">
                         {assistantSafety === 'professional' ? <HardHat size={12} /> : assistantSafety === 'caution' ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                         {assistantSafety === 'professional' ? 'This follow-up recommends a qualified professional.' : assistantSafety === 'caution' ? 'Take care and follow the diagnosis safety note.' : 'This follow-up is marked safe to explore.'}
                       </div>
                     )}
                     <form className="expert-form" onSubmit={askAssistant}>
                       <label htmlFor="expert-question" className="sr-only">Ask FixMate Expert about this diagnosis</label>
                       <input id="expert-question" value={assistantQuestion} maxLength={500} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="What should I check next?" disabled={assistant.isPending} />
                       <button type="submit" aria-label="Ask FixMate Expert" disabled={assistant.isPending || assistantQuestion.trim().length < 2}><Send size={15} /></button>
                     </form>
                     <p className="expert-safety"><ShieldCheck size={12} /> Expert guidance follows this diagnosis. Always follow the safety note and use a professional when advised.</p>
                   </section>
                 )}
                 <div className="mt-6 p-4 rounded-xl border border-[#dcece6] bg-[#f4f9f7] flex items-start gap-3">
                   <div className="mt-0.5 text-[#2d7967]"><HardHat size={18} /></div>
                   <div>
                     <strong className="block text-[#17232d] text-[0.8rem] mb-1">Take FixMate on the go</strong>
                     <p className="text-[0.75rem] text-[#536671] mb-2">Get the FixMate Plus mobile app for instant camera access and follow-up questions.</p>
                     <a href="/fixmate-mobile/plus" onClick={() => trackEvent('mobile_plus_promotion_clicked')} className="text-[0.75rem] font-bold text-[#2d7967] hover:text-[#1e5447]">
                       Learn more about Plus &rarr;
                     </a>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="empty-content" data-testid="panel-empty-diagnosis">
                <div className="empty-icon"><Lightbulb size={25} /></div>
                <h2>A clear next step is closer than it feels.</h2>
                <p className="side-intro">FixMate starts with the clues you can see, then gives you the practical version: what it might be, what it could cost, and what to do next.</p>
                <div className="steps">
                  <div className="step"><span className="step-number">01</span><div><strong>Take a photo</strong><span>Show the fault, label, leak, light, or damage.</span></div></div>
                  <div className="step"><span className="step-number">02</span><div><strong>Get safe guidance</strong><span>Understand the likely issue and the safest next step.</span></div></div>
                  <div className="step"><span className="step-number">03</span><div><strong>Find parts or a repairer</strong><span>Know what to buy, try, or hand off locally.</span></div></div>
                </div>
                <div className="sample-result" aria-label="Example diagnosis result">
                  <div className="sample-result-top"><span>Example answer</span><span>Medium confidence</span></div>
                  <strong>Dishwasher is not draining</strong>
                  <p>Likely cause: a blocked filter or drain path.</p>
                  <div className="sample-result-next"><ShieldCheck size={14} aria-hidden="true" /> Safe next step: switch it off before checking.</div>
                </div>
                <div className="side-footer"><span>Built for the first five minutes</span><span>FIXMATE / 01</span></div>
              </div>
            )}
          </aside>
        </div>

        <section className="growth-callouts" aria-label="FixMate features">
          <div className="growth-callout">
            <div className="growth-callout-icon"><Share2 size={18} aria-hidden="true" /></div>
            <div>
              <div className="problem-card-label">Share with control</div>
              <h2>Keep a private repair report for your engineer</h2>
              <p>Save the useful diagnosis details to your FixMate inventory, then choose exactly what to share. Reports are owner-approved and can expire.</p>
            </div>
            <Link href="/inventory" className="growth-callout-link" onClick={() => trackEvent('repair_report_cta_clicked', { location: 'homepage' })}>
              See private reports <ArrowRight size={15} />
            </Link>
          </div>
          <div className="growth-callout growth-callout-soft">
            <div className="growth-callout-icon"><ShieldCheck size={18} aria-hidden="true" /></div>
            <div>
              <div className="problem-card-label">Built for the first five minutes</div>
              <h2>Start with safe information, not guesswork</h2>
              <p>FixMate asks a safety check before evidence is analysed and clearly flags when a qualified professional should take over.</p>
            </div>
            <Link href="/about" className="growth-callout-link" onClick={() => trackEvent('about_cta_clicked', { action: 'homepage_callout' })}>
              How FixMate works <ArrowRight size={15} />
            </Link>
          </div>
        </section>

         {showHandoff && result && (
          <section id="professional-handoff" className="handoff" data-testid="panel-professional-handoff">
            <div>
              <h3>Find a local repairer.</h3>
              <p>Get quotes from repairers who understand the problem. We’ll carry your diagnosis summary into the job form so you do not have to start again.</p>
            </div>
            <div className="handoff-cta"><button type="button" className="handoff-button" onClick={() => setShowHandoff((visible) => !visible)} data-testid="button-close-handoff"><X size={15} />Close handoff</button></div>
            <div className="handoff-detail">
              <p><Check size={14} /> Your diagnosis details are ready to share. Add a postcode when you're ready to look nearby.</p>
              <form style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="zip" className="sr-only">Postcode</label>
                <input id="zip" className="zip-input" placeholder="e.g. SW1A 1AA" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                <Link href="/marketplace" className="handoff-submit handoff-button" style={{ background: '#29705f' }} onClick={() => {
                  try {
                    sessionStorage.setItem('fixmate_marketplace_draft', JSON.stringify({
                      diagnosisId: result.id,
                      title: `${result.itemType} repair`,
                      itemType: result.itemType,
                      description: `${result.headline}\n\nMost likely cause: ${result.likelyProblem}${result.applianceDetails ? `\n\nAppliance details: ${Object.entries(result.applianceDetails).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(', ')}` : ''}`,
                      postcode,
                    }));
                  } catch (e) {}
                  trackEvent('handoff_continuation', { has_postcode: Boolean(postcode) });
                }}>
                  Continue to marketplace <ArrowRight size={14} />
                </Link>
              </form>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityPreferencesProvider>
       <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <SeoManager />
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/app" component={Home} />
                <Route path="/marketplace" component={Marketplace} />
                <Route path="/privacy" component={PrivacyPage} />
                <Route path="/delete-account" component={DeleteAccountPage} />
                <Route path="/terms" component={TermsPage} />
                <Route path="/contact" component={ContactPage} />
                <Route path="/help" component={HelpPage} />
                <Route path="/about" component={AboutPage} />
                <Route path="/demo" component={DemoPage} />
                <Route path="/repair-guides/:slug" component={RepairGuidePage} />
                <Route path="/notifications" component={NotificationsPage} />
                <Route path="/inventory" component={InventoryPage} />
                <Route path="/inventory/:itemId" component={InventoryDetailPage} />
                <Route path="/repair-report/:reportId" component={RepairReportPage} />
                <Route path="/sign-in">
                  <div className="auth-page">
                    <div className="auth-page-inner">
                      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
                    </div>
                  </div>
                </Route>
                <Route path="/sign-in/*">
                  <div className="auth-page">
                    <div className="auth-page-inner">
                      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
                    </div>
                  </div>
                </Route>
                <Route path="/sign-up">
                  <div className="auth-page">
                    <div className="auth-page-inner">
                      <div className="privacy-line"><ShieldCheck size={14}/> We keep your repair details secure</div>
                      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
                    </div>
                  </div>
                </Route>
                <Route path="/sign-up/*">
                  <div className="auth-page">
                    <div className="auth-page-inner">
                      <div className="privacy-line"><ShieldCheck size={14}/> We keep your repair details secure</div>
                      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
                    </div>
                  </div>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </WouterRouter>
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
       </ClerkProvider>
      </AccessibilityPreferencesProvider>
    </ErrorBoundary>
  );
}

function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const path = location.split('?')[0] || '/';
    const metadata = routeMetadata[path];
    if (!metadata || path.startsWith('/repair-guides/')) return;
    setPageMetadata({ ...metadata, path: path === '/app' ? '/' : path });
  }, [location]);

  return null;
}

export default App;
