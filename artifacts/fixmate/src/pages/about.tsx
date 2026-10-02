import { useEffect } from 'react';
import { Link } from 'wouter';
import { Header, Footer } from '@/components/layout';
import { 
  Camera, 
  Wrench, 
  HardHat, 
  ShieldCheck, 
  ArrowRight, 
  Lightbulb, 
  ClipboardCheck
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function AboutPage() {
  useEffect(() => {
    document.title = 'About FixMate | The Camera-First Repair Assistant';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'FixMate diagnoses likely faults from photos and videos, explains safety and cost, and connects you with trusted local repair professionals in the UK.');
    }
  }, []);

  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      
      <main className="about-page flex-1">
        <section className="about-hero fixmate-shell">
          <div className="eyebrow"><span className="eyebrow-line" />About FixMate</div>
          <h1>The camera-first<br /><em>repair assistant</em></h1>
          <p>
            Household repairs are messy, unpredictable, and intimidating. FixMate turns the moment something breaks into a clear, actionable plan—helping you understand the fault, estimate costs, and connect with trusted local professionals.
          </p>
          <div className="about-hero-actions">
            <Link href="/sign-up" className="cta-secondary" onClick={() => trackEvent('about_cta_clicked', { action: 'sign_up' })}>
              Get started for free <ArrowRight size={18} />
            </Link>
            <Link href="/marketplace" className="cta-primary" onClick={() => trackEvent('about_cta_clicked', { action: 'post_job' })}>
              Post a repair job
            </Link>
          </div>
          
          <div className="about-stats">
            <div className="about-stat">
              <strong>£0</strong>
              <span>To get a diagnosis</span>
            </div>
            <div className="about-stat">
              <strong>100%</strong>
              <span>Privacy focused</span>
            </div>
            <div className="about-stat">
              <strong>UK</strong>
              <span>Local professionals</span>
            </div>
          </div>
        </section>

        <section className="about-section alt-bg">
          <div className="fixmate-shell about-section-grid">
            <div className="about-section-visual">
              <Camera size={64} strokeWidth={1.5} />
            </div>
            <div className="about-section-content">
              <h2>Show us what’s broken, we’ll do the rest</h2>
              <p>
                Describing a strange noise or a mystery leak over the phone is frustrating. With FixMate, you simply upload a photo or a short video. Our system analyzes visual clues alongside your description to pinpoint the likely cause.
              </p>
              <p>
                Before you call anyone, you’ll know whether it’s a quick DIY fix, a safety hazard that needs immediate attention, or a job for a seasoned professional.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="fixmate-shell">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="eyebrow" style={{justifyContent: 'center'}}><span className="eyebrow-line" />How it works</div>
              <h2 className="mt-4 font-serif text-4xl text-[#17232d] font-medium tracking-tight">From broken to sorted in three steps</h2>
            </div>
            
            <div className="about-features">
              <div className="about-feature">
                <div className="about-feature-icon">
                  <Camera size={24} />
                </div>
                <h3>1. Snap the evidence</h3>
                <p>Upload a photo or up to a 30-second video of the issue. A brief description of what it’s doing (or not doing) gives us the context we need.</p>
              </div>
              <div className="about-feature">
                <div className="about-feature-icon">
                  <Lightbulb size={24} />
                </div>
                <h3>2. Get a grounded plan</h3>
                <p>Receive a plain-English diagnosis outlining the likely fault, a realistic UK cost estimate for parts and labor, and critical safety guidance.</p>
              </div>
              <div className="about-feature">
                <div className="about-feature-icon">
                  <Wrench size={24} />
                </div>
                <h3>3. Connect and fix</h3>
                <p>Hand off your diagnosis to a trusted local professional. Compare itemized quotes, message privately, and pay securely only after you choose.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section alt-bg">
          <div className="fixmate-shell about-section-grid reverse">
            <div className="about-section-visual dark-visual">
              <ShieldCheck size={64} strokeWidth={1.5} />
            </div>
            <div className="about-section-content">
              <div className="trust-badge"><ShieldCheck size={16} /> Honest connections, real trust</div>
              <h2>A marketplace built on transparency</h2>
              <p>
                We believe in genuine connections. While we verify community ratings and monitor marketplace quality, we don't make false claims about formal engineer identity or background checks that don't exist in the wild.
              </p>
              <p>
                Instead, we focus on what matters: clear diagnoses, transparent itemized quoting, upfront time estimates, and secure messaging. You remain in complete control of your privacy and payment.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="fixmate-shell">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="font-serif text-3xl text-[#17232d] font-medium tracking-tight">Built for everyone involved</h2>
            </div>
            
            <div className="about-audiences">
              <div className="about-audience">
                <HardHat />
                <h4>Homeowners & Renters</h4>
                <p>Stop guessing what’s wrong. Get a clear explanation and fair cost estimate before you even speak to a repairer, giving you peace of mind and leverage.</p>
              </div>
              <div className="about-audience">
                <ClipboardCheck />
                <h4>Landlords</h4>
                <p>Manage property maintenance efficiently. Let tenants upload videos of the issue so you can dispatch the right professional with the right parts on the first visit.</p>
              </div>
              <div className="about-audience accent">
                <Wrench />
                <h4>Repair Professionals</h4>
                <p>Ditch the vague job descriptions. Receive detailed diagnoses and visual evidence upfront, allowing you to quote accurately and arrive prepared.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="fixmate-shell">
          <div className="about-cta-banner">
            <h2>Ready to <em>fix it</em> the smart way?</h2>
            <p>Join others getting clearer answers, fairer quotes, and faster repairs without the traditional runaround.</p>
            <div className="about-hero-actions">
              <Link href="/sign-up" className="cta-secondary" onClick={() => trackEvent('about_cta_clicked', { action: 'sign_up_footer' })}>
                Create a free account
              </Link>
              <Link href="/sign-in" className="cta-primary" onClick={() => trackEvent('about_cta_clicked', { action: 'sign_in_footer' })}>
                Sign in to FixMate
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}