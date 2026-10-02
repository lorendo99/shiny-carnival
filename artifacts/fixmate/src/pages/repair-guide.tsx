import { useEffect } from 'react';
import { ArrowRight, Check, ShieldCheck, Wrench } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { trackEvent } from '@/lib/analytics';
import { getRepairGuide } from '@/data/repairGuides';
import { captureCampaignAttribution } from '@/lib/attribution';
import { setPageMetadata } from '@/lib/seo';

export default function RepairGuidePage() {
  const [, params] = useRoute('/repair-guides/:slug');
  const guide = getRepairGuide(params?.slug);

  useEffect(() => {
    if (!guide) return;
    const attribution = captureCampaignAttribution();
    if (attribution && !sessionStorage.getItem('fixmate_attribution_tracked')) {
      trackEvent('campaign_attribution_captured', attribution);
      sessionStorage.setItem('fixmate_attribution_tracked', 'true');
    }
    setPageMetadata({
      title: guide.title,
      description: guide.metaDescription,
      path: `/repair-guides/${guide.slug}`,
    });
    trackEvent('repair_guide_viewed', { guide: guide.slug });
  }, [guide]);

  if (!guide) {
    return (
      <main className="fixmate-shell guide-not-found">
        <h1>Repair guide not found</h1>
        <Link href="/" className="guide-button">Start a diagnosis <ArrowRight size={16} /></Link>
      </main>
    );
  }

  return (
    <div className="fixmate-app guide-page">
      <header className="fixmate-shell guide-topbar">
        <Link href="/" className="brand"><span className="brand-mark"><Wrench size={17} strokeWidth={2.5} /></span><span>fixmate</span></Link>
        <Link href="/app" className="guide-header-link">Start a diagnosis <ArrowRight size={14} /></Link>
      </header>
      <main className="fixmate-shell guide-shell">
        <div className="guide-hero">
          <div className="eyebrow"><span className="eyebrow-line" /> {guide.eyebrow}</div>
          <h1>{guide.heading}</h1>
          <p>{guide.intro}</p>
          <Link
            href={`/app?guide=${guide.slug}`}
            className="guide-button"
            onClick={() => trackEvent('repair_guide_cta_clicked', { guide: guide.slug })}
          >
            Diagnose this problem <ArrowRight size={16} />
          </Link>
        </div>

        <div className="guide-grid">
          <section className="guide-card">
            <div className="guide-card-label">What may be happening</div>
            <h2>Common clues</h2>
            <ul className="guide-list">
              {guide.causes.map((cause) => <li key={cause}><Check size={16} />{cause}</li>)}
            </ul>
          </section>
          <section className="guide-card guide-card-green">
            <div className="guide-card-label">Start safely</div>
            <h2>Useful checks before calling</h2>
            <ol className="guide-list guide-numbered-list">
              {guide.safeSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
            </ol>
          </section>
        </div>

        <section className="guide-warning">
          <ShieldCheck size={20} />
          <div><strong>Safety comes first</strong><p>{guide.warning}</p></div>
        </section>

        <section className="guide-cta">
          <div>
            <div className="guide-card-label">Get a clearer next step</div>
            <h2>Describe the clues and add a photo if you can.</h2>
            <p>FixMate can explain the likely problem, estimate parts and repair costs, and help you decide whether to fix it yourself or find a local repairer.</p>
          </div>
          <Link href={`/app?guide=${guide.slug}`} className="guide-button light" onClick={() => trackEvent('repair_guide_cta_clicked', { guide: guide.slug, location: 'bottom' })}>
            Start with FixMate <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
}