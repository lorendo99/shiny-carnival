import { Link } from 'wouter';
import { Header, Footer } from '@/components/layout';
import { ShieldCheck, LockKeyhole, Database, Server, CreditCard, Activity, Bot, Info, Globe, AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-4xl mx-auto py-10">
        <div className="mb-10 text-center px-4 pt-0">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Privacy & Data</div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">Your data, clearly explained.</h1>
          <p className="hero-copy mx-auto">We believe in transparent data practices. Here is exactly what we collect, why we need it, and how we protect it.</p>
        </div>

        <div className="grid gap-8">
          <section className="panel p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-serif text-[#17232d] mb-4 flex items-center gap-3">
              <ShieldCheck className="text-[#c48527]" /> Core Privacy Principles
            </h2>
            <p className="text-[#536671] leading-relaxed mb-4 text-sm md:text-base">
              FixMate operates as both an AI-driven repair assistant and a local marketplace. This requires careful handling of your personal details, home location, and payment information. We strictly control what data is generated automatically and what is shared with engineers.
            </p>
            <p className="text-xs text-[#70817f] font-mono uppercase tracking-widest bg-[#f4f6f1] p-3 rounded-lg border border-[#e0e7df]">
              Disclaimer: This operational information is not legal advice.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><LockKeyhole size={18} className="text-[#c48527]" /> Identity & Authentication</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                We use <strong>Clerk</strong> to securely manage your account. Clerk collects your email address, name, and login credentials to establish your identity and sync your repair diagnoses and marketplace jobs across devices. We do not store your passwords on FixMate servers.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><Database size={18} className="text-[#c48527]" /> Diagnosis & Evidence</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                When you request a diagnosis, your item descriptions, symptoms, photos, and videos are processed by <strong>OpenAI</strong> via <strong>Replit AI Integrations</strong> to generate repair confidence scores and text. 
                Media is uploaded to temporary object storage and only moved to committed, long-term storage when you complete a diagnosis or post a job.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><Server size={18} className="text-[#c48527]" /> Marketplace & Profiles</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                We collect your postcode, job details, and photos to connect you with engineers. Verified local engineers can view your open jobs. When engineers quote, they provide itemized material/labor costs, which may be visible to competitors. 
                We track interested/declined statuses and private per-engineer message threads. After selection, <strong>only the winning engineer</strong> keeps access to the accepted job&apos;s private thread and evidence. They see contact details only if you choose to share them in that thread.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><CreditCard size={18} className="text-[#c48527]" /> Payments & Subscriptions</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                We use <strong>Stripe</strong> to manage marketplace checkout sessions and payment statuses. FixMate never stores your full credit card data. We use <strong>RevenueCat</strong> to manage premium subscription entitlements securely.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><Activity size={18} className="text-[#c48527]" /> Technical Analytics</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                We capture device types, browser information, IP addresses, server logs, and cookies to ensure app stability. Analytics events track generic actions (like button clicks) but <strong>strictly exclude</strong> your free-form diagnostic descriptions or marketplace chat content.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-bold text-[#17232d] text-lg mb-3 flex items-center gap-2"><Bot size={18} className="text-[#c48527]" /> Local Data & Support</h3>
              <p className="text-sm text-[#536671] leading-relaxed">
                Support chat is processed by OpenAI and is bounded to retain only your last 12 conversational turns locally. Your browser notification preferences and previously "seen" notification IDs are also stored entirely locally on your device.
              </p>
            </div>
          </div>

          <section className="panel p-6 md:p-8 space-y-6 bg-[#fffdf7]">
            <h2 className="text-xl md:text-2xl font-serif text-[#17232d] flex items-center gap-3 border-b border-[#dfe5df] pb-4">
              <Info className="text-[#c48527]" /> Controls, Rights & Security
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-2">UK Privacy Rights & Control</h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                   Under UK law, you have the right to access, correct, restrict, object to, or delete the processing of your data. Signed-in mobile users can permanently delete their account from Profile, or use our <Link href="/delete-account" className="text-[#b0711d] font-bold hover:underline">account deletion request page</Link> if they cannot access the app. Marketplace payment records that must be retained for legal or financial obligations are de-identified where possible.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-2">Data Retention Basis</h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                  We retain data only as long as reasonably necessary to provide the FixMate service, facilitate marketplace operations, or comply with legal and financial obligations. We do not enforce arbitrary, fixed deletion periods.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-2 flex items-center gap-2">
                  <Globe size={16} className="text-[#5c8b7c]" /> International Processing
                </h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                  Data may be processed internationally by our trusted sub-processors (like Clerk, Stripe, and OpenAI). All international transfers are safeguarded by standard contractual clauses or equivalent legal mechanisms.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-2">Age Restrictions</h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                  FixMate is designed solely for adults. We do not knowingly collect or process the personal data of individuals under the age of 18.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#fce8e2] border border-[#efc5bb] rounded-xl flex gap-4">
              <AlertTriangle className="text-[#7a3026] flex-shrink-0" />
              <div>
                <h4 className="font-bold text-[#7a3026] text-sm mb-1">Security Limitations & Warnings</h4>
                <p className="text-sm text-[#7a3026] leading-relaxed">
                  While we protect your data in transit and at rest, no system is perfectly secure. <strong>Do not upload unnecessary sensitive personal data</strong>—such as photos featuring private mail, identification documents, or unconsenting family members in the background.
                </p>
              </div>
            </div>

            <p className="text-sm text-[#536671] pt-4">
              If you have any complaints or concerns regarding your privacy, please direct them through our official <Link href="/contact" className="text-[#b0711d] font-bold hover:underline">Contact Route</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
