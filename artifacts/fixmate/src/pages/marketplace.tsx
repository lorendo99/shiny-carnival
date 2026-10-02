import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useConfirmRepairPayment,
  useCancelRepairPayment,
  useGetEngineerProfile,
  useRegisterEngineer,
  getGetEngineerProfileQueryKey,
  getListRepairJobsQueryKey,
  getListRepairQuotesQueryKey,
} from '@workspace/api-client-react';
import { ArrowLeft, Check, Wrench, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { trackEvent } from '@/lib/analytics';
import { CustomerView } from '../components/marketplace/CustomerView';
import { EngineerView } from '../components/marketplace/EngineerView';
import { MarketplaceModerationQueue } from '../components/marketplace/MarketplaceModerationQueue';

export default function Marketplace() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'customer' | 'engineer'>('customer');
  const profile = useGetEngineerProfile();
  const register = useRegisterEngineer();
  const confirmPayment = useConfirmRepairPayment();
  const cancelPayment = useCancelRepairPayment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paymentState = params.get('repair_payment');
    const quoteId = params.get('quote_id');
    const payoutSetup = params.get('payout_setup');

    if (payoutSetup) {
      queryClient.invalidateQueries({ queryKey: getGetEngineerProfileQueryKey() });
      window.history.replaceState({}, '', '/marketplace');
    }

    if (paymentState === 'cancelled') {
      trackEvent('repair_payment_cancelled');
      window.history.replaceState({}, '', '/marketplace');
      if (quoteId) {
        cancelPayment.mutate({ quoteId }, {
          onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
          }
        });
      }
      return;
    }

    if (paymentState !== 'success' || !sessionId) return;

    trackEvent('payment_confirmation_started');
    confirmPayment.mutate(
      { data: { sessionId } },
      {
        onSuccess: (job) => {
          trackEvent('payment_confirmed');
          window.history.replaceState({}, '', '/marketplace');
          queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
        },
        onError: () => trackEvent('payment_confirmation_failed'),
      }
    );
  // A Stripe session should be confirmed once after redirect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackEvent('marketplace_viewed');
  }, []);

  const submitEngineer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    register.mutate(
      {
        data: {
          displayName: String(form.get('displayName')),
          postcode: String(form.get('postcode')),
          skills: String(form.get('skills')).split(',').map((skill) => skill.trim()).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          trackEvent('engineer_registered', { skills_count: String(form.get('skills')).split(',').filter(Boolean).length });
          queryClient.invalidateQueries({ queryKey: getGetEngineerProfileQueryKey() });
        },
        onError: () => trackEvent('engineer_registration_failed'),
      }
    );
  };

  return (
    <div className="fixmate-app marketplace-page" data-testid="marketplace-page">
      <header className="fixmate-shell topbar">
        <button className="market-back" data-testid="button-back-to-fixmate" onClick={() => navigate('/app')}><ArrowLeft size={16} /> Back to FixMate</button>
        <div className="brand"><span className="brand-mark"><Wrench size={17} /></span><span>fixmate jobs</span></div>
      </header>
      <main className="fixmate-shell market-shell">
        {confirmPayment.isPending && <div className="payment-banner" data-testid="status-payment-confirming">Confirming your secure payment…</div>}
        {confirmPayment.isSuccess && <div className="payment-banner success" data-testid="status-payment-confirmed"><Check size={15} />Payment confirmed. The worker can start; their 85% payout is released after you confirm completion.</div>}
        {confirmPayment.isError && <div className="payment-banner error" data-testid="status-payment-error">We could not confirm that payment. No job status was changed.</div>}

        {cancelPayment.isPending && <div className="payment-banner" data-testid="status-payment-cancelling">Cancelling payment session…</div>}
        {cancelPayment.isSuccess && <div className="payment-banner success" data-testid="status-payment-cancelled"><Check size={15} />Payment session cancelled. The job is open for offers again.</div>}
        {cancelPayment.isError && <div className="payment-banner error" data-testid="status-payment-cancel-error"><XCircle size={15} />Failed to cancel payment session properly.</div>}

        <section className="market-hero" data-testid="marketplace-hero">
          <div className="market-hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" />Local jobs, done properly</div>
            <h1>Get the job done.<br /><em>With someone nearby.</em></h1>
            <p>Post what needs doing, compare clear offers from verified local workers, and keep every message, payment and progress update in FixMate.</p>
          </div>
          <div className="market-tabs">
            <button data-testid="button-mode-customer" aria-pressed={view === 'customer'} onClick={() => { setView('customer'); trackEvent('marketplace_mode_selected', { mode: 'customer' }); }}>I need a worker</button>
            <button data-testid="button-mode-worker" aria-pressed={view === 'engineer'} onClick={() => { setView('engineer'); trackEvent('marketplace_mode_selected', { mode: 'engineer' }); }}>I’m a worker</button>
          </div>
        </section>
        <section className="market-lifecycle" aria-label="How FixMate jobs work" data-testid="marketplace-lifecycle">
          {[
            ['01', 'Post a job'],
            ['02', 'Get offers'],
            ['03', 'Choose a worker'],
            ['04', 'Track progress'],
            ['05', 'Mark complete'],
          ].map(([number, label]) => (
            <div className="market-lifecycle-step" key={number}>
              <b>{number}</b><span>{label}</span>
            </div>
          ))}
        </section>
        <div className="market-safety-guidance">
          <strong>Marketplace safety</strong>
          <span>Keep payments and contact details in FixMate. Never send deposits or bank details. Report unsafe, abusive, or suspicious content and block participants when needed.</span>
        </div>
        <MarketplaceModerationQueue />

        {view === 'customer' ? (
          <CustomerView />
        ) : !profile.data ? (
          <form className="panel market-form engineer-register" onSubmit={submitEngineer}>
            <div className="market-heading"><Wrench size={18} /><div><strong>Join as a local worker</strong><span>Build a verified profile and find jobs you can do well.</span></div></div>
            <label>Public name<input data-testid="input-worker-name" name="displayName" required minLength={2} maxLength={80} placeholder="Alex Repairs" /></label>
            <label>Your postcode<input data-testid="input-worker-postcode" name="postcode" required minLength={3} maxLength={8} placeholder="M1 1AE" /></label>
            <label>Skills and services<input data-testid="input-worker-skills" name="skills" required placeholder="Appliances, plumbing, electronics" /></label>
            <button data-testid="button-register-worker" className="submit-button" disabled={register.isPending}>{register.isPending ? 'Creating profile…' : 'Create worker profile'}</button>
          </form>
        ) : (
          <EngineerView profile={profile.data} />
        )}
      </main>
    </div>
  );
}
