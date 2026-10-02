import { Link } from 'wouter';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, ShieldCheck, Users, Wrench } from 'lucide-react';
import { Header, Footer } from '@/components/layout';

const sections = [
  {
    icon: CheckCircle2,
    title: '1. Accepting these terms',
    body: (
      <p>
        These Terms & Conditions govern your use of FixMate, including the FixMate website, mobile app, AI repair guidance, saved diagnosis history, and local repair marketplace. By creating an account or using FixMate, you agree to these terms. FixMate is for adults aged 18 and over in the United Kingdom.
      </p>
    ),
  },
  {
    icon: Wrench,
    title: '2. Repair guidance and safety',
    body: (
      <>
        <p>
          FixMate provides informational guidance generated from the details and evidence you submit. AI results are estimates, may be incomplete or wrong, and are not a guarantee, inspection, certification, or substitute for a qualified professional.
        </p>
        <p>
          Do not use FixMate to decide whether to work on gas, mains electricity, boilers, fire hazards, exposed wiring, pressurised systems, flooding, fumes, or any other dangerous situation. Stop work and contact an appropriately qualified professional whenever safety is uncertain. You remain responsible for decisions you make and work you carry out.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: '3. Your account and submitted content',
    body: (
      <>
        <p>
          You must provide accurate information, keep your account secure, and not share access to it. You retain ownership of the photos, videos, descriptions, and other content you submit. You give FixMate the limited permission needed to store, process, display, and share that content to provide diagnosis, support, and marketplace services.
        </p>
        <p>
          Do not upload unnecessary sensitive personal data, identity documents, private correspondence, or images of people who have not agreed to their use. You must have the rights and permissions needed for anything you submit.
        </p>
      </>
    ),
  },
  {
    icon: Users,
    title: '4. Local repair marketplace',
    body: (
      <>
        <p>
          Engineers on FixMate are independent service providers, not FixMate employees. FixMate helps you prepare a job, compare quotes, and communicate, but does not guarantee an engineer&apos;s availability, identity, workmanship, price, insurance, or outcome. Check qualifications and agree the scope, price, timing, and any warranty directly before work begins.
        </p>
        <p>
          Open jobs and competing quote details may be visible to eligible engineers. Messages and evidence in a private applicant thread are kept private per applicant, subject to the access needed to operate the service, investigate abuse, resolve disputes, or comply with law.
        </p>
        <p>
          The displayed potential 15% repair saving is an estimate only. It is not guaranteed and is never automatically deducted from an engineer&apos;s quote or payment.
        </p>
      </>
    ),
  },
  {
    icon: CreditCard,
    title: '5. Payments and FixMate Plus',
    body: (
      <>
        <p>
          Marketplace payments are processed by Stripe and relate to real-world repair services. FixMate does not store full card details. The engineer&apos;s quote, the service delivered, and any refund or dispute are handled according to the arrangements shown at checkout and the applicable provider terms.
        </p>
        <p>
          FixMate Plus is a digital subscription purchased through Apple&apos;s in-app purchase system on iOS. Prices, billing periods, renewal, cancellation, and refunds are controlled by the relevant app store. Subscriptions renew automatically unless cancelled through your store account at least 24 hours before the current period ends. Restore Purchases is available in the app.
        </p>
        <p>
          Your Apple ID account is charged when you confirm the purchase. You can manage or cancel the subscription in your Apple account&apos;s subscription settings. If a subscription is cancelled, access continues until the end of the paid period unless Apple&apos;s rules provide otherwise. Apple&apos;s <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer" className="text-[#b0711d] font-bold hover:underline">Standard Licensed Application End User License Agreement</a> also applies to the app download and digital subscription.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: '6. Acceptable use and account closure',
    body: (
      <>
        <p>
          You must not misuse FixMate, attempt unauthorised access, submit malicious or unlawful content, impersonate another person, harass an engineer or customer, manipulate quotes or reviews, or use the service to create an unreasonable safety risk. We may restrict or close accounts that breach these terms or threaten users, the service, or third parties.
        </p>
        <p>
          You can permanently delete your account from the mobile Profile screen. Diagnoses, customer jobs, private messages, and removable evidence are deleted where possible. Marketplace records needed for legal, payment, fraud, tax, or dispute obligations may be retained in de-identified form.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-4xl mx-auto py-10">
        <div className="mb-10 text-center px-4">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Terms & Conditions</div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">Clear terms for using FixMate.</h1>
          <p className="hero-copy mx-auto">These terms explain what FixMate provides, what it does not promise, and how the repair marketplace works.</p>
          <p className="text-xs text-[#70817f] mt-4">Effective date: 11 September 2026</p>
        </div>

        <div className="grid gap-6">
          {sections.map(({ icon: Icon, title, body }) => (
            <section key={title} className="panel p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-serif text-[#17232d] mb-4 flex items-center gap-3">
                <Icon className="text-[#c48527]" />
                {title}
              </h2>
              <div className="terms-copy text-sm md:text-base text-[#536671] leading-relaxed space-y-4">
                {body}
              </div>
            </section>
          ))}

          <section className="panel p-6 md:p-8 bg-[#fffdf7]">
            <h2 className="text-xl md:text-2xl font-serif text-[#17232d] mb-4">7. General terms</h2>
            <div className="terms-copy text-sm md:text-base text-[#536671] leading-relaxed space-y-4">
              <p>
                FixMate is provided with reasonable care, but we do not promise that it will always be available, error-free, or suitable for every repair. To the extent permitted by law, FixMate is not liable for indirect loss or for damage caused by relying on AI guidance instead of obtaining appropriate professional help. Nothing in these terms limits rights that cannot legally be excluded.
              </p>
              <p>
                We may update these terms when the service changes or the law requires it. We will publish the current version here and update the effective date. If a material change affects your continued use, we will provide appropriate notice.
              </p>
              <p>
                These terms are governed by the laws of England and Wales, except where mandatory consumer protections require otherwise. For questions, complaints, or marketplace concerns, use the <Link href="/contact" className="text-[#b0711d] font-bold hover:underline">FixMate contact page</Link>. Our <Link href="/privacy" className="text-[#b0711d] font-bold hover:underline">Privacy & Data page</Link> explains how personal information is handled.
              </p>
            </div>
          </section>

          <div className="p-5 bg-[#fce8e2] border border-[#efc5bb] rounded-xl flex gap-3 items-start">
            <AlertTriangle className="text-[#7a3026] flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-[#7a3026] leading-relaxed">
              These Terms & Conditions are service terms, not legal advice. If you need advice about a dispute, contract, safety issue, or legal right, speak with an appropriately qualified adviser.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}