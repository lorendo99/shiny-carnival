export const SITE_URL = 'https://fixmate.repair';

export const routeMetadata: Record<string, { title: string; description: string; noindex?: boolean }> = {
  '/': {
    title: 'FixMate | UK home repair guidance and local repairers',
    description: 'Get clear UK home repair guidance, safe appliance checks and realistic repair cost estimates. Prepare a repair job and compare itemised quotes from local repairers.',
  },
  '/app': {
    title: 'Start a repair diagnosis | FixMate',
    description: 'Describe a household repair problem, add evidence, and get cautious next-step guidance from FixMate.',
    noindex: true,
  },
  '/about': {
    title: 'About FixMate | UK household repair guidance',
    description: 'FixMate helps UK households understand likely faults, safety risks, repair costs, and when to use a local professional.',
  },
  '/demo': {
    title: 'See how FixMate works | Repair guidance demo',
    description: 'See how FixMate turns a household repair description into clear safety guidance, likely causes, and practical next steps.',
  },
  '/help': {
    title: 'FixMate Help Center | Repair support',
    description: 'Get help understanding FixMate, repair reports, evidence privacy, quotes, and the next step for a household repair.',
  },
  '/privacy': {
    title: 'Privacy and data | FixMate',
    description: 'Read how FixMate protects repair evidence, account details, reports, and marketplace conversations.',
  },
  '/terms': {
    title: 'Terms and conditions | FixMate',
    description: 'Read the terms for using FixMate repair guidance, private reports, and the local repair marketplace.',
  },
  '/contact': {
    title: 'Contact FixMate',
    description: 'Contact FixMate about account support, repair guidance, privacy, or marketplace questions.',
  },
  '/marketplace': {
    title: 'Find a local repairer | FixMate',
    description: 'Prepare a repair job, compare itemised quotes, and keep engineer conversations private with FixMate.',
    noindex: true,
  },
  '/inventory': {
    title: 'Your repair inventory | FixMate',
    description: 'Keep your saved diagnoses and owner-approved repair reports organised in FixMate.',
    noindex: true,
  },
  '/sign-in': {
    title: 'Sign in | FixMate',
    description: 'Sign in to save diagnoses, upload evidence, and manage private repair reports.',
    noindex: true,
  },
  '/sign-up': {
    title: 'Create your free FixMate account',
    description: 'Create a FixMate account to save repair diagnoses, upload evidence, and prepare private reports.',
    noindex: true,
  },
};

export type PageMetadata = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  const meta = document.querySelector<HTMLMetaElement>(selector) ?? document.createElement('meta');
  meta.setAttribute(attribute, key);
  meta.setAttribute('content', content);
  if (!meta.parentElement) document.head.appendChild(meta);
}

function upsertLink(rel: string, href: string) {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`) ?? document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (!link.parentElement) document.head.appendChild(link);
}

export function setPageMetadata({ title, description, path, noindex = false }: PageMetadata) {
  const canonicalUrl = `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:site_name', 'FixMate');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:card', 'summary');
  upsertLink('canonical', canonicalUrl);
}