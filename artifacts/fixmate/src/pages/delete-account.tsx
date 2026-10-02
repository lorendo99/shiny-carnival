import { Link } from 'wouter';
import { Header, Footer } from '@/components/layout';
import { CheckCircle2, Mail, ShieldCheck, Trash2 } from 'lucide-react';

const deletionEmail = 'lorendoelshazly2000@yahoo.com';
const deletionEmailHref = `mailto:${deletionEmail}?subject=${encodeURIComponent('FixMate account deletion request')}&body=${encodeURIComponent('Please send this request from the email address linked to your FixMate account. If you cannot, include enough information for us to verify account ownership.')}`;

export default function DeleteAccountPage() {
  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-3xl mx-auto py-12 w-full">
        <div className="text-center mb-10 px-4 pt-0">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Account & Data</div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">
            Request account deletion
          </h1>
          <p className="hero-copy mx-auto">
            Use this page to ask FixMate to delete your account and associated personal data. You do not need to sign in to submit a request.
          </p>
        </div>

        <div className="grid gap-6">
          <section className="panel p-6 md:p-8 text-center bg-[#fffdf7]">
            <div className="w-16 h-16 mx-auto mb-5 bg-[#f8e3a4] border border-[#e5c875] rounded-full flex items-center justify-center text-[#9b671b]">
              <Trash2 size={28} aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-serif text-[#17232d] mb-3">Start a deletion request</h2>
            <p className="text-sm text-[#536671] leading-relaxed max-w-xl mx-auto mb-6">
              Email us from the address linked to your FixMate account. We will verify the request before removing your account and associated data.
            </p>
            <a
              href={deletionEmailHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2b94b] px-5 py-3 text-sm font-bold text-[#17232d] no-underline transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#b0711d]"
              data-testid="link-request-account-deletion"
            >
              <Mail size={17} aria-hidden="true" />
              Email a deletion request
            </a>
            <p className="mt-4 text-xs text-[#70817f]">
              Requests are sent to {deletionEmail}
            </p>
          </section>

          <section className="panel p-6 md:p-8">
            <h2 className="text-xl font-serif text-[#17232d] mb-5 flex items-center gap-3">
              <ShieldCheck className="text-[#c48527]" aria-hidden="true" />
              What will be deleted
            </h2>
            <ul className="grid gap-3 text-sm text-[#536671]">
              {[
                'Your FixMate account and profile',
                'Diagnosis history and repair reports',
                'Customer-owned jobs, private messages, and uploaded evidence',
                'Worker profile data that is not required to be retained',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-[#5c8b7c]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#536671] leading-relaxed mt-6 pt-5 border-t border-[#dfe5df]">
              Marketplace payment, fraud, tax, or dispute records that we are legally required to keep may be retained in a de-identified form. Active subscriptions must be cancelled separately through the store where you subscribed.
            </p>
          </section>

          <section className="panel p-6 md:p-8">
            <h2 className="text-xl font-serif text-[#17232d] mb-3">Already signed in?</h2>
            <p className="text-sm text-[#536671] leading-relaxed">
              Mobile users can delete their account immediately from <strong>Profile → Delete Account</strong>. If you need help or cannot access your account, use the email request above or visit our <Link href="/contact" className="text-[#b0711d] font-bold hover:underline">Contact Us</Link> page.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}