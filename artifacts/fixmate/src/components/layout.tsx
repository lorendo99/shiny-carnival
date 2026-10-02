import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Show, useUser, useClerk } from '@clerk/react';
import { Wrench, BriefcaseBusiness, UserRound, LogOut, Bell, HelpCircle, Info, Accessibility } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useAccessibilityPreferences } from '@/lib/accessibility';
import { useListNotifications, getListNotificationsQueryKey } from '@workspace/api-client-react';

export function Header() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const notifications = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      enabled: !!isSignedIn,
      refetchInterval: 30000,
    }
  });
  
  const hasUpdates = (notifications.data?.length || 0) > 0;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const { largerText, simpleLanguage, setLargerText, setSimpleLanguage } = useAccessibilityPreferences();

  return (
    <header className="fixmate-shell topbar">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Link href="/" className="brand" data-testid="text-brand">
        <span className="brand-mark" aria-hidden="true"><Wrench size={17} strokeWidth={2.5} /></span>
        <span>fixmate</span>
      </Link>
      <details className="accessibility-menu">
        <summary aria-label="Open accessibility options"><Accessibility size={15} /> <span className="hidden sm:inline">Accessibility</span></summary>
        <div className="accessibility-menu-panel">
          <strong>Accessibility options</strong>
          <label><input type="checkbox" checked={largerText} onChange={(event) => setLargerText(event.target.checked)} /> Larger text</label>
          <label><input type="checkbox" checked={simpleLanguage} onChange={(event) => setSimpleLanguage(event.target.checked)} /> Simple language</label>
          <p>Reduced motion follows your device setting.</p>
        </div>
      </details>
      <Show when="signed-out">
        <div className="auth-actions">
           <Link href="/about" className="account-button header-secondary-link"><Info size={14} aria-hidden="true" />About</Link>
           <Link href="/demo" className="account-button header-secondary-link">Demo</Link>
            <Link href="/help" className="account-button header-secondary-link"><HelpCircle size={14} aria-hidden="true" />Help</Link>
          <button type="button" className="auth-link" onClick={() => { trackEvent('auth_cta_selected', { action: 'sign_in', location: 'header' }); setLocation('/sign-in'); }}>Sign in</button>
          <button type="button" className="auth-link primary" onClick={() => { trackEvent('auth_cta_selected', { action: 'create_account', location: 'header' }); setLocation('/sign-up'); }}>Create account</button>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="auth-actions">
          <Link href="/notifications" className="account-button relative">
            <Bell size={14} />
            <span className="hidden sm:inline">Updates</span>
            {hasUpdates && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f2b94b] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#c48527]"></span></span>}
          </Link>
          <Link href="/help" className="account-button">
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Help</span>
          </Link>
          <button type="button" className="account-button" onClick={() => setLocation('/marketplace')}><BriefcaseBusiness size={14} /><span className="hidden sm:inline">Repair jobs</span></button>
          <span className="account-name hidden md:inline-flex"><UserRound size={14} /> {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Your account'}</span>
          <button type="button" className="account-button" onClick={() => { trackEvent('account_signed_out'); signOut({ redirectUrl: basePath || '/' }); }}><LogOut size={14} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </Show>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="fixmate-shell flex flex-col md:flex-row justify-between items-center py-8 border-t border-[#dfe5df] mt-auto gap-4">
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm font-bold text-[#536671]">
        <Link href="/about" className="hover:text-[#c48527] transition-colors">About</Link>
        <Link href="/demo" className="hover:text-[#c48527] transition-colors">Demo</Link>
        <Link href="/privacy" className="hover:text-[#c48527] transition-colors">Privacy & Data</Link>
        <Link href="/delete-account" className="hover:text-[#c48527] transition-colors">Delete Account</Link>
        <Link href="/terms" className="hover:text-[#c48527] transition-colors">Terms & Conditions</Link>
        <Link href="/help" className="hover:text-[#c48527] transition-colors">Help Center</Link>
        <Link href="/contact" className="hover:text-[#c48527] transition-colors">Contact Us</Link>
      </div>
      <div className="text-xs text-[#8a9b97] font-mono uppercase tracking-widest">&copy; {new Date().getFullYear()} FixMate</div>
    </footer>
  );
}
