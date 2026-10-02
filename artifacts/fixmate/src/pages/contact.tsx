import { Header, Footer } from '@/components/layout';
import { Mail, Phone, AlertTriangle, MessageSquare, Info } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-3xl mx-auto py-12">
        <div className="text-center mb-12 px-4 pt-0">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Get in touch</div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">We're here to help.</h1>
          <p className="hero-copy mx-auto">Reach out for business support, marketplace complaints, or urgent escalations.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <a href="mailto:lorendoelshazly2000@yahoo.com" className="panel p-8 text-center flex flex-col items-center gap-4 transition-transform hover:-translate-y-1 hover:border-[#c99030] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f2b94b] no-underline">
            <div className="w-14 h-14 bg-[#f8faf5] border border-[#cad8d2] rounded-full flex items-center justify-center text-[#c48527]">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-[#17232d] text-lg">Email Support</h3>
              <p className="text-[#536671] text-sm mt-1">lorendoelshazly2000@yahoo.com</p>
            </div>
            <span className="mt-2 text-xs font-bold text-[#b0711d] bg-[#f8e3a4] px-3 py-1 rounded-full">Primary Channel</span>
          </a>

          <a href="tel:+4407886861325" className="panel p-8 text-center flex flex-col items-center gap-4 transition-transform hover:-translate-y-1 hover:border-[#c99030] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f2b94b] no-underline">
            <div className="w-14 h-14 bg-[#f8faf5] border border-[#cad8d2] rounded-full flex items-center justify-center text-[#c48527]">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-bold text-[#17232d] text-lg">Phone Support</h3>
              <p className="text-[#536671] text-sm mt-1">+44 7886 861325</p>
            </div>
            <span className="mt-2 text-xs font-bold text-[#5c8b7c] bg-[#e0f0e9] px-3 py-1 rounded-full">Business Hours Only</span>
          </a>
        </div>

        <div className="panel p-6 md:p-8 bg-[#fffdf7]">
          <h2 className="text-xl font-serif text-[#17232d] mb-6 border-b border-[#dfe5df] pb-4">Guidance & Escalation</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <MessageSquare className="text-[#5c8b7c] flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-1">Filing a Complaint</h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                  If you have a dispute with a marketplace engineer or a complaint about the service, please email us directly. Include your <strong>Job ID</strong>, <strong>Engineer Name</strong>, and a clear timeline of events. We take marketplace integrity seriously.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <AlertTriangle className="text-[#b74635] flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-1">Urgent Safety & Payment Escalations</h4>
                <p className="text-sm text-[#536671] leading-relaxed">
                  If an engineer has caused property damage, or if you suspect fraudulent payment activity, call us immediately and prefix your email subject with <strong>"URGENT: SAFETY"</strong> or <strong>"URGENT: PAYMENT"</strong>. 
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Info className="text-[#c48527] flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-[#17232d] text-sm mb-1">What to Include</h4>
                <ul className="text-sm text-[#536671] list-disc list-inside ml-1 mt-2 space-y-1">
                  <li>Your full name and account email</li>
                  <li>Relevant photos or screenshots</li>
                  <li>Clear description of the requested resolution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
