const ATTRIBUTION_KEY = 'fixmate_campaign_attribution';

const attributionKeys = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export type CampaignAttribution = Partial<Record<(typeof attributionKeys)[number], string>>;

export function captureCampaignAttribution(): CampaignAttribution | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const current = attributionKeys.reduce<CampaignAttribution>((values, key) => {
    const value = params.get(key)?.trim();
    if (value) values[key] = value.slice(0, 120);
    return values;
  }, {});

  if (Object.keys(current).length > 0) {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
    return current;
  }

  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    return stored ? JSON.parse(stored) as CampaignAttribution : null;
  } catch {
    return null;
  }
}