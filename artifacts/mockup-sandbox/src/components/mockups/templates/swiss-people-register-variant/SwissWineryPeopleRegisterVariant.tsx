import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";

type Person = {
  id: string;
  name: string;
  role: string;
  atelier: string;
  origin: string;
  vintage: number;
  signature: string;
  signed: boolean;
  initials: string;
  color: string;
  bio: string;
};

const PEOPLE: Person[] = [
  {
    id: "01",
    name: "Margaux Verrier",
    role: "Maître de Chai",
    atelier: "Vinification",
    origin: "Beaune, FR",
    vintage: 1998,
    signature: "Cuvée Ardente №7",
    signed: true,
    initials: "MV",
    color: "#8E1B2E",
    bio: "Third-generation cellar master. Margaux composes blends the way others compose music — by ear, by instinct, against the grain of convention.",
  },
  {
    id: "02",
    name: "Elias Brandt",
    role: "Head Distiller",
    atelier: "Distillation",
    origin: "Basel, CH",
    vintage: 2004,
    signature: "Eau-de-Vie Solstice",
    signed: true,
    initials: "EB",
    color: "#394C45",
    bio: "Trained in copper and patience. Elias runs the alembic stills on a lunar schedule he refuses to explain.",
  },
  {
    id: "03",
    name: "Soraya Klein",
    role: "Blend Architect",
    atelier: "Assemblage",
    origin: "Vienna, AT",
    vintage: 2011,
    signature: "Vermouth Carmin",
    signed: false,
    initials: "SK",
    color: "#C06D44",
    bio: "Former perfumer. Soraya treats every blend as a fragrance with a finish — top notes, heart, and a long amber tail.",
  },
  {
    id: "04",
    name: "Théo Lasserre",
    role: "Vineyard Director",
    atelier: "Vinification",
    origin: "Banyuls, FR",
    vintage: 2007,
    signature: "Parcelle 14 Rouge",
    signed: true,
    initials: "TL",
    color: "#B89B68",
    bio: "Walks every row of every parcel twice a season. Believes terroir is a verb, not a noun.",
  },
  {
    id: "05",
    name: "Imke Voss",
    role: "Cooperage Lead",
    atelier: "Élevage",
    origin: "Bremen, DE",
    vintage: 2015,
    signature: "Fût Cendré Series",
    signed: false,
    initials: "IV",
    color: "#6E5A72",
    bio: "Toasts her own barrels over vine cuttings. The smoke profile of the Cendré series is hers alone.",
  },
  {
    id: "06",
    name: "Rafael Conti",
    role: "Fermentation Scientist",
    atelier: "Vinification",
    origin: "Turin, IT",
    vintage: 2018,
    signature: "Wild Ferment 03",
    signed: true,
    initials: "RC",
    color: "#3C6470",
    bio: "Cultivates a library of 212 indigenous yeast strains, each named after a jazz standard.",
  },
  {
    id: "07",
    name: "Anouk Perrin",
    role: "Cellar Operations",
    atelier: "Élevage",
    origin: "Sion, CH",
    vintage: 2012,
    signature: "Réserve Souterraine",
    signed: true,
    initials: "AP",
    color: "#AA4C46",
    bio: "Keeps 14,000 barrels in conversation with each other. Knows every stave by sound.",
  },
  {
    id: "08",
    name: "Dario Maturana",
    role: "Spirits Innovator",
    atelier: "Distillation",
    origin: "Mendoza, AR",
    vintage: 2019,
    signature: "Amaro Cordillera",
    signed: false,
    initials: "DM",
    color: "#5C667B",
    bio: "Forages high-altitude botanicals at 3,000 metres. His amaro tastes like thin air and burnt orange.",
  },
  {
    id: "09",
    name: "Lena Okafor",
    role: "Quality Director",
    atelier: "Assemblage",
    origin: "Geneva, CH",
    vintage: 2009,
    signature: "Standard Carmin Index",
    signed: true,
    initials: "LO",
    color: "#9A6B34",
    bio: "Wrote the 400-point sensory index the entire maison is judged against. Including herself.",
  },
];

const ATELIERS = ["All", "Vinification", "Distillation", "Assemblage", "Élevage"];
const SORT_KEYS = ["id", "name", "role", "atelier", "origin", "vintage", "signature"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function SwissWineryPeopleRegisterVariant() {
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Person | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const filtered = people.filter((person) => {
      const inAtelier = filter === "All" || person.atelier === filter;
      const haystack = `${person.name} ${person.role} ${person.origin} ${person.signature}`.toLowerCase();
      return inAtelier && haystack.includes(query.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? result : -result;
    });
  }, [filter, people, query, sortDir, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const archivePerson = (person: Person) => {
    setPeople((current) => current.filter((item) => item.id !== person.id));
    setSelected(null);
    setNotice(`${person.name} moved to the archive`);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const savePerson = (person: Person) => {
    const exists = people.some((item) => item.id === person.id);
    setPeople((current) => {
      return exists ? current.map((item) => (item.id === person.id ? person : item)) : [...current, person];
    });
    setEditing(null);
    setShowAdd(false);
    setNotice(exists ? `${person.name} updated` : `${person.name} added to the register`);
    window.setTimeout(() => setNotice(""), 2600);
  };

  return (
    <div className="swiss-register min-h-screen bg-[#F4EFE7] text-[#1A0E0C]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
      />
      <style>{`
        .swiss-register { font-family: "DM Sans", sans-serif; }
        .swiss-register * { -webkit-font-smoothing: antialiased; }
        .swiss-register .mono { font-family: "Space Mono", monospace; }
        .swiss-register .hairline { border-color: rgba(26,14,12,.18); }
        .swiss-register ::selection { background: #8E1B2E; color: #F4EFE7; }
        .swiss-register input::placeholder { color: rgba(26,14,12,.38); }
        .swiss-register .register-row { transition: background-color .18s ease; }
        .swiss-register .quick-actions { opacity: 0; transform: translateX(5px); transition: opacity .18s ease, transform .18s ease; }
        .swiss-register .register-row:hover .quick-actions, .swiss-register .register-row:focus-within .quick-actions { opacity: 1; transform: translateX(0); }
        .swiss-register .avatar { transition: transform .18s ease, filter .18s ease; }
        .swiss-register .register-row:hover .avatar { transform: scale(1.06); filter: saturate(1.1); }
        @keyframes swissPanelIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes swissToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .swiss-panel-in { animation: swissPanelIn .24s cubic-bezier(.2,.8,.2,1) both; }
        .swiss-toast-in { animation: swissToastIn .22s ease-out both; }
      `}</style>

      <div className="flex min-h-screen">
        <aside className="hidden w-[232px] shrink-0 flex-col justify-between border-r hairline bg-[#F4EFE7] lg:flex">
          <div>
            <div className="px-7 pb-10 pt-8">
              <div className="mb-5 h-9 w-9 bg-[#8E1B2E]" />
              <div className="text-[15px] font-bold uppercase leading-[1.05] tracking-tight">
                Maison
                <br />
                Carmin
              </div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E1B2E]">
                Vins &amp; Spiritueux
              </div>
            </div>
            <nav className="px-7">
              {[
                ["01", "Overview", false],
                ["02", "The Atelier", true],
                ["03", "Cuvées", false],
                ["04", "Distillates", false],
                ["05", "Cellar Ledger", false],
                ["06", "Provenance", false],
              ].map(([number, label, active]) => (
                <button
                  key={String(number)}
                  onClick={() => setNotice(`${label} view is already in this register`)}
                  className={`flex w-full items-baseline gap-3 border-b hairline py-[9px] text-left transition-opacity ${
                    active ? "" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className={`mono text-[10px] font-bold ${active ? "text-[#D44324]" : ""}`}>{number}</span>
                  <span className={`text-[13px] ${active ? "font-bold" : "font-normal"}`}>{label}</span>
                  {active && <span className="ml-auto h-2 w-2 bg-[#8E1B2E]" />}
                </button>
              ))}
            </nav>
          </div>
          <div className="px-7 pb-7">
            <div className="border-t hairline pt-4 text-[10px] uppercase leading-[1.7] tracking-[0.12em]">
              <div className="font-semibold">Internal System v4.2</div>
              <div className="opacity-50">Banyuls — Basel — Turin</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-[6px] w-[6px] rounded-full bg-[#DC7A1F]" />
                <span className="opacity-70">Harvest mode active</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <header className="flex min-h-[56px] items-center justify-between gap-4 border-b hairline bg-[#F4EFE7] px-5 py-3 sm:px-8 lg:px-10">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              02 / The Atelier — People Register
            </div>
            <div className="hidden items-center gap-5 text-[10px] uppercase tracking-[0.14em] sm:flex">
              <span className="opacity-60">Vintage 2024–25</span>
              <span className="font-semibold text-[#8E1B2E]">M. Verrier — Admin</span>
              <span className="grid h-7 w-7 place-items-center bg-[#1A0E0C] text-[11px] font-bold text-[#F4EFE7]">MV</span>
            </div>
          </header>

          <section className="relative px-5 pb-0 pt-10 sm:px-8 lg:px-10 lg:pt-12">
            <div className="absolute right-0 top-0 z-0 h-[244px] w-[34%] bg-[#8E1B2E]" />
            <div className="absolute right-[13%] top-[112px] z-[1] h-[190px] w-[23%] bg-[#D44324]" />
            <div className="absolute right-[5%] top-[205px] z-[2] h-[100px] w-[100px] bg-[#DC7A1F]" />
            <div className="relative z-10 max-w-[720px]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8E1B2E]">
                Team / Company Introduction
              </p>
              <h1 className="text-[clamp(48px,7vw,94px)] font-bold uppercase leading-[.88] tracking-[-.045em]">
                The hands
                <br />
                behind the
                <br />
                <span className="text-[#8E1B2E]">house.</span>
              </h1>
              <p className="mt-6 max-w-[440px] text-[14px] leading-[1.65]">
                Forty-seven people. Four ateliers. One register. Every blend, barrel and bottle at Maison Carmin is
                signed by a person, not a process.
              </p>
            </div>

            <div className="relative z-10 mt-14 grid grid-cols-2 bg-[#1A0E0C] text-[#F4EFE7] md:grid-cols-4">
              {[
                ["47", "People in register", "+3 this vintage"],
                ["04", "Ateliers", "Vinification → Élevage"],
                ["1921", "Oldest vault vintage", "Bibliothèque cellar"],
                ["212", "Yeast strains archived", "Wild Ferment lab"],
              ].map(([number, label, detail], index) => (
                <div key={label} className={`px-5 py-6 sm:px-7 ${index > 0 ? "border-l border-[#F4EFE7]/15" : ""}`}>
                  <div className="mono text-[34px] font-bold leading-none tracking-tight sm:text-[40px]">{number}</div>
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]">{label}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#DC7A1F] sm:text-[10px]">{detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative px-5 pb-20 pt-10 sm:px-8 lg:px-10">
            <div className="pointer-events-none absolute right-0 top-0 select-none text-[220px] font-bold leading-none tracking-tighter text-[#D44324]/10">
              {String(rows.length).padStart(2, "0")}
            </div>

            <div className="relative z-10 mb-6 flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8E1B2E]">Filter by atelier</div>
                <div className="flex max-w-full overflow-x-auto pb-1">
                  {ATELIERS.map((atelier) => (
                    <button
                      key={atelier}
                      onClick={() => setFilter(atelier)}
                      className={`-ml-px whitespace-nowrap border hairline px-3 py-2 text-[11px] uppercase tracking-[0.07em] transition-colors first:ml-0 sm:px-4 sm:text-[12px] ${
                        filter === atelier
                          ? "relative z-10 border-[#8E1B2E] bg-[#8E1B2E] font-semibold text-[#F4EFE7]"
                          : "bg-transparent hover:bg-[#1A0E0C]/5"
                      }`}
                    >
                      {atelier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex w-full items-center gap-3 sm:w-auto">
                <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-[#1A0E0C] pb-1.5 sm:w-[250px] sm:flex-none">
                  <Search size={14} strokeWidth={2.5} className="shrink-0 opacity-55" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name, role, signature…"
                    aria-label="Search people register"
                    className="w-full bg-transparent text-[13px] outline-none"
                  />
                  {query && (
                    <button aria-label="Clear search" onClick={() => setQuery("")} className="opacity-55 hover:opacity-100">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex shrink-0 items-center gap-2 bg-[#1A0E0C] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F4EFE7] transition-colors hover:bg-[#8E1B2E] sm:px-4 sm:text-[11px]"
                >
                  <Plus size={13} strokeWidth={2.5} /> <span className="hidden sm:inline">Add member</span><span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            <div className="relative z-10 border hairline bg-[#FBF8F2] shadow-[12px_12px_0_0_rgba(142,27,46,.12)]">
              <div className="flex items-center justify-between gap-4 px-5 pb-1 pt-5 sm:px-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">People Register — {filter}</div>
                <div className="mono whitespace-nowrap text-[10px] opacity-60">{rows.length} of {people.length} records</div>
              </div>
              <div className="overflow-x-auto px-5 pb-6 sm:px-7">
                <table className="w-full min-w-[1020px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#1A0E0C]">
                      <th className="w-[48px] pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em]">№</th>
                      <SortableHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[250px]" />
                      <SortableHeader label="Role" sortKey="role" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[180px]" />
                      <SortableHeader label="Atelier" sortKey="atelier" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[132px]" />
                      <SortableHeader label="Origin" sortKey="origin" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[120px]" />
                      <SortableHeader label="Vintage" sortKey="vintage" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[90px]" />
                      <SortableHeader label="Signature / status" sortKey="signature" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="w-[270px]" />
                      <th className="w-[118px] pb-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((person) => {
                      const isSelected = selected?.id === person.id;
                      return (
                        <tr
                          key={person.id}
                          tabIndex={0}
                          onClick={() => setSelected(isSelected ? null : person)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") setSelected(isSelected ? null : person);
                          }}
                          className={`register-row group cursor-pointer border-b border-[#1A0E0C]/[.14] outline-none hover:bg-[#8E1B2E]/[.045] focus:bg-[#8E1B2E]/[.045] ${
                            isSelected ? "bg-[#8E1B2E]/[.07]" : ""
                          }`}
                        >
                          <td className="py-[10px] text-[12px] font-semibold text-[#8E1B2E]">{person.id}</td>
                          <td className="py-[10px] pr-4">
                            <div className="flex items-center gap-3">
                              <span
                                className="avatar grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#F4EFE7]"
                                style={{ backgroundColor: person.color }}
                              >
                                {person.initials}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-bold tracking-[-.01em]">{person.name}</span>
                                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[.08em] opacity-55">{person.role}</span>
                              </span>
                            </div>
                          </td>
                          <td className="py-[10px] pr-4 text-[12px]">{person.role}</td>
                          <td className="py-[10px] pr-4">
                            <span className="border-b-2 border-[#8E1B2E] pb-px text-[11px] font-semibold uppercase tracking-[.08em]">
                              {person.atelier}
                            </span>
                          </td>
                          <td className="py-[10px] pr-4 text-[12px] opacity-70">{person.origin}</td>
                          <td className="mono py-[10px] pr-4 text-[12px] font-bold">{person.vintage}</td>
                          <td className="py-[10px] pr-4">
                            <div className="flex items-center justify-between gap-4">
                              <span className="truncate text-[12px]">{person.signature}</span>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] ${
                                  person.signed
                                    ? "border-[#6B7A59]/40 bg-[#6B7A59]/10 text-[#4B6040]"
                                    : "border-[#C06D44]/35 bg-[#C06D44]/10 text-[#A04D2E]"
                                }`}
                              >
                                {person.signed ? <Check size={10} strokeWidth={2.5} /> : <span className="h-[5px] w-[5px] rounded-full bg-current" />}
                                {person.signed ? "Signed" : "Pending"}
                              </span>
                            </div>
                          </td>
                          <td className="py-[10px] text-right">
                            <div className="quick-actions flex items-center justify-end gap-1">
                              <QuickAction label="View" onClick={() => setSelected(person)}><Eye size={14} /></QuickAction>
                              <QuickAction label="Edit" onClick={() => setEditing(person)}><Edit3 size={14} /></QuickAction>
                              <QuickAction label="Archive" onClick={() => archivePerson(person)}><Archive size={14} /></QuickAction>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-[#8E1B2E]/30 text-[#8E1B2E]"><Search size={16} /></div>
                          <div className="mt-3 text-[13px] font-semibold">No records match this search.</div>
                          <button onClick={() => { setQuery(""); setFilter("All"); }} className="mt-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#8E1B2E] underline underline-offset-4">Reset filters</button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t hairline px-5 py-4 text-[10px] uppercase tracking-[.14em] sm:px-7">
                <span className="opacity-60">Register maintained by Quality Direction · Updated 14 Mar 2025</span>
                <div className="flex items-center gap-5">
                  <span className="font-semibold">Page 1 / 5</span>
                  <div className="flex gap-1">{[0, 1, 2, 3, 4].map((index) => <span key={index} className={`h-[3px] w-5 ${index === 0 ? "bg-[#8E1B2E]" : "bg-[#1A0E0C]/20"}`} />)}</div>
                </div>
              </div>
            </div>
          </section>

          <footer className="flex items-center justify-between px-5 pb-8 text-[10px] uppercase tracking-[.16em] sm:px-8 lg:px-10">
            <span className="font-semibold">Maison Carmin — Internal Register</span>
            <span className="hidden opacity-50 sm:inline">Confidential · Do not distribute outside the house</span>
          </footer>
        </main>
      </div>

      {selected && (
        <div className="swiss-panel-in fixed right-4 top-20 z-50 w-[min(340px,calc(100vw-32px))] bg-[#1A0E0C] text-[#F4EFE7] shadow-[-12px_12px_0_0_#D44324] sm:right-8 lg:right-16">
          <div className="flex items-center justify-between px-6 pt-5">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#DC7A1F]">Dossier {selected.id} / 47</span>
            <button aria-label="Close dossier" onClick={() => setSelected(null)} className="transition-colors hover:text-[#D44324]"><X size={16} /></button>
          </div>
          <div className="px-6 pb-6 pt-4">
            <div className="grid h-[118px] place-items-center bg-[#8E1B2E]">
              <span className="text-[48px] font-bold tracking-[-.05em] text-[#F4EFE7]">{selected.initials}</span>
            </div>
            <h3 className="mt-5 text-[24px] font-bold uppercase leading-[1.02] tracking-tight">{selected.name}</h3>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-[#DC7A1F]">{selected.role} — {selected.atelier}</div>
            <p className="mt-4 text-[12.5px] leading-[1.7] opacity-85">{selected.bio}</p>
            <div className="mt-5 grid grid-cols-2 gap-px border border-[#F4EFE7]/15 bg-[#F4EFE7]/15">
              {[
                ["Vintage joined", selected.vintage],
                ["Origin", selected.origin],
                ["Signature", selected.signature],
                ["Status", selected.signed ? "Signed" : "Pending"],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#1A0E0C] px-3 py-3">
                  <div className="text-[9px] uppercase tracking-[.16em] opacity-50">{label}</div>
                  <div className="mt-1 text-[12px] font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setEditing(selected)} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#8E1B2E] py-3 text-[11px] font-semibold uppercase tracking-[.16em] transition-colors hover:bg-[#D44324]">
              Edit dossier <Edit3 size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {(showAdd || editing) && (
        <PersonForm
          person={editing}
          nextId={String(Math.max(...people.map((item) => Number(item.id)), 0) + 1).padStart(2, "0")}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={savePerson}
        />
      )}

      {notice && (
        <div className="swiss-toast-in fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 bg-[#1A0E0C] px-4 py-3 text-[11px] font-semibold uppercase tracking-[.1em] text-[#F4EFE7] shadow-[5px_5px_0_0_#D44324]">
          <Check size={14} className="text-[#DC7A1F]" /> {notice}
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === activeKey;
  return (
    <th className={`pb-3 text-left text-[10px] font-semibold uppercase tracking-[.14em] ${className}`}>
      <button onClick={() => onSort(sortKey)} className="group inline-flex items-center gap-1 text-left">
        {label}
        {active ? (
          direction === "asc" ? <ChevronUp size={12} strokeWidth={2.5} className="text-[#8E1B2E]" /> : <ChevronDown size={12} strokeWidth={2.5} className="text-[#8E1B2E]" />
        ) : (
          <span className="flex flex-col leading-[7px] opacity-30 transition-opacity group-hover:opacity-80">
            <ChevronUp size={9} strokeWidth={2.5} />
            <ChevronDown size={9} strokeWidth={2.5} />
          </span>
        )}
      </button>
    </th>
  );
}

function QuickAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      className="grid h-7 w-7 place-items-center border border-[#1A0E0C]/20 text-[#1A0E0C]/65 transition-colors hover:border-[#8E1B2E] hover:bg-[#8E1B2E] hover:text-[#F4EFE7]"
    >
      {children}
    </button>
  );
}

function PersonForm({
  person,
  nextId,
  onClose,
  onSave,
}: {
  person: Person | null;
  nextId: string;
  onClose: () => void;
  onSave: (person: Person) => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [atelier, setAtelier] = useState(person?.atelier ?? "Vinification");
  const [origin, setOrigin] = useState(person?.origin ?? "");
  const [signature, setSignature] = useState(person?.signature ?? "");
  const [signed, setSigned] = useState(person?.signed ?? false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !role.trim() || !origin.trim() || !signature.trim()) return;
    onSave({
      id: person?.id ?? nextId,
      name: name.trim(),
      role: role.trim(),
      atelier,
      origin: origin.trim(),
      vintage: person?.vintage ?? new Date().getFullYear(),
      signature: signature.trim(),
      signed,
      initials: person?.initials ?? initialsFor(name),
      color: person?.color ?? "#8E1B2E",
      bio: person?.bio ?? "Newly registered member of Maison Carmin.",
    });
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#1A0E0C]/45 p-4" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-[480px] border border-[#1A0E0C]/20 bg-[#FBF8F2] p-6 shadow-[10px_10px_0_0_#8E1B2E] sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8E1B2E]">{person ? "Edit dossier" : "New dossier"}</div>
            <h2 className="text-[28px] font-bold uppercase leading-none tracking-[-.04em]">{person ? "Update member" : "Add member"}</h2>
          </div>
          <button type="button" aria-label="Close form" onClick={onClose} className="opacity-60 hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Camille Renard" />
          <Field label="Role" value={role} onChange={setRole} placeholder="e.g. Cellar Keeper" />
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em]">Atelier</span>
            <select value={atelier} onChange={(event) => setAtelier(event.target.value)} className="w-full border-b border-[#1A0E0C]/35 bg-transparent py-2 text-[13px] outline-none focus:border-[#8E1B2E]">
              {ATELIERS.slice(1).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <Field label="Origin" value={origin} onChange={setOrigin} placeholder="e.g. Lyon, FR" />
          <div className="sm:col-span-2"><Field label="Signature work" value={signature} onChange={setSignature} placeholder="e.g. Cuvée Nouvelle" /></div>
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-3 text-[12px]">
          <input type="checkbox" checked={signed} onChange={(event) => setSigned(event.target.checked)} className="accent-[#8E1B2E]" />
          Signature has been verified
        </label>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] opacity-65 hover:opacity-100">Cancel</button>
          <button type="submit" className="flex items-center gap-2 bg-[#1A0E0C] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#F4EFE7] hover:bg-[#8E1B2E]"><UserPlus size={13} /> Save member</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full border-b border-[#1A0E0C]/35 bg-transparent py-2 text-[13px] outline-none focus:border-[#8E1B2E]" />
    </label>
  );
}
