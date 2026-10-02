import { useEffect, useMemo, useRef, useState } from "react";
import "./hearthstone.css";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Camera, Check, ChevronRight,
  CircleHelp, FileText, Flower2, Home, ImagePlus, MoreHorizontal,
  ReceiptText, Search, Sparkles, Target, X, Eye, EyeOff, Trash2, Info,
} from "lucide-react";

type Entry = { id: number; merchant: string; detail: string; amount: number; time: string; tint: string; status: "cleared" | "pending"; imageId?: string };
const seed: Entry[] = [
  { id: 1, merchant: "Etsy Payout", detail: "Weekly settlement", amount: 312.84, time: "09:00", tint: "#B7D297", status: "cleared" },
  { id: 2, merchant: "Meadowsweet Yarns", detail: "Merino DK · 12 skeins", amount: -86.4, time: "14:12", tint: "#E39B87", status: "cleared" },
  { id: 3, merchant: "Brambleberry Fabrics", detail: "Linen bolt · oat & rust", amount: -124.15, time: "Yesterday", tint: "#E0AE69", status: "pending" },
];
const fmt = (n: number) => `${n < 0 ? "−" : "+"}£${Math.abs(n).toFixed(2)}`;
const money = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
const navItems = [["Home", Home], ["Ledger", FileText], ["Goals", Target], ["More", MoreHorizontal]] as const;
const storeImage = (file: File) => new Promise<string>((resolve, reject) => {
  if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
  const request = indexedDB.open("hearthstone-ledger", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("receipts");
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const id = `receipt-${Date.now()}`;
    const tx = request.result.transaction("receipts", "readwrite");
    tx.objectStore("receipts").put(file, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  };
});
const loadImage = (id: string) => new Promise<Blob>((resolve, reject) => {
  const request = indexedDB.open("hearthstone-ledger", 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const tx = request.result.transaction("receipts", "readonly");
    const get = tx.objectStore("receipts").get(id);
    get.onsuccess = () => get.result ? resolve(get.result) : reject(new Error("Receipt image not found"));
    get.onerror = () => reject(get.error);
  };
});
const deleteImage = (id: string) => new Promise<void>((resolve) => {
  if (!("indexedDB" in window)) return resolve();
  const request = indexedDB.open("hearthstone-ledger", 1);
  request.onsuccess = () => { const tx = request.result.transaction("receipts", "readwrite"); tx.objectStore("receipts").delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); };
  request.onerror = () => resolve();
});
const clearImages = () => new Promise<void>((resolve) => {
  if (!("indexedDB" in window)) return resolve();
  const request = indexedDB.open("hearthstone-ledger", 1);
  request.onsuccess = () => { const tx = request.result.transaction("receipts", "readwrite"); tx.objectStore("receipts").clear(); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); };
  request.onerror = () => resolve();
});

function MiniWave() { return <div className="wave" aria-label="This week's cashflow">{[34,18,27,15,29,12,22,42,26,31,17,38].map((h,i)=><i key={i} style={{height:`${h}%`,background:i>7?"#E0AE69":"#91B57C"}} />)}</div>; }
function CameraCorners() { return <><span className="corner tl"/><span className="corner tr"/><span className="corner bl"/><span className="corner br"/></>; }
function ReceiptImage({ id }: { id: string }) {
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    loadImage(id).then(blob => { if (active) { setUrl(URL.createObjectURL(blob)); setState("ready"); } }).catch(() => active && setState("error"));
    return () => { active = false; setUrl(current => { if (current) URL.revokeObjectURL(current); return ""; }); };
  }, [id]);
  if (state === "loading") return <div className="receipt-status">Loading saved receipt…</div>;
  if (state === "error") return <div className="receipt-status error">Saved receipt image is unavailable on this device.</div>;
  return <img className="saved-receipt" src={url} alt="Saved receipt" />;
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(() => { try { const x=localStorage.getItem("hearthstone-entries"); return x ? JSON.parse(x) : seed; } catch { return seed; } });
  const [tab, setTab] = useState("Home"), [privateSum, setPrivateSum] = useState(false);
  const [capture, setCapture] = useState(false), [review, setReview] = useState(false), [details, setDetails] = useState<Entry|null>(null);
  const [merchant, setMerchant] = useState(""), [amount, setAmount] = useState(""), [notice, setNotice] = useState("");
  const [imageUrl, setImageUrl] = useState(""), [libraryFile, setLibraryFile] = useState<File|null>(null);
  const cameraRef = useRef<HTMLInputElement>(null), libraryRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const base = 15843.66;
  const total = useMemo(() => base + entries.reduce((sum, e) => sum + e.amount, 0), [entries]);
  const visible = tab === "Ledger" ? entries : entries.slice(0, 2);
  const flash = (s:string) => { setNotice(s); window.setTimeout(()=>setNotice(""), 2600); };
  useEffect(() => { try { localStorage.setItem("hearthstone-entries", JSON.stringify(entries)); } catch { flash("Local storage is unavailable; changes may not survive reload."); } }, [entries]);
  const closeCapture = () => { setCapture(false); setReview(false); setMerchant(""); setAmount(""); setImageUrl(current => { if (current) URL.revokeObjectURL(current); return ""; }); setLibraryFile(null); };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return flash("Choose an image file for the receipt.");
    if (file.size > 10 * 1024 * 1024) return flash("Receipt images must be 10 MB or smaller.");
    setLibraryFile(file); setImageUrl(URL.createObjectURL(file)); setReview(true);
  };
  const save = async () => {
    const n = Number(amount);
    if (!merchant.trim() || !Number.isFinite(n) || n === 0) return flash("Add a name and a non-zero amount to save this movement.");
    let savedImageId = "";
    if (libraryFile) { try { savedImageId = await storeImage(libraryFile); } catch { flash("The receipt could not be stored locally; the movement will be saved without its image."); } }
    const item: Entry = { id: Date.now(), merchant: merchant.trim(), detail: savedImageId ? "Receipt photo · local only" : "Added just now", amount:n, time:"Now", tint:n>0?"#B7D297":"#E39B87", status:"pending", ...(savedImageId ? { imageId: savedImageId } : {}) };
    setEntries(x=>[item,...x]); closeCapture(); flash("Movement added to your local ledger.");
  };
  const nav = (name:string) => { setTab(name); if(name !== "Home") flash(`${name} view selected.`); };
  return <div className="camera-ledger">
    <div className="desk-layout">
      <aside className="intro">
        <div className="brand"><span><Flower2 size={16}/></span><b>Hearthstone</b></div>
        <p className="eyebrow">A pocket-sized flow desk</p>
        <h1>See it.<br/>Snap it.<br/><em>File it.</em></h1>
        <p className="intro-copy">The quickest way to keep a real-world purchase from disappearing into a pocket or a pile.</p>
        <div className="rule"><Camera size={14}/> Designed for one-handed capture</div>
      </aside>
      <main className="phone" aria-label="Hearthstone Ledger">
        <header className="topbar"><div className="brand"><span><Flower2 size={18}/></span><div><b>Hearthstone</b><small>{new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}</small></div></div><div className="local-mark"><Sparkles size={15}/> Local only</div></header>
        {tab === "Home" && <HomeView total={total} privateSum={privateSum} setPrivateSum={setPrivateSum} entries={entries} visible={visible} onCapture={()=>setCapture(true)} onDetails={setDetails} setTab={setTab} flash={flash}/>}
        {tab === "Ledger" && <LedgerView entries={entries.filter(e => `${e.merchant} ${e.detail}`.toLowerCase().includes(search.toLowerCase()))} privateSum={privateSum} onDetails={setDetails} search={search} setSearch={setSearch}/>}
        {tab === "Goals" && <GoalsView flash={flash}/>}
        {tab === "More" && <MoreView entries={entries} flash={flash}/>}
        <nav className="bottom-nav">{navItems.map(([name,Icon])=><button key={name} onClick={()=>nav(name)} className={tab===name?"active":""} data-testid={`button-nav-${name}`}><Icon size={16}/>{name}</button>)}</nav>
      </main>
      <aside className="side-note"><div className="note-card"><div className="note-label"><BarChart3 size={15}/> Pocket principle</div><h2>If it takes less than ten seconds, it gets logged.</h2><p>No accounts to open. No spreadsheet to find. Just point, check, and keep moving.</p></div><button className="goal-teaser" onClick={()=>nav("Goals")}><Target/><span><b>New Floor Loom</b><small>£1,840 of £2,400</small></span></button></aside>
    </div>
    {notice && <div className="toast" role="status">{notice}</div>}
    {details && <div className="veil" onMouseDown={(e)=>e.target===e.currentTarget&&setDetails(null)}><div className="modal detail-modal"><div className="modal-head"><div><p className="eyebrow">Movement details</p><h2>{details.merchant}</h2></div><button className="icon-button" onClick={()=>setDetails(null)} aria-label="Close details"><X size={15}/></button></div>{details.imageId && <ReceiptImage id={details.imageId}/>}<strong className={details.amount>0?"income":"expense"}>{privateSum?"£ ••":fmt(details.amount)}</strong><p className="muted">{details.detail} · {details.time}</p><div className="modal-actions"><button className="primary" onClick={()=>{setEntries(x=>x.map(i=>i.id===details.id?{...i,status:"cleared"}:i));setDetails({...details,status:"cleared"});flash("Marked as cleared.")}}><Check size={14}/> Mark cleared</button><button className="secondary" onClick={async()=>{if(!window.confirm(`Remove ${details.merchant} and its receipt photo from this device? This cannot be undone.`))return;if(details.imageId) await deleteImage(details.imageId);setEntries(x=>x.filter(i=>i.id!==details.id));setDetails(null);flash("Movement removed.")}}><Trash2 size={14}/> Remove</button></div></div></div>}
    {capture && <div className="veil" onMouseDown={(e)=>e.target===e.currentTarget&&closeCapture()}><div className="modal capture-modal"><div className="modal-head"><div><p className="eyebrow">Camera capture</p><h2>{review?"Check your movement":"Fit the receipt inside"}</h2></div><button className="icon-button" onClick={closeCapture} aria-label="Close camera"><X size={15}/></button></div>
       {!review ? <><div className="lens"><CameraCorners/><div className="receipt-art"><b>BRAMBLEBERRY</b><small>FABRICS · RECEIPT</small><hr/><i/><i/><i/></div><p>Camera does not read text automatically. Use the photo as a reference, then enter the details below.</p></div><div className="capture-actions"><button className="round small" onClick={()=>libraryRef.current?.click()} aria-label="Choose from photo library"><ImagePlus size={18}/></button><input ref={libraryRef} type="file" accept="image/*" hidden onChange={e=>chooseFile(e.target.files?.[0])}/><button className="round shutter" onClick={()=>cameraRef.current?.click()} aria-label="Take photo"><Camera size={25}/></button><input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>chooseFile(e.target.files?.[0])}/><button className="round small" onClick={()=>setReview(true)} aria-label="Enter manually"><FileText size={17}/></button></div></> :
      <div className="review">{imageUrl ? <img className="receipt-preview" src={imageUrl} alt="Selected receipt preview"/> : <div className="photo-placeholder"><FileText size={20}/> Manual entry</div>}<p className="callout"><Info size={14}/> Confirm the merchant and amount yourself. No OCR or bank sync is used.</p><label>Supplier or note<input value={merchant} onChange={e=>setMerchant(e.target.value)} autoFocus placeholder="e.g. Brambleberry Fabrics"/></label><label>Amount <span>(use − for outgoing)</span><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="-124.15"/></label><button className="primary save" onClick={save}><Check size={14}/> Save to ledger</button></div>}</div></div>}
  </div>;
}

function HomeView({total,privateSum,setPrivateSum,entries,visible,onCapture,onDetails,setTab,flash}:{total:number;privateSum:boolean;setPrivateSum:(v:boolean)=>void;entries:Entry[];visible:Entry[];onCapture:()=>void;onDetails:(e:Entry)=>void;setTab:(v:string)=>void;flash:(v:string)=>void}) {
 const net = entries.reduce((sum, entry) => sum + entry.amount, 0);
 return <><section className="balance"><div><p className="eyebrow">Illustrative opening balance + local movements</p><strong>{privateSum?"£ ••,•••.••":money(total)}</strong></div><button className="pill" onClick={()=>setPrivateSum(!privateSum)}>{privateSum?<Eye size={12}/>:<EyeOff size={12}/>} {privateSum?"Show":"Hide"}</button><div className="balance-foot"><span className="week"><ArrowUpRight size={12}/> {money(net)} net in local ledger<small>Not connected to a bank</small></span><MiniWave/></div></section><section className="capture-section"><div className="section-head"><div><p className="eyebrow">Quick capture</p><h2>What moved today?</h2></div><button className="help" onClick={()=>flash("Keep the whole total inside the frame.")} aria-label="Capture help"><CircleHelp size={14}/></button></div><button className="capture-tile" onClick={onCapture}><CameraCorners/><span className="camera-center"><Camera size={24}/></span><span className="capture-copy"><b>Tap to photograph a receipt</b><small>or enter the movement by hand</small></span><span className="open-camera">OPEN CAMERA</span></button></section><section className="pulse"><div className="section-head"><div><p className="eyebrow">Recent movements</p><p className="muted">{entries.length} movements in your ledger</p></div><button className="text-button" onClick={()=>setTab("Ledger")}>View all <ChevronRight size={13}/></button></div><EntryList entries={visible} onDetails={onDetails} privateSum={privateSum}/><button className="ledger-link" onClick={()=>setTab("Ledger")}>Open full ledger <ChevronRight size={12}/></button></section></>;
}
function EntryList({entries,onDetails,privateSum}:{entries:Entry[];onDetails:(e:Entry)=>void;privateSum:boolean}) { return <div className="entry-list">{entries.length===0?<div className="empty">No movements yet. Capture your first receipt.</div>:entries.map(e=><button className="entry" key={e.id} onClick={()=>onDetails(e)}><span className="entry-icon" style={{color:e.tint,borderColor:`${e.tint}55`}}>{e.amount>0?<ArrowDownLeft size={15}/>:<ReceiptText size={15}/>}</span><span className="entry-main"><b>{e.merchant}{e.status==="pending"&&<em>PENDING</em>}</b><small>{e.detail} · {e.time}</small></span><strong className={e.amount>0?"income":"expense"}>{privateSum?"£ ••":fmt(e.amount)}</strong></button>)}</div>; }
function LedgerView({entries,privateSum,onDetails,search,setSearch}:{entries:Entry[];privateSum:boolean;onDetails:(e:Entry)=>void;search:string;setSearch:(v:string)=>void}) { return <section className="page-view"><p className="eyebrow">The full record</p><h2>Ledger</h2><label className="search-box"><Search size={15}/><input aria-label="Search local movements" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search local movements"/><span>/</span></label><EntryList entries={entries} onDetails={onDetails} privateSum={privateSum}/></section>; }
function GoalsView({flash}:{flash:(v:string)=>void}) { return <section className="page-view"><p className="eyebrow">Illustrative planning example</p><h2>Goals</h2><div className="big-goal"><Target size={20}/><p><b>New Floor Loom</b><small>Example: £1,840 of £2,400</small></p><div className="progress"><i/></div><p className="goal-caption">A quiet target for the next good season.</p></div><div className="info-card"><Sparkles size={17}/><p><b>Make room for the good work.</b><span>This is a planning view, not a bank connection.</span></p></div></section>; }
function MoreView({entries,flash}:{entries:Entry[];flash:(v:string)=>void}) { return <section className="page-view"><p className="eyebrow">Your desk</p><h2>More</h2><div className="settings-list"><div className="setting-row"><Info size={16}/><span><b>Local-only storage</b><small>{entries.length} movements live on this device. No account or bank sync.</small></span></div><button onClick={async()=>{if(window.confirm("Reset this device to the original illustrative sample movements? Your local entries and receipt images will be removed.")){localStorage.removeItem("hearthstone-entries");await clearImages();window.location.reload();}else{flash("Reset cancelled.")}}}><Trash2 size={16}/><span><b>Reset sample ledger</b><small>Explicitly clears local movements and restores sample data.</small></span><ChevronRight size={14}/></button></div></section>; }
