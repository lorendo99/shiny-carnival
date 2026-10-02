import { Link } from 'wouter';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Header, Footer } from '@/components/layout';

const steps = [
  'Unplug the appliance and check the plug, socket, and fuse.',
  'Turn the drum by hand with the machine switched off.',
  'If the drum is stiff or scraping, stop using the machine and book a qualified engineer.',
];

export default function DemoPage() {
  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-5xl mx-auto py-10">
        <section className="text-center px-4 mb-10">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Interactive preview</div>
          <h1 className="text-4xl md:text-6xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">
            See how FixMate turns a repair problem into a safer next step.
          </h1>
          <p className="hero-copy mx-auto max-w-2xl">
            This is a sample result for a washing machine that makes a loud grinding noise. It is a demonstration only and does not call the diagnosis service.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 mt-6 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-bold text-white hover:bg-[#263b46] transition-colors">
            Try your own diagnosis <ArrowRight size={16} />
          </Link>
        </section>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <section className="panel p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-bold text-[#9a6119]">Sample diagnosis</p>
                <h2 className="text-2xl md:text-3xl font-serif text-[#17232d] mt-2">Washing machine</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f2eb] px-3 py-2 text-xs font-bold text-[#29705f]">
                <CheckCircle2 size={15} /> Medium confidence
              </span>
            </div>

            <div className="rounded-2xl border border-[#efc5bb] bg-[#fff4f0] p-5 mb-6">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="text-[#b74635] shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-[#7a3026] mb-1">Likely issue</h3>
                  <p className="text-sm leading-relaxed text-[#7a3026]">
                    A worn drum bearing or foreign object may be causing the grinding noise. Continued use could make the damage worse.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border border-[#dfe5df] bg-[#f8faf5] p-5">
                <div className="flex items-center gap-2 text-[#536671] text-sm font-bold mb-3">
                  <ShieldCheck size={17} className="text-[#5c8b7c]" /> Safety
                </div>
                <p className="text-[#17232d] font-bold">Switch off and unplug before checking anything.</p>
              </div>
              <div className="rounded-2xl border border-[#dfe5df] bg-[#f8faf5] p-5">
                <div className="flex items-center gap-2 text-[#536671] text-sm font-bold mb-3">
                  <CircleDollarSign size={17} className="text-[#c48527]" /> Indicative cost
                </div>
                <p className="text-[#17232d] font-bold">£120–£280 depending on the part and labour.</p>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#17232d] mb-4">
                <Wrench size={19} className="text-[#c48527]" /> Recommended next steps
              </h3>
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3 items-start text-sm md:text-base text-[#536671]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2b94b] text-xs font-extrabold text-[#17232d]">{index + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="panel p-6 md:p-8 bg-[#fffdf7]">
              <div className="flex items-center gap-2 text-[#9a6119] text-sm uppercase tracking-[0.16em] font-bold mb-4">
                <Sparkles size={16} /> What FixMate adds
              </div>
              <ul className="space-y-4 text-sm text-[#536671]">
                <li className="flex gap-3"><CheckCircle2 className="text-[#5c8b7c] shrink-0" size={18} /> Explains the likely fault in plain language.</li>
                <li className="flex gap-3"><CheckCircle2 className="text-[#5c8b7c] shrink-0" size={18} /> Separates safety advice from optional checks.</li>
                <li className="flex gap-3"><CheckCircle2 className="text-[#5c8b7c] shrink-0" size={18} /> Gives an indicative range, not a false exact price.</li>
                <li className="flex gap-3"><CheckCircle2 className="text-[#5c8b7c] shrink-0" size={18} /> Helps you decide when to call a professional.</li>
              </ul>
            </section>

            <section className="rounded-2xl bg-[#17232d] p-6 md:p-8 text-white">
              <h2 className="text-2xl font-serif mb-3">Ready to check your own repair?</h2>
              <p className="text-sm leading-relaxed text-[#dce7e2] mb-6">
                Add a description, photo, or short video and get a diagnosis tailored to the problem in front of you.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-[#f2b94b] px-4 py-3 text-sm font-extrabold text-[#17232d] hover:bg-[#f6c55f] transition-colors">
                Start a diagnosis <ArrowRight size={16} />
              </Link>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}