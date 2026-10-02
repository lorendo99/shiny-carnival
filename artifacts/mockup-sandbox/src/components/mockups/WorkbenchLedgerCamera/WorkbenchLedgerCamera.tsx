import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Flower2,
  Home,
  ImagePlus,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type Entry = {
  id: number;
  merchant: string;
  detail: string;
  amount: number;
  time: string;
  tint: string;
  icon: typeof ArrowDownLeft;
  status: "cleared" | "pending";
};

const startingEntries: Entry[] = [
  { id: 1, merchant: "Etsy Payout", detail: "Weekly settlement", amount: 312.84, time: "09:00", tint: "#B7D297", icon: ArrowDownLeft, status: "cleared" },
  { id: 2, merchant: "Meadowsweet Yarns", detail: "Merino DK · 12 skeins", amount: -86.4, time: "14:12", tint: "#E39B87", icon: Flower2, status: "cleared" },
  { id: 3, merchant: "Brambleberry Fabrics", detail: "Linen bolt · oat & rust", amount: -124.15, time: "Yesterday", tint: "#E0AE69", icon: ReceiptText, status: "pending" },
];

const formatAmount = (amount: number) =>
  `${amount < 0 ? "−" : "+"}£${Math.abs(amount).toFixed(2)}`;

function CameraCorners() {
  return (
    <>
      <span className="absolute left-5 top-5 h-7 w-7 rounded-tl-[10px] border-l-2 border-t-2 border-[#F4D8A5]" />
      <span className="absolute right-5 top-5 h-7 w-7 rounded-tr-[10px] border-r-2 border-t-2 border-[#F4D8A5]" />
      <span className="absolute bottom-5 left-5 h-7 w-7 rounded-bl-[10px] border-b-2 border-l-2 border-[#F4D8A5]" />
      <span className="absolute bottom-5 right-5 h-7 w-7 rounded-br-[10px] border-b-2 border-r-2 border-[#F4D8A5]" />
    </>
  );
}

function MiniWave() {
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-label="This week's cashflow">
      {[34, 18, 27, 15, 29, 12, 22, 42, 26, 31, 17, 38].map((height, index) => (
        <span
          key={index}
          className="w-[4px] rounded-t-full"
          style={{ height: `${height}%`, background: index > 7 ? "#E0AE69" : "#91B57C" }}
        />
      ))}
    </div>
  );
}

export default function WorkbenchLedgerCamera() {
  const [entries, setEntries] = useState(startingEntries);
  const [tab, setTab] = useState("Home");
  const [showCapture, setShowCapture] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showSums, setShowSums] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [notice, setNotice] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);

  const total = 15945.95;
  const visibleEntries = useMemo(() => (showLedger ? entries : entries.slice(0, 2)), [entries, showLedger]);
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const runScan = () => {
    setIsScanning(true);
    window.setTimeout(() => {
      setIsScanning(false);
      setCaptured(true);
      setMerchant("Brambleberry Fabrics");
      setAmount("-124.15");
      flash("Receipt read — check the details before saving.");
    }, 1050);
  };

  const saveEntry = () => {
    const parsed = Number(amount);
    if (!merchant.trim() || !Number.isFinite(parsed) || parsed === 0) {
      flash("Add a name and amount to save this movement.");
      return;
    }
    const newEntry: Entry = {
      id: Date.now(),
      merchant: merchant.trim(),
      detail: captured ? "Camera capture · just now" : "Added just now",
      amount: parsed,
      time: "Now",
      tint: parsed > 0 ? "#B7D297" : "#E39B87",
      icon: parsed > 0 ? ArrowDownLeft : ReceiptText,
      status: "pending",
    };
    setEntries((current) => [newEntry, ...current]);
    setMerchant("");
    setAmount("");
    setCaptured(false);
    setShowCapture(false);
    flash("Movement added to your ledger.");
  };

  const closeCapture = () => {
    setShowCapture(false);
    setCaptured(false);
    setIsScanning(false);
    setMerchant("");
    setAmount("");
  };

  return (
    <div className="camera-ledger min-h-[100dvh] w-full px-3 py-5 text-[#F2DDB5] sm:px-8 sm:py-8">
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .camera-ledger {
          font-family: 'Hanken Grotesk', sans-serif;
          background:
            radial-gradient(circle at 50% -5%, rgba(212,154,91,.22), transparent 31rem),
            radial-gradient(circle at 0% 95%, rgba(126,156,113,.12), transparent 24rem),
            #21191f;
        }
        .camera-ledger::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 30;
          opacity: .07;
          background-image: repeating-linear-gradient(0deg, rgba(255,221,166,.35) 0 1px, transparent 1px 5px);
          mix-blend-mode: screen;
        }
        .camera-display { font-family: 'Fraunces', serif; }
        .camera-mono { font-family: 'DM Mono', monospace; }
        .camera-phone {
          box-shadow: 0 28px 80px rgba(8, 5, 10, .48), 0 2px 0 rgba(255, 231, 185, .08) inset;
        }
        .camera-lens {
          background:
            linear-gradient(145deg, rgba(255,239,191,.12), transparent 34%),
            radial-gradient(circle at 50% 48%, rgba(154, 108, 71, .28), transparent 44%),
            linear-gradient(115deg, #49353a 0%, #2b252c 49%, #6d4a45 100%);
        }
        .camera-sweep { animation: cameraSweep 1.05s ease-in-out infinite; }
        .camera-rise { animation: cameraRise .4s ease-out both; }
        @keyframes cameraSweep {
          0%, 100% { transform: translateY(-56px); opacity: .25; }
          50% { transform: translateY(56px); opacity: .9; }
        }
        @keyframes cameraRise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .camera-ledger button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
        <div className="hidden max-w-[270px] pt-16 lg:block">
          <div className="mb-4 flex items-center gap-2 text-[#B7A180]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[11px] border border-[#8C6046] bg-[#493139] text-[#E0A162]"><Flower2 size={16} /></span>
            <span className="camera-display text-[18px] text-[#F2DDB5]">Hearthstone</span>
          </div>
          <p className="camera-mono text-[10px] uppercase tracking-[.18em] text-[#D49A5B]">A pocket-sized flow desk</p>
          <h1 className="camera-display mt-5 text-[39px] leading-[.98] text-[#F2DDB5]">See it.<br />Snap it.<br /><em className="text-[#D5A875]">File it.</em></h1>
          <p className="mt-5 text-[12px] leading-relaxed text-[#A99178]">The quickest way to keep a real-world purchase from disappearing into a pocket or a pile.</p>
          <div className="mt-7 flex items-center gap-3 border-t border-[#664A42] pt-4 text-[10px] text-[#977D69]">
            <Camera size={14} className="text-[#D49A5B]" />
            <span>Designed for one-handed capture</span>
          </div>
        </div>

        <main className="camera-phone relative w-full max-w-[408px] overflow-hidden rounded-[34px] border border-[#755345] bg-[#33252d]">
          <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#705044]" />
          <div className="relative flex min-h-[790px] flex-col px-5 pb-3 pt-7">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#916246] bg-[#4A3036] text-[#E0A162]"><Flower2 size={18} strokeWidth={1.7} /></span>
                <div>
                  <p className="camera-display text-[17px] leading-none text-[#F2DDB5]">Hearthstone</p>
                  <p className="camera-mono mt-1 text-[8px] uppercase tracking-[.12em] text-[#A98E70]">Tuesday · 11 June</p>
                </div>
              </div>
              <button onClick={() => flash("Everything is synced and safe.")} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#775647] bg-[#3D2D35] text-[#D7B17D]" aria-label="Ledger status">
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#AFC992]" />
                <Sparkles size={16} />
              </button>
            </header>

            <section className="mt-5 rounded-[24px] border border-[#806148] bg-[#3D2E36] p-4 shadow-[0_16px_25px_rgba(11,8,12,.2)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="camera-mono text-[8px] uppercase tracking-[.13em] text-[#B79B78]">Available across drawers</p>
                  <p className="camera-display mt-1 text-[32px] leading-none text-[#F4DDB1]">{showSums ? "£ ••,•••.••" : `£${total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}</p>
                </div>
                <button onClick={() => setShowSums((current) => !current)} className="rounded-full border border-[#765747] px-2.5 py-1 text-[9px] text-[#D3AF7C]">{showSums ? "Show" : "Hide"}</button>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-[#AFC992]"><ArrowUpRight size={12} /> £487.30 this week</p>
                  <p className="mt-1 text-[9px] text-[#9B806E]">Next low point · Friday</p>
                </div>
                <MiniWave />
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="camera-mono text-[8px] uppercase tracking-[.15em] text-[#D49A5B]">Quick capture</p>
                  <h2 className="camera-display mt-1 text-[24px] text-[#F2DDB5]">What moved today?</h2>
                </div>
                <button onClick={() => flash("Tip: keep the whole total inside the frame.")} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#765747] bg-[#3A2B33] text-[#B89872]" aria-label="Capture help"><CircleHelp size={14} /></button>
              </div>
              <button onClick={() => setShowCapture(true)} className="camera-lens group relative h-[190px] w-full overflow-hidden rounded-[24px] border border-[#9A6C4C] text-left transition-transform active:scale-[.99]">
                <CameraCorners />
                <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E8C589]/45" />
                <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#F1D398]/80 bg-[#6E4D46]/60 text-[#F7DFA8] transition-transform group-hover:scale-105"><Camera size={24} strokeWidth={1.5} /></span>
                <span className="absolute bottom-4 left-5"><span className="block text-[12px] font-semibold text-[#F2DDB5]">Tap to photograph a receipt</span><span className="mt-1 block text-[10px] text-[#C2A681]">or enter the movement by hand</span></span>
                <span className="absolute bottom-4 right-5 rounded-full bg-[#E0AE69] px-2.5 py-1 text-[9px] font-semibold text-[#3B292B]">OPEN CAMERA</span>
              </button>
            </section>

            <section className="mt-6 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="camera-mono text-[8px] uppercase tracking-[.15em] text-[#D49A5B]">Today’s pulse</p>
                  <p className="mt-1 text-[11px] text-[#A99178]">{entries.length} movements in your ledger</p>
                </div>
                <button onClick={() => setShowLedger((current) => !current)} className="flex items-center gap-1 text-[10px] text-[#D49A5B]">{showLedger ? "Less" : "View all"} <ChevronRight size={13} /></button>
              </div>
              <div className="overflow-hidden rounded-[20px] border border-[#6F5148] bg-[#382A32]">
                {visibleEntries.map((entry, index) => {
                  const Icon = entry.icon;
                  return (
                    <button key={entry.id} onClick={() => setSelected(entry)} className={`camera-rise flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#45333A] ${index > 0 ? "border-t border-[#624941]" : ""}`} style={{ animationDelay: `${index * 50}ms` }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ color: entry.tint, borderColor: `${entry.tint}55`, background: `${entry.tint}12` }}><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-[#F1D9B3]">{entry.merchant}{entry.status === "pending" && <span className="rounded-full bg-[#D49A5B]/10 px-1.5 py-0.5 text-[7px] text-[#D49A5B]">PENDING</span>}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-[#A58A73]">{entry.detail} · {entry.time}</span>
                      </span>
                      <span className={`text-[11px] font-semibold tabular-nums ${entry.amount > 0 ? "text-[#B7D297]" : "text-[#E39B87]"}`}>{showSums ? "£ ••" : formatAmount(entry.amount)}</span>
                    </button>
                  );
                })}
                <button onClick={() => { setTab("Ledger"); setShowLedger(true); flash("Full ledger opened."); }} className="flex w-full items-center justify-center gap-1 border-t border-[#624941] py-3 text-[9px] font-semibold uppercase tracking-[.12em] text-[#D49A5B]">Open full ledger <ChevronRight size={12} /></button>
              </div>
            </section>

            <nav className="mt-5 grid grid-cols-4 gap-1 border-t border-[#614840] pt-3">
              {[
                { name: "Home", icon: Home },
                { name: "Ledger", icon: FileText },
                { name: "Goals", icon: Target },
                { name: "More", icon: MoreHorizontal },
              ].map(({ name, icon: Icon }) => (
                <button key={name} onClick={() => { setTab(name); if (name === "Ledger") setShowLedger(true); flash(`${name} view selected.`); }} className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl text-[9px] ${tab === name ? "bg-[#4B343B] text-[#E0AE69]" : "text-[#967B68]"}`}>
                  <Icon size={16} strokeWidth={tab === name ? 2 : 1.6} />
                  {name}
                </button>
              ))}
            </nav>
          </div>
        </main>

        <aside className="hidden w-[230px] pt-16 lg:block">
          <div className="rounded-2xl border border-[#6F5046] bg-[#33262D] p-4">
            <div className="flex items-center gap-2 text-[#D49A5B]"><BarChart3 size={15} /><span className="camera-mono text-[9px] uppercase tracking-[.13em]">Pocket principle</span></div>
            <p className="camera-display mt-4 text-[21px] leading-[1.06] text-[#F2DDB5]">If it takes less than ten seconds, it gets logged.</p>
            <p className="mt-3 text-[10px] leading-relaxed text-[#A99178]">No accounts to open. No spreadsheet to find. Just point, check, and keep moving.</p>
          </div>
          <button onClick={() => flash("Your next goal is 77% funded.")} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[#6F5046] bg-[#392A31] p-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#789367]/15 text-[#B7D297]"><Target size={16} /></span>
            <span><span className="block text-[11px] font-semibold text-[#F2DDB5]">New Floor Loom</span><span className="mt-1 block text-[9px] text-[#A99178]">£1,840 of £2,400</span></span>
          </button>
        </aside>
      </div>

      {notice && <div className="camera-rise fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#A9824E] bg-[#46323A] px-4 py-2.5 text-[10px] text-[#F2DDB5] shadow-[0_12px_28px_rgba(0,0,0,.35)]">{notice}</div>}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#150F16]/70 p-3 sm:items-center">
          <div className="camera-rise w-full max-w-[390px] rounded-[26px] border border-[#9A6C4C] bg-[#3D2E36] p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)]">
            <div className="flex items-start justify-between">
              <div><p className="camera-mono text-[8px] uppercase tracking-[.15em] text-[#D49A5B]">Movement details</p><h2 className="camera-display mt-1 text-[26px] text-[#F2DDB5]">{selected.merchant}</h2></div>
              <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#765747] text-[#B89872]" aria-label="Close details"><X size={15} /></button>
            </div>
            <p className={`camera-display mt-6 text-[35px] ${selected.amount > 0 ? "text-[#B7D297]" : "text-[#E39B87]"}`}>{showSums ? "£ ••" : formatAmount(selected.amount)}</p>
            <p className="mt-2 text-[11px] text-[#A99178]">{selected.detail} · {selected.time}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { setEntries((current) => current.map((item) => item.id === selected.id ? { ...item, status: "cleared" } : item)); setSelected({ ...selected, status: "cleared" }); flash("Marked as cleared."); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#789367] py-3 text-[11px] font-semibold text-[#F6E6C6]"><Check size={14} /> Mark cleared</button>
              <button onClick={() => flash("More record options are coming with your next sync.")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#765747] text-[#D49A5B]" aria-label="More options"><MoreHorizontal size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {showCapture && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#150F16]/75 p-3 sm:items-center">
          <div className="camera-rise w-full max-w-[420px] rounded-[28px] border border-[#9A6C4C] bg-[#3D2E36] p-4 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between px-1">
              <div><p className="camera-mono text-[8px] uppercase tracking-[.15em] text-[#D49A5B]">Camera capture</p><h2 className="camera-display mt-1 text-[24px] text-[#F2DDB5]">{captured ? "Check your movement" : "Fit the receipt inside"}</h2></div>
              <button onClick={closeCapture} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#765747] text-[#B89872]" aria-label="Close camera"><X size={15} /></button>
            </div>
            {!captured ? (
              <>
                <div className="camera-lens relative mt-4 h-[250px] overflow-hidden rounded-[20px] border border-[#9A6C4C]">
                  <CameraCorners />
                  <div className="absolute left-1/2 top-1/2 h-[148px] w-[210px] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] rounded-sm bg-[#E9D3A7] p-4 shadow-[0_8px_18px_rgba(15,9,10,.3)]">
                    <div className="border-b border-[#9D7A61] pb-2 text-center"><p className="camera-mono text-[8px] text-[#634B48]">BRAMBLEBERRY</p><p className="mt-1 text-[6px] text-[#80625A]">FABRICS · RECEIPT</p></div>
                    <div className="mt-4 space-y-1.5"><span className="block h-1 w-4/5 bg-[#B28E72]/45" /><span className="block h-1 w-3/5 bg-[#B28E72]/45" /><span className="block h-1 w-2/3 bg-[#B28E72]/45" /><span className="mt-4 ml-auto block h-2 w-1/3 bg-[#8B675D]/60" /></div>
                  </div>
                  {isScanning && <span className="camera-sweep absolute inset-x-7 top-1/2 h-px bg-[#F0C47C] shadow-[0_0_12px_#F0C47C]" />}
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-[#F2DDB5]">{isScanning ? "Reading the receipt…" : "Move closer until the edges turn gold"}</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-5">
                  <button onClick={() => flash("Choose a photo from your library.")} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#765747] text-[#D3AF7C]" aria-label="Choose from photo library"><ImagePlus size={18} /></button>
                  <button onClick={runScan} disabled={isScanning} className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[5px] border-[#E9C883] bg-[#B46F4F] text-[#FFEBC4] shadow-[0_0_0_4px_#5B3C3D] disabled:opacity-70" aria-label="Take photo"><Camera size={25} /></button>
                  <button onClick={() => { setCaptured(true); setMerchant(""); setAmount(""); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#765747] text-[#D3AF7C]" aria-label="Enter manually"><FileText size={17} /></button>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-xl border border-[#789367]/45 bg-[#789367]/10 px-3 py-2.5 text-[10px] text-[#B7D297]"><Check size={14} /> Receipt read with confidence · check below</div>
                <label className="mt-4 block text-[9px] uppercase tracking-[.12em] text-[#B79B78]">Supplier or note<input value={merchant} onChange={(event) => setMerchant(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#765747] bg-[#2B2229] px-3 py-3 text-[12px] text-[#F2DDB5] outline-none focus:border-[#B88751]" /></label>
                <label className="mt-3 block text-[9px] uppercase tracking-[.12em] text-[#B79B78]">Amount <span className="text-[#8F7465]">(use − for outgoing)</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="camera-mono mt-1.5 w-full rounded-xl border border-[#765747] bg-[#2B2229] px-3 py-3 text-[13px] text-[#F2DDB5] outline-none focus:border-[#B88751]" /></label>
                <button onClick={saveEntry} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#B46F4F] py-3.5 text-[11px] font-semibold text-[#FFEBC4]"><Check size={14} /> Save to ledger</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}