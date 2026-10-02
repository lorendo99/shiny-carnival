import { useRef, useState, type ReactNode } from "react";
import {
  Anvil,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Flower2,
  Home,
  Landmark,
  Layers,
  Package,
  PieChart,
  Plus,
  ScanLine,
  Scissors,
  Sprout,
  User,
  X,
} from "lucide-react";

const accounts = [
  { name: "Everyday Purse", sub: "Current · ··4417", balance: "£2,847.20", change: "+£312 this week", accent: "#D49A5B", label: "DAILY DRAWER", icon: CreditCard },
  { name: "Workshop Reserve", sub: "Savings · 4.1% AER", balance: "£12,460.00", change: "+£42.18 interest", accent: "#9CB58B", label: "WORKSHOP DRAWER", icon: Anvil },
  { name: "Wool & Linen Fund", sub: "Pot · auto-stitch on", balance: "£638.75", change: "Rounds up every sale", accent: "#D48376", label: "MATERIALS DRAWER", icon: Flower2 },
];

const jars = [
  { name: "New Floor Loom", saved: 1840, goal: 2400, accent: "#D49A5B" },
  { name: "Pottery Kiln", saved: 920, goal: 3200, accent: "#D48376" },
  { name: "Spring Market Stall", saved: 410, goal: 600, accent: "#9CB58B" },
  { name: "Linen Restock", saved: 265, goal: 450, accent: "#B49AC0" },
];

const txns = [
  { name: "Meadowsweet Yarns", note: "Merino DK · 12 skeins", amount: -86.4, when: "Today, 14:12", icon: Flower2, tint: "#D48376" },
  { name: "Etsy Payout", note: "Weekly settlement", amount: 312.84, when: "Today, 09:00", icon: Landmark, tint: "#9CB58B" },
  { name: "Brambleberry Fabrics", note: "Linen bolt · oat & rust", amount: -124.15, when: "Yesterday", icon: Scissors, tint: "#D49A5B" },
  { name: "The Copper Kettle Pottery", note: "Glazes & slip trailers", amount: -58.2, when: "Yesterday", icon: Package, tint: "#B49AC0" },
  { name: "Guild Member Dues", note: "Hartfield Makers Guild", amount: 45.0, when: "Mon, 3 Jun", icon: Sprout, tint: "#9CB58B" },
  { name: "Royal Mail · Parcels", note: "Order dispatch x14", amount: -37.9, when: "Mon, 3 Jun", icon: Package, tint: "#D49A5B" },
];

const fmt = (n: number) =>
  (n < 0 ? "−£" : "+£") + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function BotanicalSprig({ className = "", color = "#9CB58B", flip = false }: { className?: string; color?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 90 180" fill="none" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">
      <path d="M45 177C44 139 42 94 49 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {[28, 53, 78, 103, 128].map((y, i) => (
        <g key={y}>
          <path d={`M46 ${y}C31 ${y - 5} ${20 - i} ${y - 19} ${28 - i} ${y - 28}C41 ${y - 22} 48 ${y - 10} 46 ${y}`} stroke={color} strokeWidth="1.35" strokeLinecap="round" />
          <path d={`M47 ${y + 10}C62 ${y + 5} ${71 + i} ${y - 9} ${64 + i} ${y - 18}C52 ${y - 13} 46 ${y - 1} 47 ${y + 10}`} stroke={color} strokeWidth="1.35" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="49" cy="12" r="4" fill={color} />
    </svg>
  );
}

function StitchMark({ className = "" }: { className?: string }) {
  return <span className={`pointer-events-none absolute border border-dashed border-[#B69A6C]/70 ${className}`} aria-hidden="true" />;
}

function Section({ title, action, children, onAction }: { title: string; action: string; children: ReactNode; onAction: () => void }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between px-6">
        <h3 className="font-ledger text-[20px] text-[#F0D9B2]">{title}</h3>
        <button onClick={onAction} className="inline-flex items-center gap-1 text-[11px] tracking-[0.08em] text-[#D49A5B] transition-transform hover:translate-x-0.5">
          {action} <ChevronRight size={12} />
        </button>
      </div>
      {children}
    </section>
  );
}

export default function WorkbenchLedgerEvening() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const jarsRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState("All");
  const [tab, setTab] = useState("home");
  const [shelfOpen, setShelfOpen] = useState(false);
  const [notice, setNotice] = useState("The workbench is balanced.");
  const visibleTxns = txns.filter((t) => (filter === "All" ? true : filter === "In" ? t.amount > 0 : t.amount < 0));
  const say = (message: string) => setNotice(message);
  const goToJars = () => {
    setTab("jars");
    setShelfOpen(true);
    window.setTimeout(() => jarsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  return (
    <div className="workbench-evening min-h-[100dvh] w-full overflow-hidden bg-[#211A21] px-4 py-8 text-[#F0D9B2] sm:px-8">
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .workbench-evening { font-family: 'Hanken Grotesk', sans-serif; background-color: #211A21; background-image: radial-gradient(circle at 72% 9%, rgba(216,153,84,.17), transparent 23%), radial-gradient(circle at 16% 70%, rgba(101,133,100,.13), transparent 29%), repeating-linear-gradient(0deg, rgba(255,224,170,.035) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,233,185,.025) 0 1px, transparent 1px 8px); }
        .workbench-evening::before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .13; mix-blend-mode: screen; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E"); }
        .font-ledger { font-family: 'Fraunces', serif; }
        .ledger-scroll { scrollbar-width: thin; scrollbar-color: #947353 transparent; }
        .ledger-scroll::-webkit-scrollbar { width: 4px; }
        .ledger-scroll::-webkit-scrollbar-thumb { background: #947353; border-radius: 99px; }
        .wood-token { background-color: #97563A; background-image: radial-gradient(circle at 25% 20%, rgba(255,232,188,.25) 0 2px, transparent 3px), repeating-linear-gradient(12deg, rgba(54,29,31,.24) 0 1px, transparent 1px 8px); box-shadow: inset 0 1px rgba(255,234,181,.38), inset 0 -4px 0 rgba(50,27,29,.2), 0 4px 0 #633A32, 0 8px 12px rgba(15,11,18,.28); }
        .wood-token:active { transform: translateY(3px); box-shadow: inset 0 1px rgba(255,234,181,.38), inset 0 -2px 0 rgba(50,27,29,.2), 0 1px 0 #633A32, 0 4px 8px rgba(15,11,18,.2); }
        .fabric-seam { background-image: repeating-linear-gradient(90deg, rgba(190,157,104,.35) 0 3px, transparent 3px 8px); background-size: 11px 1px; background-position: 0 0; background-repeat: repeat-x; }
        .drawer-tile { box-shadow: 0 5px 0 rgba(10,8,14,.22), 0 12px 22px rgba(10,8,14,.16); }
        .drawer-tile:hover { transform: translateY(-2px); }
        .brass-knob { background: radial-gradient(circle at 32% 28%, #F5D899 0 9%, #CD9349 32%, #8B552F 72%, #593A31 100%); box-shadow: inset 2px 2px 4px rgba(255,246,202,.8), inset -3px -5px 7px rgba(67,40,22,.45), 0 8px 18px rgba(21,12,16,.4); }
        @keyframes shelfIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .shelf-in { animation: shelfIn .28s ease-out both; }
      `}</style>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(280px,1fr)_392px] lg:gap-16">
        <div className="hidden lg:block">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#94643F] bg-[#46303A] shadow-[0_0_22px_rgba(212,154,91,.12)]"><Flower2 size={21} className="text-[#D49A5B]" /></div>
            <div><p className="font-ledger text-[20px] text-[#F0D9B2]">Hearthstone Treasury</p><p className="text-[10px] tracking-[0.28em] text-[#B7A180]">FOR MAKERS · EST. 1894</p></div>
          </div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-[#D49A5B]">A STITCHED WORKBENCH LEDGER</p>
          <h1 className="font-ledger text-[54px] leading-[1.02] text-[#F0D9B2]">Good work<br />deserves a <span className="italic text-[#D49A5B]">good record.</span></h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#B7A180]">A tactile home for Hartfield Makers — every skein, kiln firing and market stall accounted for with the calm authority of a well-used ledger, kept after sundown.</p>
          <div className="mt-9 grid max-w-md grid-cols-3 border border-[#806244] bg-[#3A2B35]/80">
            {[["4.6%", "Harvest Bond AER"], ["12,400", "Maker accounts"], ["Same-day", "Craft supplier pay"]].map(([a, b]) => (
              <div key={b} className="border-r border-[#806244] px-4 py-5 last:border-r-0"><p className="font-ledger text-xl text-[#D49A5B]">{a}</p><p className="mt-1 text-[11px] text-[#B7A180]">{b}</p></div>
            ))}
          </div>
          <BotanicalSprig className="absolute -bottom-14 left-[-50px] h-56 w-28 opacity-45" />
        </div>

        <div className="relative mx-auto h-[812px] w-full max-w-[392px] overflow-hidden rounded-[42px] border-[7px] border-[#49333A] bg-[#302530] shadow-[0_36px_70px_-28px_rgba(4,3,7,.8),0_0_0_1px_rgba(247,218,166,.28)]">
          <div ref={scrollRef} className="ledger-scroll absolute inset-0 overflow-y-auto pb-28">
            <div className="relative px-6 pb-9 pt-7">
              <BotanicalSprig className="pointer-events-none absolute -right-4 -top-14 h-48 w-24 opacity-25" color="#9CB58B" flip />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#94643F] bg-[#46303A]"><Flower2 size={17} className="text-[#D49A5B]" /></div>
                  <div><p className="font-ledger text-[16px] leading-none text-[#F0D9B2]">Hearthstone</p><p className="mt-1 text-[9px] tracking-[0.29em] text-[#B7A180]">TREASURY · EST. 1894</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => say("No new notes — your workbench is quiet.")} aria-label="Open notices" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#806244] bg-[#49333A] text-[#D3B987] transition-transform hover:-translate-y-0.5"><Bell size={15} /></button>
                  <button onClick={() => say("Margaret Ashworth's profile is ready.")} aria-label="Open profile" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#94643F] bg-[#A66A45] text-[12px] font-semibold text-[#FFEAC3]">MA</button>
                </div>
              </div>
            </div>

            <div className="relative mx-5 rounded-[24px] border-2 border-[#87694B] bg-[#40323A] px-5 pb-5 pt-7 shadow-[0_11px_0_rgba(10,8,14,.3),0_22px_35px_rgba(10,8,14,.23)]">
              <StitchMark className="inset-[7px] rounded-[17px]" />
              <span className="absolute left-1/2 top-[-15px] z-10 flex h-8 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-[#A9824E] bg-[#B88751] shadow-[inset_0_2px_2px_rgba(255,244,207,.5),0_4px_4px_rgba(21,12,16,.35)]"><span className="h-2.5 w-2.5 rounded-full border border-[#604235] bg-[#76513C]" /></span>
              <p className="relative text-[10px] font-semibold tracking-[0.24em] text-[#C7A977]">GUILD HOLDINGS · MARGARET ASHWORTH</p>
              <div className="relative mt-2 flex items-end gap-2">
                <h2 className="font-ledger text-[45px] leading-none tabular-nums text-[#F5DDB3]">{hidden ? "£ ••,•••" : "£15,946"}{!hidden && <span className="text-[25px] text-[#C7A977]">.95</span>}</h2>
                <button onClick={() => setHidden((value) => !value)} aria-label={hidden ? "Show balance" : "Hide balance"} className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#806244] bg-[#49333A] text-[#D3B987]">{hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
              <div className="relative mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-[#9CB58B]/40 bg-[#9CB58B]/10 px-2.5 py-1 text-[12px] text-[#B5D0A1]"><ArrowUpRight size={12} /> +£487.30 this week</span><span className="text-[12px] text-[#B7A180]">Spring fair season</span></div>
              <div className="relative mt-6 grid grid-cols-4 gap-2">
                {[{ icon: ArrowUpRight, label: "Send", message: "Send money from Everyday Purse." }, { icon: Plus, label: "Top up", message: "Top up your workbench." }, { icon: ScanLine, label: "Pay", message: "Pay a craft supplier." }, { icon: CreditCard, label: "Cards", message: "Cards are in good order." }].map(({ icon: Icon, label, message }) => (
                  <button key={label} onClick={() => say(message)} className="wood-token group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#754434] text-[#FFE9C2] transition-transform hover:-translate-y-1"><Icon size={17} strokeWidth={2.1} /><span className="text-[10px] font-semibold tracking-[0.04em]">{label}</span></button>
                ))}
              </div>
              <p className="relative mt-4 text-center text-[10px] italic text-[#B7A180]">{notice}</p>
            </div>

            <Section title="Account drawers" action="Manage" onAction={() => say("Account drawer management is open.")}>
              <div className="space-y-3 px-6">
                {accounts.map((a) => (
                  <button key={a.name} onClick={() => say(`${a.name} drawer selected.`)} className="drawer-tile group relative block w-full overflow-hidden rounded-[17px] border border-[#806244] bg-[#493742] p-4 text-left transition-transform">
                    <StitchMark className="inset-[6px] rounded-[12px]" />
                    <span className="absolute -top-px left-4 rounded-b-md border-x border-b border-[#806244] bg-[#4F3C40] px-2 py-1 text-[8px] font-bold tracking-[0.17em]" style={{ color: a.accent }}>{a.label}</span>
                    <div className="relative mt-4 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: a.accent + "66", color: a.accent, background: a.accent + "12" }}><a.icon size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#F0D9B2]">{a.name}</span><span className="mt-0.5 block text-[11px] text-[#B7A180]">{a.sub}</span></span><ChevronRight size={16} className="text-[#C7A977] transition-transform group-hover:translate-x-1" /></div>
                    <div className="relative mt-3 flex items-end justify-between border-t border-[#765A4A] pt-3"><span className="font-ledger text-[24px] tabular-nums" style={{ color: a.accent }}>{hidden ? "£ •••••" : a.balance}</span><span className="text-[10px] text-[#B7A180]">{a.change}</span></div>
                  </button>
                ))}
                <button onClick={() => say("A new pot card is ready to name.")} className="flex w-full items-center justify-center gap-2 rounded-[15px] border border-dashed border-[#806244] py-3 text-[11px] tracking-wide text-[#D49A5B] transition-colors hover:bg-[#49333A]"><Plus size={15} /> New pot</button>
              </div>
            </Section>

            <div ref={jarsRef}>
              <Section title="Pantry jars" action="All jars" onAction={goToJars}>
                <div className="relative mx-6 rounded-[18px] border border-[#806244] bg-[#40323A] px-3 pb-4 pt-5"><span className="fabric-seam absolute left-3 right-3 top-2 h-px" /><div className="grid grid-cols-2 gap-2.5">
                  {jars.map((j) => { const pct = Math.round((j.saved / j.goal) * 100); return <button key={j.name} onClick={() => say(`${j.name} jar opened.`)} className="rounded-[13px] border border-[#765A4A] bg-[#4C3940] p-3 text-left transition-transform hover:-translate-y-0.5"><div className="flex items-center justify-between"><Sprout size={15} style={{ color: j.accent }} /><span className="text-[10px] tabular-nums" style={{ color: j.accent }}>{pct}%</span></div><p className="mt-2 text-[12px] font-semibold leading-snug text-[#F0D9B2]">{j.name}</p><p className="mt-1 text-[10px] tabular-nums text-[#B7A180]">£{j.saved.toLocaleString()} of £{j.goal.toLocaleString()}</p><div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#332831]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: j.accent }} /></div></button>; })}
                </div></div>
              </Section>
            </div>

            <div className="mt-9 px-6">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-ledger text-[20px] text-[#F0D9B2]">The day-book</h3><div className="flex gap-1 rounded-full border border-[#806244] bg-[#40323A] p-1">{["All", "In", "Out"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-[10px] transition-colors ${filter === f ? "bg-[#A66A45] font-semibold text-[#FFE9C2]" : "text-[#B7A180]"}`}>{f}</button>)}</div></div>
              <div className="overflow-hidden rounded-[17px] border border-[#806244] bg-[#493742]">
                {visibleTxns.map((t, i) => <button key={t.name + t.when} onClick={() => say(`${t.name} entry opened.`)} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#40323A] ${i > 0 ? "border-t border-[#765A4A]" : ""}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: t.tint + "55", background: t.tint + "12", color: t.tint }}><t.icon size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#F0D9B2]">{t.name}</span><span className="block truncate text-[10px] text-[#B7A180]">{t.note} · {t.when}</span></span><span className={`text-[12px] font-semibold tabular-nums ${t.amount > 0 ? "text-[#B5D0A1]" : "text-[#DCA28E]"}`}>{fmt(t.amount)}</span></button>)}
              </div>
            </div>

            <div className="mb-4 mt-10 flex flex-col items-center gap-2 text-[#B7A180]"><Flower2 size={22} className="text-[#D49A5B]" /><p className="text-[9px] tracking-[0.28em]">KEPT IN GOOD ORDER SINCE 1894</p></div>
          </div>

          {shelfOpen && <div className="shelf-in absolute inset-x-3 bottom-[78px] z-30 rounded-[22px] border-2 border-[#A9824E] bg-[#40323A] p-4 shadow-[0_18px_30px_rgba(4,3,7,.6)]"><div className="mb-3 flex items-center justify-between"><div><p className="font-ledger text-[20px] text-[#F0D9B2]">The jars shelf</p><p className="text-[10px] tracking-[0.08em] text-[#B7A180]">GOALS KEPT CLOSE AT HAND</p></div><button onClick={() => setShelfOpen(false)} aria-label="Close jars shelf" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#806244] bg-[#49333A] text-[#D3B987]"><X size={15} /></button></div><div className="grid grid-cols-2 gap-2">{jars.map((j) => <button key={j.name} onClick={() => say(`${j.name} jar opened.`)} className="rounded-xl border border-[#765A4A] bg-[#4C3940] p-3 text-left"><p className="text-[11px] font-semibold text-[#F0D9B2]">{j.name}</p><p className="mt-1 text-[10px] text-[#B7A180]">£{j.saved.toLocaleString()} of £{j.goal.toLocaleString()}</p><div className="mt-2 h-1 rounded-full bg-[#332831]"><div className="h-full rounded-full" style={{ width: `${Math.round((j.saved / j.goal) * 100)}%`, background: j.accent }} /></div></button>)}</div></div>}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2A202A] via-[#2A202A]/95 to-transparent px-5 pb-4 pt-5"><div className="relative flex items-center justify-between rounded-[21px] border border-[#806244] bg-[#40323A]/95 px-2 py-2.5 shadow-[0_5px_12px_rgba(4,3,7,.3)]">
            {[{ id: "home", icon: Home, label: "Hearth" }, { id: "jars", icon: Layers, label: "Jars" }, { id: "pay", icon: ScanLine, label: "Pay", center: true }, { id: "insights", icon: PieChart, label: "Almanac" }, { id: "profile", icon: User, label: "You" }].map((n) => n.center ? <button key={n.id} onClick={goToJars} aria-label="Open jars shelf" className="brass-knob -mt-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#2A202A] text-[#FFF1C9] transition-transform hover:-translate-y-1"><n.icon size={18} strokeWidth={2.4} /></button> : <button key={n.id} onClick={() => { setTab(n.id); if (n.id === "jars") goToJars(); else say(`${n.label} view selected.`); }} className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[9px] tracking-wide transition-colors ${tab === n.id ? "text-[#D49A5B]" : "text-[#B7A180]"}`}><n.icon size={17} strokeWidth={tab === n.id ? 2.4 : 2} /><span>{n.label}</span></button>)}
          </div></div>
        </div>
      </div>
    </div>
  );
}