import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Eye,
  EyeOff,
  Flower2,
  Landmark,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type Entry = {
  merchant: string;
  detail: string;
  amount: number;
  date: string;
  account: string;
  tag: string;
  icon: typeof Flower2;
  tint: string;
};

const accounts = [
  { name: "Everyday Purse", number: "•• 4417", amount: "£2,847.20", accent: "#D49A5B", icon: CreditCard },
  { name: "Workshop Reserve", number: "•• 0284", amount: "£12,460.00", accent: "#9CB58B", icon: Landmark },
  { name: "Wool & Linen Fund", number: "pot", amount: "£638.75", accent: "#D48376", icon: Flower2 },
];

const entries: Entry[] = [
  { merchant: "Etsy Payout", detail: "Weekly settlement · Everyday Purse", amount: 312.84, date: "09:00", account: "Everyday Purse", tag: "Income", icon: ArrowDownLeft, tint: "#A9C98F" },
  { merchant: "Meadowsweet Yarns", detail: "Merino DK · 12 skeins", amount: -86.4, date: "14:12", account: "Everyday Purse", tag: "Materials", icon: Flower2, tint: "#D48376" },
  { merchant: "Brambleberry Fabrics", detail: "Linen bolt · oat & rust", amount: -124.15, date: "Yesterday", account: "Everyday Purse", tag: "Materials", icon: BriefcaseBusiness, tint: "#D49A5B" },
  { merchant: "The Copper Kettle", detail: "Glazes & slip trailers", amount: -58.2, date: "Yesterday", account: "Workshop Reserve", tag: "Studio", icon: ReceiptText, tint: "#B49AC0" },
  { merchant: "Guild Member Dues", detail: "Hartfield Makers Guild", amount: 45, date: "Mon, 3 Jun", account: "Workshop Reserve", tag: "Income", icon: Sparkles, tint: "#A9C98F" },
  { merchant: "Royal Mail · Parcels", detail: "Order dispatch ×14", amount: -37.9, date: "Mon, 3 Jun", account: "Everyday Purse", tag: "Postage", icon: BriefcaseBusiness, tint: "#D49A5B" },
];

const goals = [
  { name: "New Floor Loom", saved: 1840, goal: 2400, accent: "#D49A5B", due: "in 18 days" },
  { name: "Spring Market Stall", saved: 410, goal: 600, accent: "#9CB58B", due: "in 31 days" },
  { name: "Linen Restock", saved: 265, goal: 450, accent: "#B49AC0", due: "in 6 days" },
];

const pounds = (amount: number) =>
  `${amount < 0 ? "−" : "+"}£${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

function LeafStamp({ small = false }: { small?: boolean }) {
  return (
    <span className={`flex items-center justify-center rounded-full border border-[#9B6D49] bg-[#46313A] text-[#D49A5B] ${small ? "h-8 w-8" : "h-11 w-11"}`}>
      <Flower2 size={small ? 15 : 20} strokeWidth={1.65} />
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#30252B]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function WorkbenchLedgerDispatch() {
  const [activeAccount, setActiveAccount] = useState("All workbenches");
  const [range, setRange] = useState("This week");
  const [filter, setFilter] = useState("All");
  const [hidden, setHidden] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState("Your books are balanced.");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const accountMatch = activeAccount === "All workbenches" || entry.account === activeAccount;
        const typeMatch = filter === "All" || (filter === "Money in" ? entry.amount > 0 : entry.amount < 0);
        return accountMatch && typeMatch;
      }),
    [activeAccount, filter],
  );

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice("Your books are balanced."), 2600);
  };

  return (
    <div className="ledger-dispatch min-h-[100dvh] w-full bg-[#211A21] px-4 py-5 text-[#F0D9B2] sm:px-7 lg:px-10">
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .ledger-dispatch { font-family: 'Hanken Grotesk', sans-serif; background-image: radial-gradient(circle at 78% 2%, rgba(212,154,91,.16), transparent 26%), radial-gradient(circle at 2% 88%, rgba(121,151,111,.12), transparent 29%), repeating-linear-gradient(0deg, rgba(255,224,170,.025) 0 1px, transparent 1px 5px); }
        .ledger-dispatch::before { content: ""; position: fixed; inset: 0; z-index: 20; pointer-events: none; opacity: .1; mix-blend-mode: screen; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.28'/%3E%3C/svg%3E"); }
        .ledger-display { font-family: 'Fraunces', serif; }
        .dispatch-panel { box-shadow: 0 17px 30px rgba(10,8,14,.22), inset 0 1px rgba(255,230,182,.04); }
        .ledger-dispatch button { -webkit-tap-highlight-color: transparent; }
        @keyframes dispatchRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .dispatch-rise { animation: dispatchRise .38s ease-out both; }
      `}</style>

      <div className="relative mx-auto max-w-[1440px]">
        <header className="flex items-center justify-between border-b border-[#684A43] pb-5">
          <div className="flex items-center gap-3">
            <LeafStamp />
            <div>
              <p className="ledger-display text-[21px] leading-none text-[#F0D9B2]">Hearthstone Treasury</p>
              <p className="mt-1 text-[9px] tracking-[0.3em] text-[#B7A180]">WORKBENCH DISPATCH · 1894</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast("No new notes — the workshop is quiet.")} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#806244] bg-[#392B34] text-[#D3B987] transition-transform hover:-translate-y-0.5" aria-label="Notifications"><Bell size={16} /></button>
            <button onClick={() => toast("Margaret Ashworth's profile is ready.")} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#94643F] bg-[#A66A45] text-[12px] font-semibold text-[#FFEAC3]" aria-label="Profile">MA</button>
          </div>
        </header>

        <div className="mt-7 flex flex-col gap-7 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_285px]">
          <aside className="space-y-7">
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">THE WORKBENCH</p>
              <nav className="space-y-1">
                {[
                  { label: "Overview", icon: LayoutGrid },
                  { label: "Money in & out", icon: ReceiptText },
                  { label: "Goals & jars", icon: Target },
                  { label: "Records", icon: BookOpen },
                ].map(({ label, icon: Icon }, i) => (
                  <button key={label} onClick={() => toast(i === 0 ? "Overview is already on your bench." : `${label} view is ready to open.`)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] transition-colors ${i === 0 ? "bg-[#49333A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832] hover:text-[#F0D9B2]"}`}>
                    <Icon size={16} className={i === 0 ? "text-[#D49A5B]" : "text-[#947A65]"} />
                    {label}
                    {i === 0 && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D49A5B]" />}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">YOUR DRAWERS</p>
              <div className="space-y-1">
                <button onClick={() => setActiveAccount("All workbenches")} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[11px] ${activeAccount === "All workbenches" ? "bg-[#40313A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832]"}`}><span className="h-2 w-2 rounded-full bg-[#D49A5B]" /> All workbenches</button>
                {accounts.map((account) => (
                  <button key={account.name} onClick={() => setActiveAccount(account.name)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[11px] ${activeAccount === account.name ? "bg-[#40313A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832]"}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: account.accent }} /> <span className="truncate">{account.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => toast("A new drawer is ready to name.")} className="mt-3 flex items-center gap-2 px-3 text-[11px] text-[#D49A5B] hover:text-[#F0D9B2]"><Plus size={14} /> New drawer</button>
            </div>

            <div className="hidden rounded-2xl border border-[#735645] bg-[#342730] p-4 md:block">
              <Sparkles size={16} className="text-[#D49A5B]" />
              <p className="mt-3 text-[11px] leading-relaxed text-[#C8AB86]">A small note: materials are 18% lower this month than last.</p>
              <button onClick={() => toast("Materials report added to your records.")} className="mt-3 text-[10px] font-semibold tracking-wide text-[#D49A5B]">See the note <ChevronRight className="inline" size={12} /></button>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">TUESDAY · 11 JUNE 2024</p>
                <h1 className="ledger-display mt-1 text-[38px] leading-none text-[#F0D9B2] sm:text-[44px]">Good evening, Margaret.</h1>
                <p className="mt-2 text-[12px] text-[#B7A180]">{notice}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setHidden((value) => !value)} className="flex items-center gap-2 rounded-xl border border-[#806244] bg-[#332630] px-3 py-2 text-[11px] text-[#C7A977]">{hidden ? <EyeOff size={14} /> : <Eye size={14} />} {hidden ? "Show sums" : "Hide sums"}</button>
                <button onClick={() => setShowComposer(true)} className="flex items-center gap-2 rounded-xl bg-[#A66A45] px-3.5 py-2 text-[11px] font-semibold text-[#FFE9C2] shadow-[0_4px_0_#633A32] transition-transform hover:-translate-y-0.5"><Plus size={14} /> Add entry</button>
              </div>
            </div>

            <div className="dispatch-panel rounded-2xl border border-[#806244] bg-[#3B2D37] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-[#B7A180]">TOTAL ACROSS DRAWERS</p>
                  <p className="ledger-display mt-2 text-[40px] leading-none text-[#F5DDB3]">{hidden ? "£ ••,•••.••" : "£15,945.95"}</p>
                </div>
                <div className="rounded-xl border border-[#789367]/40 bg-[#789367]/10 px-3 py-2 text-right">
                  <p className="flex items-center justify-end gap-1 text-[12px] text-[#B5D0A1]"><ArrowUpRight size={13} /> +£487.30</p>
                  <p className="mt-1 text-[10px] text-[#B7A180]">since last Monday</p>
                </div>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {accounts.map((account) => (
                  <button key={account.name} onClick={() => setActiveAccount(account.name)} className={`rounded-xl border p-3 text-left transition-colors ${activeAccount === account.name ? "border-[#B88751] bg-[#4B3740]" : "border-[#765A4A] bg-[#332831] hover:bg-[#45333B]"}`}>
                    <div className="flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ background: account.accent }} /><span className="text-[10px] text-[#947D68]">{account.number}</span></div>
                    <p className="mt-3 truncate text-[11px] text-[#C8AB86]">{account.name}</p>
                    <p className="ledger-display mt-1 text-[21px]" style={{ color: account.accent }}>{hidden ? "£ •••••" : account.amount}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <div>
                <h2 className="ledger-display text-[25px] text-[#F0D9B2]">The day-book</h2>
                <p className="mt-1 text-[11px] text-[#B7A180]">{activeAccount === "All workbenches" ? "Every drawer, kept in one line." : activeAccount}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-lg border border-[#765A4A] bg-[#30242C] p-1 sm:flex">
                  {["All", "Money in", "Money out"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-2.5 py-1.5 text-[10px] ${filter === item ? "bg-[#A66A45] text-[#FFE9C2]" : "text-[#B7A180]"}`}>{item}</button>)}
                </div>
                <button onClick={() => toast("Search is ready — try a supplier name.")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#765A4A] bg-[#30242C] text-[#B7A180]" aria-label="Search records"><Search size={14} /></button>
              </div>
            </div>
            <div className="mt-3 flex gap-1 sm:hidden">
              {["All", "Money in", "Money out"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1.5 text-[10px] ${filter === item ? "border-[#A66A45] bg-[#A66A45] text-[#FFE9C2]" : "border-[#765A4A] text-[#B7A180]"}`}>{item}</button>)}
            </div>

            <div className="dispatch-panel mt-3 overflow-hidden rounded-2xl border border-[#765A4A] bg-[#322730]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-[#765A4A] px-4 py-3 text-[9px] font-semibold tracking-[0.16em] text-[#947D68] sm:grid-cols-[minmax(0,1fr)_100px_100px]">
                <span>DESCRIPTION</span><span className="hidden sm:block">DRAWER</span><span className="text-right">AMOUNT</span>
              </div>
              {filteredEntries.length === 0 ? (
                <div className="px-5 py-12 text-center"><BookOpen className="mx-auto text-[#947D68]" size={22} /><p className="mt-3 text-[12px] text-[#F0D9B2]">No entries in this drawer yet.</p><button onClick={() => setShowComposer(true)} className="mt-2 text-[11px] text-[#D49A5B]">Add the first one</button></div>
              ) : filteredEntries.map((entry, index) => {
                const Icon = entry.icon;
                return (
                  <button key={`${entry.merchant}-${entry.date}`} onClick={() => setSelectedEntry(entry)} className={`dispatch-rise grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#45333B] sm:grid-cols-[minmax(0,1fr)_100px_100px] ${index > 0 ? "border-t border-[#765A4A]" : ""}`} style={{ animationDelay: `${index * 40}ms` }}>
                    <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ color: entry.tint, borderColor: entry.tint + "55", background: entry.tint + "12" }}><Icon size={15} /></span><span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-[#F0D9B2]">{entry.merchant}</span><span className="mt-0.5 block truncate text-[10px] text-[#B7A180]">{entry.detail} · {entry.date}</span></span></span>
                    <span className="hidden text-[10px] text-[#B7A180] sm:block">{entry.account.replace("Everyday Purse", "Daily").replace("Workshop Reserve", "Workshop")}</span>
                    <span className={`text-right text-[12px] font-semibold tabular-nums ${entry.amount > 0 ? "text-[#B5D0A1]" : "text-[#DCA28E]"}`}>{hidden ? "£ ••••" : pounds(entry.amount)}</span>
                  </button>
                );
              })}
              <button onClick={() => toast("All records are already in view.")} className="flex w-full items-center justify-center gap-1 border-t border-[#765A4A] py-3 text-[10px] font-semibold tracking-wide text-[#D49A5B]">View all records <ChevronRight size={13} /></button>
            </div>
          </main>

          <aside className="space-y-5">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">AT A GLANCE</p><h2 className="ledger-display mt-1 text-[25px] text-[#F0D9B2]">Keep in sight</h2></div>
              <button onClick={() => toast("Dashboard settings are ready.")} className="text-[#B7A180]" aria-label="Dashboard settings"><Settings2 size={16} /></button>
            </div>

            <div className="dispatch-panel rounded-2xl border border-[#806244] bg-[#3B2D37] p-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-[10px] tracking-[0.16em] text-[#B7A180]">GOALS IN MOTION</p><button onClick={() => toast("All jars are open in the records.")} className="text-[10px] text-[#D49A5B]">See all</button></div>
              <div className="space-y-4">
                {goals.map((goal) => { const percent = Math.round((goal.saved / goal.goal) * 100); return <button key={goal.name} onClick={() => toast(`${goal.name} jar selected.`)} className="block w-full text-left"><div className="flex items-start justify-between gap-2"><span className="text-[12px] font-semibold text-[#F0D9B2]">{goal.name}</span><span className="text-[11px] tabular-nums" style={{ color: goal.accent }}>{percent}%</span></div><div className="mt-2"><ProgressBar value={percent} color={goal.accent} /></div><div className="mt-1.5 flex justify-between text-[10px] text-[#B7A180]"><span>£{goal.saved.toLocaleString()} of £{goal.goal.toLocaleString()}</span><span>{goal.due}</span></div></button>; })}
              </div>
            </div>

            <div className="dispatch-panel rounded-2xl border border-[#806244] bg-[#3B2D37] p-4">
              <div className="flex items-center justify-between"><p className="text-[10px] tracking-[0.16em] text-[#B7A180]">THIS WEEK</p><div className="relative"><select value={range} onChange={(event) => setRange(event.target.value)} className="appearance-none bg-transparent pr-4 text-[10px] text-[#D49A5B] outline-none"><option className="bg-[#3B2D37]">This week</option><option className="bg-[#3B2D37]">This month</option><option className="bg-[#3B2D37]">This year</option></select><ChevronDown size={12} className="pointer-events-none absolute right-0 top-0.5 text-[#D49A5B]" /></div></div>
              <div className="mt-5 flex items-end gap-1.5"><span className="ledger-display text-[29px] text-[#DCA28E]">{hidden ? "£ •••" : "£306.65"}</span><span className="mb-1 text-[10px] text-[#B7A180]">spent</span></div>
              <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full"><span className="w-[52%] rounded-full bg-[#D49A5B]" /><span className="w-[27%] rounded-full bg-[#D48376]" /><span className="w-[12%] rounded-full bg-[#B49AC0]" /><span className="w-[9%] rounded-full bg-[#765A4A]" /></div>
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-[10px] text-[#B7A180]"><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#D49A5B]" />Materials <b className="ml-1 font-medium text-[#C8AB86]">£210.55</b></span><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#D48376]" />Postage <b className="ml-1 font-medium text-[#C8AB86]">£37.90</b></span><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#B49AC0]" />Studio <b className="ml-1 font-medium text-[#C8AB86]">£58.20</b></span></div>
            </div>

            <button onClick={() => toast("A supplier payment is ready to schedule.")} className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#9B6D49] bg-[#342730] p-4 text-left transition-colors hover:bg-[#40303A]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A66A45] text-[#FFE9C2]"><ArrowUpRight size={16} /></span><span className="flex-1"><span className="block text-[12px] font-semibold text-[#F0D9B2]">Pay a supplier</span><span className="mt-1 block text-[10px] text-[#B7A180]">Move money without losing the thread.</span></span><ChevronRight size={15} className="text-[#D49A5B] transition-transform group-hover:translate-x-1" /></button>
            <div className="flex items-center gap-2 px-1 text-[10px] text-[#947D68]"><CircleHelp size={13} /> Need a hand? <button onClick={() => toast("Help desk message started.")} className="text-[#D49A5B]">Ask the ledger keeper</button></div>
          </aside>
        </div>

        <footer className="mt-9 flex items-center justify-between border-t border-[#684A43] py-5 text-[9px] tracking-[0.2em] text-[#947D68]"><span>HEARTHSTONE · KEPT IN GOOD ORDER SINCE 1894</span><span className="hidden sm:block">SECURE BY DESIGN · MEMBER LEDGER</span></footer>
      </div>

      {showComposer && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#150F16]/70 p-4 sm:items-center"><div className="dispatch-rise w-full max-w-md rounded-2xl border border-[#A9824E] bg-[#3B2D37] p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)]"><div className="flex items-start justify-between"><div><p className="text-[10px] tracking-[0.2em] text-[#D49A5B]">NEW RECORD</p><h2 className="ledger-display mt-1 text-[27px] text-[#F0D9B2]">Add to the day-book</h2></div><button onClick={() => setShowComposer(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#765A4A] text-[#B7A180]" aria-label="Close"><X size={15} /></button></div><div className="mt-5 space-y-3"><label className="block text-[10px] tracking-wide text-[#B7A180]">SUPPLIER OR NOTE<input placeholder="e.g. Oak & Ash Tools" className="mt-1.5 w-full rounded-xl border border-[#765A4A] bg-[#2B2229] px-3 py-2.5 text-[12px] text-[#F0D9B2] outline-none placeholder:text-[#6F5C53] focus:border-[#B88751]" /></label><label className="block text-[10px] tracking-wide text-[#B7A180]">AMOUNT<input placeholder="£0.00" className="mt-1.5 w-full rounded-xl border border-[#765A4A] bg-[#2B2229] px-3 py-2.5 text-[12px] text-[#F0D9B2] outline-none placeholder:text-[#6F5C53] focus:border-[#B88751]" /></label></div><button onClick={() => { setShowComposer(false); toast("Entry saved to the day-book."); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A66A45] py-3 text-[11px] font-semibold text-[#FFE9C2]"><Check size={14} /> Save record</button></div></div>}

      {selectedEntry && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#150F16]/70 p-4 sm:items-center"><div className="dispatch-rise w-full max-w-sm rounded-2xl border border-[#A9824E] bg-[#3B2D37] p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)]"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: selectedEntry.tint, background: selectedEntry.tint + "18" }}><selectedEntry.icon size={18} /></span><div><p className="text-[13px] font-semibold text-[#F0D9B2]">{selectedEntry.merchant}</p><p className="text-[10px] text-[#B7A180]">{selectedEntry.date} · {selectedEntry.tag}</p></div></div><button onClick={() => setSelectedEntry(null)} className="text-[#B7A180]" aria-label="Close details"><X size={15} /></button></div><p className="ledger-display mt-6 text-[34px]" style={{ color: selectedEntry.amount > 0 ? "#B5D0A1" : "#DCA28E" }}>{hidden ? "£ ••••" : pounds(selectedEntry.amount)}</p><p className="mt-2 text-[11px] leading-relaxed text-[#B7A180]">{selectedEntry.detail}. This record is filed under <span className="text-[#D49A5B]">{selectedEntry.account}</span>.</p><button onClick={() => { setSelectedEntry(null); toast("Record marked for review."); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#765A4A] py-2.5 text-[11px] text-[#D49A5B]"><MoreHorizontal size={14} /> More record options</button></div></div>}
    </div>
  );
}