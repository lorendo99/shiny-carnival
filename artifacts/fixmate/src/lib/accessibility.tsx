import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AccessibilityPreferences = {
  largerText: boolean;
  simpleLanguage: boolean;
  setLargerText: (enabled: boolean) => void;
  setSimpleLanguage: (enabled: boolean) => void;
};

const AccessibilityContext = createContext<AccessibilityPreferences | null>(null);

function readPreference(key: string) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function AccessibilityPreferencesProvider({ children }: { children: ReactNode }) {
  const [largerText, setLargerTextState] = useState(() => readPreference('fixmate_larger_text'));
  const [simpleLanguage, setSimpleLanguageState] = useState(() => readPreference('fixmate_simple_language'));

  const setLargerText = (enabled: boolean) => {
    setLargerTextState(enabled);
    try {
      window.localStorage.setItem('fixmate_larger_text', String(enabled));
    } catch {
      // Preferences are an enhancement; the default remains usable if storage is unavailable.
    }
  };

  const setSimpleLanguage = (enabled: boolean) => {
    setSimpleLanguageState(enabled);
    try {
      window.localStorage.setItem('fixmate_simple_language', String(enabled));
    } catch {
      // See the note above.
    }
  };

  useEffect(() => {
    document.documentElement.dataset.textScale = largerText ? 'large' : 'normal';
    document.documentElement.dataset.simpleLanguage = simpleLanguage ? 'on' : 'off';
  }, [largerText, simpleLanguage]);

  const value = useMemo(() => ({ largerText, simpleLanguage, setLargerText, setSimpleLanguage }), [largerText, simpleLanguage]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilityPreferences() {
  const value = useContext(AccessibilityContext);
  if (!value) throw new Error('useAccessibilityPreferences must be used inside AccessibilityPreferencesProvider');
  return value;
}