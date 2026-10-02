import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePoundSterling,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Flower2,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";

type FlowEntry = {
  id: number;
  merchant: string;
  detail: string;
  amount: number;
  time: string;
  account: string;
  category: string;
  icon: LucideIcon;
  tint: string;
  state: "cleared" | "pending";
};

const accounts = [
  { name: "Everyday Purse", short: "Daily", number: "•• 4417", amount: 2847.2, accent: "#D49A5B", icon: CreditCard },
  { name: "Workshop Reserve", short: "Workshop", number: "•• 0284", amount: 12460, accent: "#9CB58B", icon: WalletCards },
  { name: "Wool & Linen Fund", short: "Linen", number: "pot", amount: 638.75, accent: "#D48376", icon: Flower2 },
];

const seedEntries: FlowEntry[] = [
  { id: 1, merchant: "Etsy Payout", detail: "Weekly settlement", amount: 312.84, time: "09:00", account: "Everyday Purse", category: "Income", icon: ArrowDownLeft, tint: "#A9C98F", state: "cleared" },
  { id: 2, merchant: "Meadowsweet Yarns", detail: "Merino DK · 12 skeins", amount: -86.4, time: "14:12", account: "Everyday Purse", category: "Materials", icon: Flower2, tint: "#D48376", state: "cleared" },
  { id: 3, merchant: "Brambleberry Fabrics", detail: "Linen bolt · oat & rust", amount: -124.15, time: "Yesterday", account: "Everyday Purse", category: "Materials", icon: ReceiptText, tint: "#D49A5B", state: "pending" },
  { id: 4, merchant: "The Copper Kettle", detail: "Glazes & slip trailers", amount: -58.2, time: "Yesterday", account: "Workshop Reserve", category: "Studio", icon: BadgePoundSterling, tint: "#B49AC0", state: "cleared" },
  { id: 5, merchant: "Guild Member Dues", detail: "Hartfield Makers Guild", amount: 45, time: "Mon, 3 Jun", account: "Workshop Reserve", category: "Income", icon: Sparkles, tint: "#A9C98F", state: "cleared" },
  { id: 6, merchant: "Royal Mail · Parcels", detail: "Order dispatch ×14", amount: -37.9, time: "Mon, 3 Jun", account: "Everyday Purse", category: "Postage", icon: ArrowUpRight, tint: "#D49A5B", state: "pending" },
];

const week = [
  { day: "MON", date: "10", inAmount: 84, outAmount: 55 },
  { day: "TUE", date: "11", inAmount: 358, outAmount: 306 },
  { day: "WED", date: "12", inAmount: 0, outAmount: 84 },
  { day: "THU", date: "13", inAmount: 145, outAmount: 210 },
  { day: "FRI", date: "14", inAmount: 420, outAmount: 120 },
  { day: "SAT", date: "15", inAmount: 0, outAmount: 65 },
  { day: "SUN", date: "16", inAmount: 0, outAmount: 0 },
];

const goals = [
  { name: "New Floor Loom", saved: 1840, goal: 2400, accent: "#D49A5B", due: "18 days" },
  { name: "Spring Market Stall", saved: 410, goal: 600, accent: "#9CB58B", due: "31 days" },
];

const formatMoney = (amount: number) =>
  `${amount < 0 ? "−" : "+"}£${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

function FlowMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#936743] bg-[#4A3036] text-[#E0A162] shadow-[inset_0_1px_rgba(255,230,182,.08)]">
      <Flower2 size={19} strokeWidth={1.6} />
    </span>
  );
}

function TinyBar({ value, color, max = 420 }: { value: number; color: string; max?: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#2B232A]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(value === 0 ? 0 : 7, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

export default function WorkbenchLedgerFlow() {
  const [entries, setEntries] = useState(seedEntries);
  const [activeView, setActiveView] = useState("Pulse");
  const [activeAccount, setActiveAccount] = useState("All drawers");
  const [range, setRange] = useState("This week");
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState("A clear view of what moved, and what is next.");
  const [selectedEntry, setSelectedEntry] = useState<FlowEntry | null>(seedEntries[2]);
  const [showComposer, setShowComposer] = useState(false);
  const [merchantDraft, setMerchantDraft] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => activeAccount === "All drawers" || entry.account === activeAccount),
    [activeAccount, entries],
  );

  const flash = (message: string) => {
    setNotice(message);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2400);
  };

  const saveEntry = () => {
    const amount = Number(amountDraft);
    if (!merchantDraft.trim() || !Number.isFinite(amount) || amount === 0) {
      flash("Add a name and an amount to file this entry.");
      return;
    }
    const newEntry: FlowEntry = {
      id: Date.now(),
      merchant: merchantDraft.trim(),
      detail: "Added just now",
      amount,
      time: "Now",
      account: activeAccount === "All drawers" ? "Everyday Purse" : activeAccount,
      category: amount > 0 ? "Income" : "Materials",
      icon: amount > 0 ? ArrowDownLeft : ReceiptText,
      tint: amount > 0 ? "#A9C98F" : "#D48376",
      state: "pending",
    };
    setEntries((current) => [newEntry, ...current]);
    setSelectedEntry(newEntry);
    setMerchantDraft("");
    setAmountDraft("");
    setShowComposer(false);
    flash("Entry added to today’s pulse.");
  };

  const total = accounts.reduce((sum, account) => sum + account.amount, 0);

  return (
    <div className="ledger-flow min-h-[100dvh] w-full bg-[#211A21] px-4 py-5 text-[#F0D9B2] sm:px-7 lg:px-10">
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .ledger-flow { font-family: 'Hanken Grotesk', sans-serif; background-image: radial-gradient(circle at 74% 0%, rgba(212,154,91,.16), transparent 28%), radial-gradient(circle at 8% 72%, rgba(121,151,111,.11), transparent 27%), repeating-linear-gradient(0deg, rgba(255,224,170,.025) 0 1px, transparent 1px 5px); }
        .ledger-flow::before { content: ""; position: fixed; inset: 0; z-index: 20; pointer-events: none; opacity: .08; mix-blend-mode: screen; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.28'/%3E%3C/svg%3E"); }
        .flow-display { font-family: 'Fraunces', serif; }
        .flow-panel { box-shadow: 0 18px 35px rgba(10,8,14,.2), inset 0 1px rgba(255,230,182,.04); }
        .flow-rise { animation: flowRise .4s ease-out both; }
        @keyframes flowRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ledger-flow button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="relative mx-auto max-w-[1450px]">
        <header className="flex flex-col gap-5 border-b border-[#684A43] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FlowMark />
            <div>
              <p className="flow-display text-[21px] leading-none text-[#F0D9B2]">Hearthstone Treasury</p>
              <p className="mt-1 text-[9px] tracking-[0.3em] text-[#B7A180]">THE FLOW DESK · TUESDAY 11 JUNE 2024</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[#684A43] bg-[#2F242C] px-3 py-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A9C98F]" />
              <span className="text-[10px] text-[#B7A180]">Ledger synced 2m ago</span>
            </div>
            <button onClick={() => flash("No new notes — the workshop is quiet.")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#806244] bg-[#392B34] text-[#D3B987] transition-transform hover:-translate-y-0.5" aria-label="Notifications"><Bell size={16} /></button>
            <button onClick={() => flash("Margaret Ashworth’s profile is ready.")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#94643F] bg-[#A66A45] text-[12px] font-semibold text-[#FFEAC3]" aria-label="Profile">MA</button>
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)_300px]">
          <aside className="space-y-7">
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">YOUR DESK</p>
              <nav className="space-y-1">
                {[
                  { label: "Pulse", icon: LayoutDashboard },
                  { label: "Plan ahead", icon: CalendarDays },
                  { label: "Jars & goals", icon: Target },
                  { label: "Records", icon: BookOpen },
                ].map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => { setActiveView(label); flash(`${label} view is ready to open.`); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] transition-colors ${activeView === label ? "bg-[#49333A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832] hover:text-[#F0D9B2]"}`}>
                    <Icon size={16} className={activeView === label ? "text-[#D49A5B]" : "text-[#947A65]"} />
                    {label}
                    {activeView === label && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D49A5B]" />}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">FILTER BY DRAWER</p>
              <div className="space-y-1">
                <button onClick={() => setActiveAccount("All drawers")} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[11px] ${activeAccount === "All drawers" ? "bg-[#40313A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832]"}`}><span className="h-2 w-2 rounded-full bg-[#D49A5B]" /> All drawers</button>
                {accounts.map((account) => (
                  <button key={account.name} onClick={() => setActiveAccount(account.name)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[11px] ${activeAccount === account.name ? "bg-[#40313A] text-[#F0D9B2]" : "text-[#B7A180] hover:bg-[#352832]"}`}><span className="h-2 w-2 rounded-full" style={{ background: account.accent }} /><span className="truncate">{account.name}</span></button>
                ))}
              </div>
            </div>

            <div className="hidden rounded-2xl border border-[#735645] bg-[#342730] p-4 md:block">
              <Sparkles size={16} className="text-[#D49A5B]" />
              <p className="mt-3 text-[11px] leading-relaxed text-[#C8AB86]">You have £84 arriving before your next supplier payment.</p>
              <button onClick={() => flash("Arrival note added to your plan.")} className="mt-3 text-[10px] font-semibold tracking-wide text-[#D49A5B]">Keep it in sight <ArrowUpRight className="inline" size={12} /></button>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">{activeView.toUpperCase()} · AT A GLANCE</p>
                <h1 className="flow-display mt-1 text-[38px] leading-none text-[#F0D9B2] sm:text-[46px]">Good evening, Margaret.</h1>
                <p className="mt-2 text-[12px] text-[#B7A180]">{notice}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setHidden((value) => !value)} className="flex items-center gap-2 rounded-xl border border-[#806244] bg-[#332630] px-3 py-2 text-[11px] text-[#C7A977]">{hidden ? "Show sums" : "Hide sums"}</button>
                <button onClick={() => setShowComposer(true)} className="flex items-center gap-2 rounded-xl bg-[#A66A45] px-3.5 py-2 text-[11px] font-semibold text-[#FFE9C2] shadow-[0_4px_0_#633A32] transition-transform hover:-translate-y-0.5"><Plus size={14} /> Add entry</button>
              </div>
            </div>

            <section className="flow-panel rounded-2xl border border-[#806244] bg-[#3B2D37] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-[#B7A180]">AVAILABLE ACROSS ALL DRAWERS</p>
                  <p className="flow-display mt-2 text-[40px] leading-none text-[#F5DDB3]">{hidden ? "£ ••,•••.••" : `£${total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-[#A9C98F]"><ArrowUpRight size={13} /> £487.30 net movement this week</p>
                </div>
                <div className="min-w-[145px] rounded-xl border border-[#789367]/40 bg-[#789367]/10 px-3 py-2.5">
                  <p className="text-[9px] tracking-[0.16em] text-[#B7A180]">NEXT LOW POINT</p>
                  <p className="flow-display mt-1 text-[22px] text-[#B5D0A1]">£15,368</p>
                  <p className="mt-0.5 text-[10px] text-[#B7A180]">after Friday’s bills</p>
                </div>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {accounts.map((account) => {
                  const Icon = account.icon;
                  return <button key={account.name} onClick={() => setActiveAccount(account.name)} className={`rounded-xl border p-3 text-left transition-colors ${activeAccount === account.name ? "border-[#B88751] bg-[#4B3740]" : "border-[#765A4A] bg-[#332831] hover:bg-[#45333B]"}`}><div className="flex items-center justify-between"><Icon size={15} style={{ color: account.accent }} /><span className="text-[10px] text-[#947D68]">{account.number}</span></div><p className="mt-3 truncate text-[11px] text-[#C8AB86]">{account.short}</p><p className="flow-display mt-1 text-[21px]" style={{ color: account.accent }}>{hidden ? "£ •••••" : `£${account.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}</p></button>;
                })}
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div><div className="flex items-center gap-2"><h2 className="flow-display text-[25px] text-[#F0D9B2]">Cashflow map</h2><span className="rounded-full border border-[#789367]/40 bg-[#789367]/10 px-2 py-0.5 text-[9px] text-[#A9C98F]">ON TRACK</span></div><p className="mt-1 text-[11px] text-[#B7A180]">Money in and out, placed on the week ahead.</p></div>
                <div className="flex items-center gap-2"><BarChart3 size={14} className="text-[#B7A180]" /><select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-lg border border-[#765A4A] bg-[#30242C] px-2 py-1.5 text-[10px] text-[#D49A5B] outline-none"><option>This week</option><option>This month</option><option>This quarter</option></select></div>
              </div>
              <div className="flow-panel overflow-hidden rounded-2xl border border-[#765A4A] bg-[#322730] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex gap-4 text-[10px] text-[#B7A180]"><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#A9C98F]" />Money in</span><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#D48376]" />Money out</span></div><button onClick={() => flash("The full forecast is ready to review.")} className="text-[10px] text-[#D49A5B]">Open forecast <ArrowUpRight className="inline" size={12} /></button></div>
                <div className="grid grid-cols-7 gap-2">
                  {week.map((item, index) => <button key={item.day} onClick={() => flash(index === 1 ? "Today is selected — 6 entries are in the pulse." : `${item.day} ${item.date} has ${item.inAmount ? `£${item.inAmount} arriving` : "no planned income"}.`)} className={`rounded-xl border p-2 text-left transition-colors hover:bg-[#45333B] ${index === 1 ? "border-[#A9824E] bg-[#47333A]" : "border-transparent bg-[#2B232A]"}`}><div className="flex items-center justify-between"><span className={`text-[9px] font-semibold ${index === 1 ? "text-[#D49A5B]" : "text-[#947D68]"}`}>{item.day}</span><span className="text-[10px] text-[#C8AB86]">{item.date}</span></div><div className="mt-5 space-y-2"><TinyBar value={item.inAmount} color="#A9C98F" /><TinyBar value={item.outAmount} color="#D48376" /></div><p className="mt-3 truncate text-[9px] text-[#B7A180]">{item.inAmount ? `+£${item.inAmount}` : "—"} / {item.outAmount ? `£${item.outAmount}` : "—"}</p></button>)}
                </div>
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex items-end justify-between"><div><h2 className="flow-display text-[25px] text-[#F0D9B2]">Today’s pulse</h2><p className="mt-1 text-[11px] text-[#B7A180]">{visibleEntries.length} movements in {activeAccount.toLowerCase()}.</p></div><button onClick={() => flash("Search is ready — try a supplier name.")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#765A4A] bg-[#30242C] text-[#B7A180]" aria-label="Search records"><Search size={14} /></button></div>
              <div className="flow-panel overflow-hidden rounded-2xl border border-[#765A4A] bg-[#322730]">
                {visibleEntries.map((entry, index) => { const Icon = entry.icon; return <button key={entry.id} onClick={() => setSelectedEntry(entry)} className={`flow-rise grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#45333B] sm:grid-cols-[minmax(0,1fr)_90px_100px] ${index > 0 ? "border-t border-[#765A4A]" : ""}`} style={{ animationDelay: `${index * 45}ms` }}><span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ color: entry.tint, borderColor: `${entry.tint}55`, background: `${entry.tint}12` }}><Icon size={15} /></span><span className="min-w-0"><span className="flex items-center gap-2 truncate text-[12px] font-semibold text-[#F0D9B2]">{entry.merchant}{entry.state === "pending" && <span className="rounded-full bg-[#D49A5B]/10 px-1.5 py-0.5 text-[8px] font-medium text-[#D49A5B]">PENDING</span>}</span><span className="mt-0.5 block truncate text-[10px] text-[#B7A180]">{entry.detail} · {entry.time}</span></span></span><span className="hidden text-[10px] text-[#B7A180] sm:block">{entry.account.replace("Everyday Purse", "Daily").replace("Workshop Reserve", "Workshop")}</span><span className={`text-right text-[12px] font-semibold tabular-nums ${entry.amount > 0 ? "text-[#B5D0A1]" : "text-[#DCA28E]"}`}>{hidden ? "£ ••••" : formatMoney(entry.amount)}</span></button>; })}
                {visibleEntries.length === 0 && <div className="px-5 py-12 text-center"><ReceiptText className="mx-auto text-[#947D68]" size={22} /><p className="mt-3 text-[12px] text-[#F0D9B2]">Nothing has moved in this drawer yet.</p><button onClick={() => setShowComposer(true)} className="mt-2 text-[11px] text-[#D49A5B]">Add the first one</button></div>}
                <button onClick={() => setActiveView("Records")} className="flex w-full items-center justify-center gap-1 border-t border-[#765A4A] py-3 text-[10px] font-semibold tracking-wide text-[#D49A5B]">View the full ledger <ArrowUpRight size={13} /></button>
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold tracking-[0.2em] text-[#D49A5B]">FOCUS DRAWER</p><h2 className="flow-display mt-1 text-[25px] text-[#F0D9B2]">Worth a look</h2></div><button onClick={() => flash("Focus drawer settings are ready.")} className="text-[#B7A180]" aria-label="Focus drawer settings"><Settings2 size={16} /></button></div>
            {selectedEntry ? <div className="flow-panel rounded-2xl border border-[#A9824E] bg-[#3B2D37] p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: selectedEntry.tint, background: `${selectedEntry.tint}18` }}><selectedEntry.icon size={18} /></span><div><p className="text-[13px] font-semibold text-[#F0D9B2]">{selectedEntry.merchant}</p><p className="text-[10px] text-[#B7A180]">{selectedEntry.time} · {selectedEntry.category}</p></div></div><button onClick={() => setSelectedEntry(null)} className="text-[#B7A180]" aria-label="Close focus drawer"><X size={15} /></button></div><p className="flow-display mt-6 text-[36px]" style={{ color: selectedEntry.amount > 0 ? "#B5D0A1" : "#DCA28E" }}>{hidden ? "£ ••••" : formatMoney(selectedEntry.amount)}</p><p className="mt-2 text-[11px] leading-relaxed text-[#B7A180]">{selectedEntry.detail}. Filed under <span className="text-[#D49A5B]">{selectedEntry.account}</span>.</p><div className="mt-5 flex gap-2"><button onClick={() => { setEntries((current) => current.map((item) => item.id === selectedEntry.id ? { ...item, state: "cleared" } : item)); setSelectedEntry({ ...selectedEntry, state: "cleared" }); flash("Marked as cleared."); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#789367] py-2.5 text-[11px] font-semibold text-[#F5E6C7]"><Check size={14} /> Clear</button><button onClick={() => flash("Record options are ready.")} className="flex h-9 w-10 items-center justify-center rounded-xl border border-[#765A4A] text-[#D49A5B]" aria-label="More record options"><MoreHorizontal size={16} /></button></div></div> : <div className="flow-panel rounded-2xl border border-dashed border-[#806244] bg-[#342730] p-5"><ReceiptText size={18} className="text-[#D49A5B]" /><p className="mt-4 text-[12px] font-semibold text-[#F0D9B2]">Select a movement</p><p className="mt-1 text-[11px] leading-relaxed text-[#B7A180]">Click any line in today’s pulse to keep its details here.</p></div>}

            <div className="flow-panel rounded-2xl border border-[#806244] bg-[#3B2D37] p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] tracking-[0.16em] text-[#B7A180]">GOALS IN MOTION</p><p className="mt-1 text-[11px] text-[#C8AB86]">Small jars, visible progress.</p></div><button onClick={() => setActiveView("Jars & goals")} className="text-[10px] text-[#D49A5B]">See all</button></div><div className="space-y-4">{goals.map((goal) => { const percent = Math.round((goal.saved / goal.goal) * 100); return <button key={goal.name} onClick={() => flash(`${goal.name} is ${percent}% funded.`)} className="block w-full text-left"><div className="flex items-start justify-between gap-2"><span className="text-[12px] font-semibold text-[#F0D9B2]">{goal.name}</span><span className="text-[11px] tabular-nums" style={{ color: goal.accent }}>{percent}%</span></div><div className="mt-2"><TinyBar value={percent} color={goal.accent} max={100} /></div><div className="mt-1.5 flex justify-between text-[10px] text-[#B7A180]"><span>£{goal.saved.toLocaleString()} of £{goal.goal.toLocaleString()}</span><span>{goal.due}</span></div></button>; })}</div></div>

            <button onClick={() => { setShowComposer(true); flash("Ready when you are."); }} className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#9B6D49] bg-[#342730] p-4 text-left transition-colors hover:bg-[#40303A]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A66A45] text-[#FFE9C2]"><Plus size={16} /></span><span className="flex-1"><span className="block text-[12px] font-semibold text-[#F0D9B2]">Capture a movement</span><span className="mt-1 block text-[10px] text-[#B7A180]">Keep the next detail from getting lost.</span></span><ChevronDown size={15} className="rotate-[-90deg] text-[#D49A5B] transition-transform group-hover:translate-x-1" /></button>
            <div className="flex items-center gap-2 px-1 text-[10px] text-[#947D68]"><CircleHelp size={13} /> Need a hand? <button onClick={() => flash("Help desk message started.")} className="text-[#D49A5B]">Ask the ledger keeper</button></div>
          </aside>
        </div>

        <footer className="mt-9 flex items-center justify-between border-t border-[#684A43] py-5 text-[9px] tracking-[0.2em] text-[#947D68]"><span>HEARTHSTONE · FLOW DESK 1894</span><span className="hidden sm:block">SECURE BY DESIGN · MEMBER LEDGER</span></footer>
      </div>

      {toastVisible && <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#A9824E] bg-[#3B2D37] px-4 py-2 text-[11px] text-[#F0D9B2] shadow-[0_12px_30px_rgba(0,0,0,.3)]">{notice}</div>}

      {showComposer && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#150F16]/70 p-4 sm:items-center"><div className="flow-rise w-full max-w-md rounded-2xl border border-[#A9824E] bg-[#3B2D37] p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)]"><div className="flex items-start justify-between"><div><p className="text-[10px] tracking-[0.2em] text-[#D49A5B]">QUICK CAPTURE</p><h2 className="flow-display mt-1 text-[27px] text-[#F0D9B2]">Put it in the flow</h2></div><button onClick={() => setShowComposer(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#765A4A] text-[#B7A180]" aria-label="Close"><X size={15} /></button></div><div className="mt-5 space-y-3"><label className="block text-[10px] tracking-wide text-[#B7A180]">SUPPLIER OR NOTE<input value={merchantDraft} onChange={(event) => setMerchantDraft(event.target.value)} placeholder="e.g. Oak & Ash Tools" className="mt-1.5 w-full rounded-xl border border-[#765A4A] bg-[#2B2229] px-3 py-2.5 text-[12px] text-[#F0D9B2] outline-none placeholder:text-[#6F5C53] focus:border-[#B88751]" /></label><label className="block text-[10px] tracking-wide text-[#B7A180]">AMOUNT <span className="text-[#947D68]">(use − for outgoing)</span><input value={amountDraft} onChange={(event) => setAmountDraft(event.target.value)} inputMode="decimal" placeholder="e.g. -42.50" className="mt-1.5 w-full rounded-xl border border-[#765A4A] bg-[#2B2229] px-3 py-2.5 text-[12px] text-[#F0D9B2] outline-none placeholder:text-[#6F5C53] focus:border-[#B88751]" /></label></div><button onClick={saveEntry} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A66A45] py-3 text-[11px] font-semibold text-[#FFE9C2]"><Check size={14} /> Save movement</button></div></div>}
    </div>
  );
}