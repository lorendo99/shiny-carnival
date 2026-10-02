import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import { useUser } from '@clerk/react';
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Hammer,
  House,
  LoaderCircle,
  LockKeyhole,
  FileText,
  Pencil,
  Trash2,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Wrench,
  X,
} from 'lucide-react';
import {
  getGetInventoryItemQueryKey,
  getGetRepairReportShareQueryKey,
  getListInventoryDiagnosesQueryKey,
  getListInventoryItemsQueryKey,
  getListInventoryRemindersQueryKey,
  getListInventoryRepairsQueryKey,
  useCreateInventoryItem,
  useCreateInventoryDocument,
  useCreateInventoryReminder,
  useCreateInventoryRepair,
  useCreateRepairReportShare,
  useDeleteInventoryDocument,
  useDeleteInventoryItem,
  useGetInventoryItem,
  useGetRepairReportShare,
  useListInventoryDiagnoses,
  useListInventoryItems,
  useListInventoryReminders,
  useListInventoryRepairs,
  useUpdateInventoryReminder,
  useUpdateInventoryItem,
  useUpdateInventoryRepair,
  useRequestUploadUrl,
  type InventoryItem,
  type InventoryDocument,
  type InventoryItemCategory,
  type RepairReportSelection,
} from '@workspace/api-client-react';
import { trackEvent } from '@/lib/analytics';

const categories: Array<{ value: InventoryItemCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'kitchen_appliances', label: 'Kitchen' },
  { value: 'heating_equipment', label: 'Heating' },
  { value: 'tvs_electronics', label: 'Electronics' },
  { value: 'plumbing_fixtures', label: 'Plumbing' },
  { value: 'garden_equipment', label: 'Garden' },
];

const categoryIcon: Record<string, typeof House> = {
  kitchen_appliances: Thermometer,
  heating_equipment: Thermometer,
  tvs_electronics: Archive,
  plumbing_fixtures: House,
  garden_equipment: Sparkles,
};

const categoryLabel = (category: string) => categories.find((entry) => entry.value === category)?.label ?? category.replaceAll('_', ' ');
const dateLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not recorded';
const moneyLabel = (pence: number | null | undefined) => pence == null ? 'Not recorded' : `£${(pence / 100).toFixed(2)}`;
const errorText = (error: unknown) => error instanceof Error ? error.message.replace(/^HTTP \d+ [^:]+:\s*/, '') : 'Something went wrong. Please try again.';

function SignedOutGate({ detail = false }: { detail?: boolean }) {
  return (
    <div className="inventory-gate">
      <div className="inventory-gate-mark"><LockKeyhole size={22} /></div>
      <span className="inventory-eyebrow">Your private home record</span>
      <h1>{detail ? 'This item lives in your private inventory.' : 'Keep the important things in one place.'}</h1>
      <p>Sign in to see your appliances, service notes, reminders, and the exact details you choose to share with a repairer.</p>
      <Link href="/sign-in" className="inventory-button inventory-button-primary">Sign in to FixMate <ChevronRight size={16} /></Link>
    </div>
  );
}

function InventoryFrame({ children, eyebrow = 'Household inventory', title, action }: { children: ReactNode; eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="fixmate-app inventory-app">
      <header className="inventory-topbar">
        <Link href="/" className="brand"><span className="brand-mark"><Wrench size={17} /></span><span>fixmate</span></Link>
        <div className="inventory-topbar-note"><span className="status-dot" />Private by default</div>
      </header>
      <main className="inventory-shell">
        <div className="inventory-heading-row">
          <div><span className="inventory-eyebrow">{eyebrow}</span><h1>{title}</h1></div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

type ItemFormState = {
  category: InventoryItemCategory;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  notes: string;
};

const emptyItem: ItemFormState = {
  category: 'kitchen_appliances',
  name: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  warrantyStartDate: '',
  warrantyEndDate: '',
  notes: '',
};

function AddItemDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const createItem = useCreateInventoryItem();
  const [form, setForm] = useState<ItemFormState>(emptyItem);
  const setField = (field: keyof ItemFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || createItem.isPending) return;
    createItem.mutate({
      data: {
        category: form.category,
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        purchaseDate: form.purchaseDate || null,
        warrantyStartDate: form.warrantyStartDate || null,
        warrantyEndDate: form.warrantyEndDate || null,
        notes: form.notes.trim() || null,
      },
    }, {
      onSuccess: (item) => {
        queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
        onClose();
        window.location.href = `/inventory/${item.id}`;
      },
    });
  };
  return (
    <div className="inventory-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
        <div className="modal-header"><div><span className="inventory-eyebrow">Add to your record</span><h2 id="add-item-title">A few useful details</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <form onSubmit={submit} className="inventory-form">
          <div className="inventory-form-grid">
            <label className="inventory-field inventory-field-wide">What is it called?
              <input required autoFocus value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Kitchen washing machine" />
            </label>
            <label className="inventory-field">Category
              <select value={form.category} onChange={(event) => setField('category', event.target.value)}>
                {categories.slice(1).map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
              </select>
            </label>
            <label className="inventory-field">Manufacturer<input value={form.manufacturer} onChange={(event) => setField('manufacturer', event.target.value)} placeholder="e.g. Bosch" /></label>
            <label className="inventory-field">Model number<input value={form.model} onChange={(event) => setField('model', event.target.value)} placeholder="Optional" /></label>
            <label className="inventory-field">Serial number<input value={form.serialNumber} onChange={(event) => setField('serialNumber', event.target.value)} placeholder="Optional" /></label>
            <label className="inventory-field">Purchased<input type="date" value={form.purchaseDate} onChange={(event) => setField('purchaseDate', event.target.value)} /></label>
            <label className="inventory-field">Warranty ends<input type="date" value={form.warrantyEndDate} onChange={(event) => setField('warrantyEndDate', event.target.value)} /></label>
            <label className="inventory-field inventory-field-wide">Notes<textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} placeholder="Anything worth remembering about this item" /></label>
          </div>
          {createItem.isError && <p className="inventory-form-error" role="alert">{errorText(createItem.error)}</p>}
          <div className="modal-actions"><button type="button" className="inventory-button inventory-button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="inventory-button inventory-button-primary" disabled={createItem.isPending}>{createItem.isPending ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />} {createItem.isPending ? 'Adding item' : 'Add item'}</button></div>
        </form>
      </section>
    </div>
  );
}

function EditItemDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateInventoryItem();
  const [form, setForm] = useState<ItemFormState>({
    category: item.category,
    name: item.name,
    manufacturer: item.manufacturer ?? '',
    model: item.model ?? '',
    serialNumber: item.serialNumber ?? '',
    purchaseDate: item.purchaseDate?.slice(0, 10) ?? '',
    warrantyStartDate: item.warrantyStartDate?.slice(0, 10) ?? '',
    warrantyEndDate: item.warrantyEndDate?.slice(0, 10) ?? '',
    notes: item.notes ?? '',
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || update.isPending) return;
    update.mutate({ itemId: item.id, data: { ...form, name: form.name.trim(), manufacturer: form.manufacturer.trim() || null, model: form.model.trim() || null, serialNumber: form.serialNumber.trim() || null, purchaseDate: form.purchaseDate || null, warrantyStartDate: form.warrantyStartDate || null, warrantyEndDate: form.warrantyEndDate || null, notes: form.notes.trim() || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(item.id) });
        queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
        onClose();
      },
    });
  };
  return <Dialog title="Edit item" onClose={onClose}><form className="inventory-form" onSubmit={submit}><div className="inventory-form-grid"><label className="inventory-field inventory-field-wide">Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="inventory-field">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as InventoryItemCategory })}>{categories.slice(1).map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label><label className="inventory-field">Manufacturer<input value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} /></label><label className="inventory-field">Model number<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label><label className="inventory-field">Serial number<input value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></label><label className="inventory-field">Warranty ends<input type="date" value={form.warrantyEndDate} onChange={(event) => setForm({ ...form, warrantyEndDate: event.target.value })} /></label><label className="inventory-field inventory-field-wide">Notes<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div>{update.isError && <p className="inventory-form-error">{errorText(update.error)}</p>}<div className="modal-actions"><button type="button" className="inventory-button inventory-button-quiet" onClick={onClose}>Cancel</button><button className="inventory-button inventory-button-primary" disabled={update.isPending}>{update.isPending ? 'Saving' : 'Save changes'}</button></div></form></Dialog>;
}

export function InventoryPage() {
  const { isSignedIn } = useUser();
  const [filter, setFilter] = useState<InventoryItemCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const inventory = useListInventoryItems({ query: { queryKey: getListInventoryItemsQueryKey(), enabled: Boolean(isSignedIn), staleTime: 30_000 } });
  const items = useMemo(() => (inventory.data ?? []).filter((item) => filter === 'all' || item.category === filter), [inventory.data, filter]);
  if (!isSignedIn) return <InventoryFrame title="Your home, kept in order"><SignedOutGate /></InventoryFrame>;
  return (
    <InventoryFrame title="Your home, kept in order" action={<button className="inventory-button inventory-button-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add item</button>}>
      <section className="inventory-intro-band"><div><strong>{inventory.data?.length ?? 0} {inventory.data?.length === 1 ? 'item' : 'items'}</strong><span>Small details now make repairs easier later.</span></div><div className="inventory-trust"><ShieldCheck size={17} /> You decide what a repairer sees</div></section>
      <nav className="inventory-filters" aria-label="Filter inventory">{categories.map((category) => <button key={category.value} className={filter === category.value ? 'active' : ''} onClick={() => setFilter(category.value)}>{category.label}</button>)}</nav>
      {inventory.isPending && <div className="inventory-list-skeleton" aria-label="Loading inventory"><span /><span /><span /></div>}
      {inventory.isError && <div className="inventory-state inventory-state-error"><CircleAlert size={22} /><div><strong>We could not load your inventory.</strong><p>{errorText(inventory.error)}</p></div><button onClick={() => inventory.refetch()}>Try again</button></div>}
      {!inventory.isPending && !inventory.isError && items.length === 0 && <div className="inventory-empty"><div className="inventory-empty-icon"><ClipboardCheck size={22} /></div><h2>{filter === 'all' ? 'Your inventory starts here.' : `No ${categoryLabel(filter).toLowerCase()} items yet.`}</h2><p>Record the things you rely on at home. Add model and warranty details when you have them to save time later.</p><button className="inventory-button inventory-button-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add your first item</button></div>}
      {!inventory.isPending && !inventory.isError && items.length > 0 && <div className="inventory-grid">{items.map((item) => <InventoryCard key={item.id} item={item} />)}</div>}
      {showAdd && <AddItemDialog onClose={() => setShowAdd(false)} />}
    </InventoryFrame>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const Icon = categoryIcon[item.category] ?? House;
  return <Link href={`/inventory/${item.id}`} className="inventory-card"><div className="inventory-card-icon"><Icon size={21} /></div><div className="inventory-card-body"><div className="inventory-card-top"><span>{categoryLabel(item.category)}</span><ChevronRight size={16} /></div><h2>{item.name}</h2><p>{[item.manufacturer, item.model].filter(Boolean).join(' · ') || 'Add model details when you have them.'}</p><div className="inventory-card-foot"><span>{item.warrantyEndDate ? `Warranty to ${dateLabel(item.warrantyEndDate)}` : 'Warranty not recorded'}</span><span className="record-dot" /></div></div></Link>;
}

type ReminderForm = { title: string; dueDate: string; notes: string };
type RepairForm = { fault: string; diagnosis: string; quotePence: string; finalRepair: string; finalCostPence: string; completedDate: string };

function DetailSection({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="detail-section"><div className="detail-section-header"><div>{eyebrow && <span className="inventory-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}

export function InventoryDetailPage() {
  const { itemId = '' } = useParams<{ itemId: string }>();
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showReminder, setShowReminder] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const detail = useGetInventoryItem(itemId, { query: { queryKey: getGetInventoryItemQueryKey(itemId), enabled: Boolean(isSignedIn && itemId) } });
  const diagnoses = useListInventoryDiagnoses(itemId, { query: { queryKey: getListInventoryDiagnosesQueryKey(itemId), enabled: Boolean(isSignedIn && itemId) } });
  const reminders = useListInventoryReminders(itemId, { query: { queryKey: getListInventoryRemindersQueryKey(itemId), enabled: Boolean(isSignedIn && itemId) } });
  const repairs = useListInventoryRepairs(itemId, { query: { queryKey: getListInventoryRepairsQueryKey(itemId), enabled: Boolean(isSignedIn && itemId) } });
  const item = detail.data?.item;
  const deleteItem = useDeleteInventoryItem();
  if (!isSignedIn) return <InventoryFrame eyebrow="Household inventory" title="Private item"><SignedOutGate detail /></InventoryFrame>;
  return (
    <InventoryFrame eyebrow="Household inventory / item" title={item?.name ?? 'Item details'} action={<Link href="/inventory" className="inventory-button inventory-button-quiet"><ArrowLeft size={16} /> Inventory</Link>}>
      {detail.isPending && <div className="detail-loading"><span /><span /><span /></div>}
      {detail.isError && <div className="inventory-state inventory-state-error"><CircleAlert size={22} /><div><strong>We could not open this item.</strong><p>{errorText(detail.error)}</p></div><button onClick={() => detail.refetch()}>Try again</button></div>}
      {item && <div className="detail-layout">
         <aside className="detail-aside"><div className="detail-object-icon">{(() => { const Icon = categoryIcon[item.category] ?? House; return <Icon size={28} />; })()}</div><span className="inventory-eyebrow">{categoryLabel(item.category)}</span><h2>{item.name}</h2><p>{item.notes || 'No notes added yet.'}</p><div className="aside-rule" /><div className="aside-meta"><span>Added</span><strong>{dateLabel(item.createdAt)}</strong></div><Link className="inventory-button inventory-button-primary full-width" href="/app" onClick={() => sessionStorage.setItem('fixmate_inventory_item_id', item.id)}><Sparkles size={16} /> Diagnose this item</Link><button className="inventory-button inventory-button-quiet full-width" onClick={() => setShowShare(true)}><Share2 size={16} /> Create repair report</button><button className="inventory-button inventory-button-quiet full-width" onClick={() => setShowEdit(true)}><Pencil size={16} /> Edit item</button><button className="danger-text-action" disabled={deleteItem.isPending} onClick={() => { if (!window.confirm('Delete this item and its records?')) return; deleteItem.mutate({ itemId }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() }); setLocation('/inventory'); } }); }}><Trash2 size={15} /> Delete item</button></aside>
        <div className="detail-main">
          <DetailSection title="The useful bits" eyebrow="Item record">
            <div className="detail-facts">{[['Manufacturer', item.manufacturer], ['Model number', item.model], ['Serial number', item.serialNumber], ['Purchased', dateLabel(item.purchaseDate)], ['Warranty starts', dateLabel(item.warrantyStartDate)], ['Warranty ends', dateLabel(item.warrantyEndDate)]].map(([label, value]) => <div className="detail-fact" key={label}><span>{label}</span><strong>{value || 'Not recorded'}</strong></div>)}</div>
          </DetailSection>
           <DetailSection title="Documents" eyebrow="Receipts and manuals">
             <DocumentSection itemId={itemId} documents={detail.data?.documents ?? []} />
           </DetailSection>
          <DetailSection title="Maintenance reminders" eyebrow="Keep things ticking" action={<button className="text-action" onClick={() => setShowReminder(true)}><Plus size={15} /> Add reminder</button>}>
            <ReminderList itemId={itemId} reminders={reminders.data ?? detail.data?.reminders ?? []} isLoading={reminders.isPending} error={reminders.error} onRetry={() => reminders.refetch()} />
          </DetailSection>
          <DetailSection title="Repair history" eyebrow="What has happened" action={<button className="text-action" onClick={() => setShowRepair(true)}><Plus size={15} /> Add repair</button>}>
            <RepairList itemId={itemId} repairs={repairs.data ?? detail.data?.repairs ?? []} isLoading={repairs.isPending} error={repairs.error} onRetry={() => repairs.refetch()} />
          </DetailSection>
          <DetailSection title="Diagnosis history" eyebrow="FixMate notes">
            {diagnoses.isPending ? <div className="mini-skeleton" /> : diagnoses.isError ? <InlineError message={errorText(diagnoses.error)} onRetry={() => diagnoses.refetch()} /> : diagnoses.data?.length ? <div className="diagnosis-list">{diagnoses.data.map((diagnosis) => <div className="diagnosis-row" key={diagnosis.id}><div className="diagnosis-status"><Sparkles size={15} /></div><div><strong>{diagnosis.headline}</strong><p>{diagnosis.likelyProblem}</p></div><span>{dateLabel(diagnosis.generatedAt)}</span></div>)}</div> : <EmptyLine icon={<Sparkles size={17} />} text="No saved diagnoses for this item yet." />}
          </DetailSection>
        </div>
      </div>}
      {showReminder && <ReminderDialog itemId={itemId} onClose={() => setShowReminder(false)} />}
      {showRepair && <RepairDialog itemId={itemId} onClose={() => setShowRepair(false)} />}
      {showShare && item && <ShareDialog item={item} repairs={repairs.data ?? detail.data?.repairs ?? []} diagnoses={diagnoses.data ?? []} onClose={() => setShowShare(false)} onCreated={(url) => setLocation(url)} />}
      {showEdit && item && <EditItemDialog item={item} onClose={() => setShowEdit(false)} />}
    </InventoryFrame>
  );
}

function EmptyLine({ icon, text }: { icon: ReactNode; text: string }) { return <div className="empty-line">{icon}<span>{text}</span></div>; }
function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="inline-error"><CircleAlert size={16} /><span>{message}</span><button onClick={onRetry}>Retry</button></div>; }

function DocumentSection({ itemId, documents }: { itemId: string; documents: InventoryDocument[] }) {
  const queryClient = useQueryClient();
  const requestUpload = useRequestUploadUrl();
  const createDocument = useCreateInventoryDocument();
  const deleteDocument = useDeleteInventoryDocument();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const signed = await requestUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type || 'application/octet-stream' } });
      const response = await fetch(signed.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      await createDocument.mutateAsync({ itemId, data: { title: file.name, documentType: file.type === 'application/pdf' ? 'manual_or_receipt' : 'supporting_document', objectPath: signed.objectPath, contentType: file.type || 'application/octet-stream', sizeBytes: file.size, uploadToken: signed.uploadToken, expiresAt: signed.expiresAt } });
      queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(itemId) });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The document could not be saved.');
    } finally {
      setUploading(false);
    }
  };

  return <div className="document-panel"><label className="document-upload"><FileText size={18} /><span>{uploading ? 'Uploading document…' : 'Add a PDF, receipt, or manual'}</span><input type="file" accept=".pdf,application/pdf,image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} /></label>{uploadError && <p className="inventory-form-error">{uploadError}</p>}{documents.length ? <div className="document-list">{documents.map((document) => <div className="document-row" key={document.id}><FileText size={17} /><div><strong>{document.title}</strong><span>{document.documentType.replaceAll('_', ' ')} · {Math.ceil(document.sizeBytes / 1024)} KB</span></div><button className="icon-button" aria-label={`Delete ${document.title}`} disabled={deleteDocument.isPending} onClick={() => { if (!window.confirm(`Delete ${document.title}?`)) return; deleteDocument.mutate({ itemId, documentId: document.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(itemId) }) }); }}><Trash2 size={16} /></button></div>)}</div> : <EmptyLine icon={<FileText size={17} />} text="Keep receipts and manuals here without adding them to a shared report." />}</div>;
}

function ReminderList({ itemId, reminders, isLoading, error, onRetry }: { itemId: string; reminders: Array<{ id: string; title: string; dueDate: string; notes: string | null; completed: boolean }>; isLoading: boolean; error: unknown; onRetry: () => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateInventoryReminder();
  if (isLoading) return <div className="mini-skeleton" />;
  if (error) return <InlineError message={errorText(error)} onRetry={onRetry} />;
  if (!reminders.length) return <EmptyLine icon={<CalendarDays size={17} />} text="No maintenance reminders. Add one for filters, seals, or a service date." />;
  return <div className="reminder-list">{reminders.map((reminder) => <div className={`reminder-row ${reminder.completed ? 'complete' : ''}`} key={reminder.id}><button className="check-button" aria-label={reminder.completed ? `Mark ${reminder.title} incomplete` : `Mark ${reminder.title} complete`} onClick={() => update.mutate({ itemId, reminderId: reminder.id, data: { completed: !reminder.completed } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInventoryRemindersQueryKey(itemId) }) })}>{reminder.completed ? <CheckCircle2 size={19} /> : <span />}</button><div><strong>{reminder.title}</strong>{reminder.notes && <p>{reminder.notes}</p>}</div><time>{dateLabel(reminder.dueDate)}</time></div>)}</div>;
}

function RepairList({ itemId, repairs, isLoading, error, onRetry }: { itemId: string; repairs: Array<{ id: string; diagnosisId: string | null; marketplaceJobId: string | null; marketplaceQuoteId: string | null; fault: string; diagnosis: string; quotePence: number | null; beforeMediaRefs: string[]; afterMediaRefs: string[]; finalRepair: string; finalCostPence: number | null; completedDate: string | null }>; isLoading: boolean; error: unknown; onRetry: () => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateInventoryRepair();
  if (isLoading) return <div className="mini-skeleton" />;
  if (error) return <InlineError message={errorText(error)} onRetry={onRetry} />;
  if (!repairs.length) return <EmptyLine icon={<Hammer size={17} />} text="No repair records yet. Keep the next repairer's notes here." />;
  return <div className="repair-list">{repairs.map((repair) => <article className="repair-row" key={repair.id}><div className="repair-row-heading"><span className="repair-date">{repair.completedDate ? dateLabel(repair.completedDate) : 'In progress'}</span>{repair.finalCostPence != null && <strong>{moneyLabel(repair.finalCostPence)}</strong>}</div><h3>{repair.fault}</h3><p>{repair.finalRepair || repair.diagnosis}</p>{repair.quotePence != null && <span className="repair-quote">Quoted {moneyLabel(repair.quotePence)}</span>}{!repair.completedDate && <button className="repair-complete-action" disabled={update.isPending} onClick={() => update.mutate({ itemId, repairId: repair.id, data: { diagnosisId: repair.diagnosisId, marketplaceJobId: repair.marketplaceJobId, marketplaceQuoteId: repair.marketplaceQuoteId, fault: repair.fault, diagnosis: repair.diagnosis, quotePence: repair.quotePence, beforeMediaRefs: repair.beforeMediaRefs, afterMediaRefs: repair.afterMediaRefs, finalRepair: repair.finalRepair, finalCostPence: repair.finalCostPence, completedDate: new Date().toISOString() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInventoryRepairsQueryKey(itemId) }) })}>Mark complete</button>}</article>)}</div>;
}

function ReminderDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useCreateInventoryReminder();
  const [form, setForm] = useState<ReminderForm>({ title: '', dueDate: '', notes: '' });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.title.trim() || !form.dueDate) return; create.mutate({ itemId, data: { title: form.title.trim(), dueDate: form.dueDate, notes: form.notes.trim() || null } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInventoryRemindersQueryKey(itemId) }); queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(itemId) }); onClose(); } }); };
  return <Dialog title="Add a reminder" onClose={onClose}><form className="inventory-form" onSubmit={submit}><label className="inventory-field">Reminder title<input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Clean the filter" /></label><label className="inventory-field">Due date<input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label className="inventory-field">Note<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{create.isError && <p className="inventory-form-error">{errorText(create.error)}</p>}<div className="modal-actions"><button type="button" className="inventory-button inventory-button-quiet" onClick={onClose}>Cancel</button><button className="inventory-button inventory-button-primary" disabled={create.isPending}>{create.isPending ? 'Saving' : 'Save reminder'}</button></div></form></Dialog>;
}

function RepairDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useCreateInventoryRepair();
  const [form, setForm] = useState<RepairForm>({ fault: '', diagnosis: '', quotePence: '', finalRepair: '', finalCostPence: '', completedDate: '' });
  const setField = (field: keyof RepairForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.fault.trim() || !form.diagnosis.trim() || !form.finalRepair.trim()) return; create.mutate({ itemId, data: { fault: form.fault.trim(), diagnosis: form.diagnosis.trim(), quotePence: form.quotePence ? Number(form.quotePence) * 100 : null, finalRepair: form.finalRepair.trim(), finalCostPence: form.finalCostPence ? Number(form.finalCostPence) * 100 : null, completedDate: form.completedDate || null, beforeMediaRefs: [], afterMediaRefs: [] } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInventoryRepairsQueryKey(itemId) }); queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(itemId) }); onClose(); } }); };
  return <Dialog title="Add a repair record" onClose={onClose}><form className="inventory-form" onSubmit={submit}><label className="inventory-field">What went wrong?<textarea required autoFocus rows={2} value={form.fault} onChange={(event) => setField('fault', event.target.value)} /></label><label className="inventory-field">Diagnosis<textarea required rows={2} value={form.diagnosis} onChange={(event) => setField('diagnosis', event.target.value)} /></label><div className="inventory-form-grid"><label className="inventory-field">Quoted cost (£)<input type="number" min="0" step="0.01" value={form.quotePence} onChange={(event) => setField('quotePence', event.target.value)} /></label><label className="inventory-field">Completed date<input type="date" value={form.completedDate} onChange={(event) => setField('completedDate', event.target.value)} /></label></div><label className="inventory-field">What was repaired?<textarea required rows={2} value={form.finalRepair} onChange={(event) => setField('finalRepair', event.target.value)} /></label><label className="inventory-field">Final cost (£)<input type="number" min="0" step="0.01" value={form.finalCostPence} onChange={(event) => setField('finalCostPence', event.target.value)} /></label>{create.isError && <p className="inventory-form-error">{errorText(create.error)}</p>}<div className="modal-actions"><button type="button" className="inventory-button inventory-button-quiet" onClick={onClose}>Cancel</button><button className="inventory-button inventory-button-primary" disabled={create.isPending}>{create.isPending ? 'Saving' : 'Save repair'}</button></div></form></Dialog>;
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="inventory-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="inventory-modal compact" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</section></div>; }

function ShareDialog({ item, repairs, diagnoses, onClose, onCreated }: { item: InventoryItem; repairs: Array<{ id: string }>; diagnoses: Array<{ id: string }>; onClose: () => void; onCreated: (url: string) => void }) {
  const createShare = useCreateRepairReportShare();
  const [repairRecordId, setRepairRecordId] = useState(repairs[0]?.id ?? '');
  const [problem, setProblem] = useState('');
  const [questions, setQuestions] = useState('');
  const [selection, setSelection] = useState<RepairReportSelection>({ includeItem: true, includeModel: true, includeProblem: true, includeDiagnosis: false, includeSafetyWarnings: false, includeQuestions: false, includeRepairRecord: Boolean(repairs[0]), mediaRefs: [] });
  const toggle = (key: keyof Omit<RepairReportSelection, 'mediaRefs'>) => setSelection((current) => ({ ...current, [key]: !current[key] }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createShare.mutate(
      { data: { itemId: item.id, repairRecordId: selection.includeRepairRecord ? repairRecordId || null : null, problem: selection.includeProblem ? problem.trim() || null : null, questions: selection.includeQuestions ? questions.trim() || null : null, selection: { ...selection, mediaRefs: selection.mediaRefs } } },
      {
        onSuccess: (share) => {
          trackEvent('repair_report_created', {
            included_item: selection.includeItem,
            included_model: selection.includeModel,
            included_problem: selection.includeProblem,
            included_diagnosis: selection.includeDiagnosis,
            included_safety_warnings: selection.includeSafetyWarnings,
            included_questions: selection.includeQuestions,
            included_repair_record: selection.includeRepairRecord,
            has_expiry: Boolean(share.expiresAt),
          });
          onCreated(`/repair-report/${share.id}`);
        },
        onError: () => trackEvent('repair_report_create_failed'),
      },
    );
  };
  const choices: Array<[keyof Omit<RepairReportSelection, 'mediaRefs'>, string, string]> = [['includeItem', 'Item name', 'Help the repairer know what they are looking at'], ['includeModel', 'Model and manufacturer', 'Useful for parts and compatibility'], ['includeProblem', 'Problem description', 'The issue as you describe it'], ['includeDiagnosis', 'FixMate diagnosis', diagnoses.length ? 'Share the saved diagnosis' : 'No diagnosis saved for this item'], ['includeSafetyWarnings', 'Safety warnings', 'Important handling guidance'], ['includeQuestions', 'Questions for the repairer', 'What you would like answered'], ['includeRepairRecord', 'Repair record', repairs.length ? 'Include a previous repair' : 'No repair record saved yet']];
  return <Dialog title="Choose what to share" onClose={onClose}><form className="share-form" onSubmit={submit}><div className="share-notice"><ShieldCheck size={18} /><p>Only the fields you approve will be included. Your postcode and diagnosis IDs are never added to this report link.</p></div><div className="share-choices">{choices.map(([key, label, hint]) => <label className={`share-choice ${!selection[key] ? 'off' : ''}`} key={key}><input type="checkbox" checked={selection[key]} onChange={() => toggle(key)} disabled={(key === 'includeDiagnosis' && !diagnoses.length) || (key === 'includeRepairRecord' && !repairs.length)} /><span><strong>{label}</strong><small>{hint}</small></span><Check size={15} /></label>)}</div>{selection.includeRepairRecord && repairs.length > 0 && <label className="inventory-field">Which repair record?<select value={repairRecordId} onChange={(event) => setRepairRecordId(event.target.value)}>{repairs.map((repair) => <option key={repair.id} value={repair.id}>Repair record {repair.id.slice(0, 8)}</option>)}</select></label>}{selection.includeProblem && <label className="inventory-field">Problem description<textarea rows={3} value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="What is happening?" /></label>}{selection.includeQuestions && <label className="inventory-field">Questions for the repairer<textarea rows={2} value={questions} onChange={(event) => setQuestions(event.target.value)} /></label>}{createShare.isError && <p className="inventory-form-error">{errorText(createShare.error)}</p>}<div className="modal-actions"><button type="button" className="inventory-button inventory-button-quiet" onClick={onClose}>Cancel</button><button className="inventory-button inventory-button-primary" disabled={createShare.isPending}><Share2 size={16} />{createShare.isPending ? 'Creating private link' : 'Create report link'}</button></div></form></Dialog>;
}

export function RepairReportPage() {
  const { reportId = '' } = useParams<{ reportId: string }>();
  const report = useGetRepairReportShare(reportId, { query: { queryKey: getGetRepairReportShareQueryKey(reportId), enabled: Boolean(reportId) } });
  const fields = report.data?.fields ?? {};
  useEffect(() => {
    if (report.data) {
      trackEvent('repair_report_viewed', {
        field_count: Object.values(report.data.fields ?? {}).filter((value) => value != null && value !== '').length,
        has_expiry: Boolean(report.data.expiresAt),
      });
    } else if (report.isError) {
      trackEvent('repair_report_view_failed');
    }
  }, [report.data, report.isError]);
  return <div className="fixmate-app report-app"><main className="report-shell"><header className="report-header"><Link href="/" className="brand"><span className="brand-mark"><Wrench size={17} /></span><span>fixmate</span></Link><span className="report-readonly"><LockKeyhole size={13} /> Read-only report</span></header>{report.isPending && <div className="report-skeleton"><span /><span /><span /></div>}{report.isError && <div className="inventory-state inventory-state-error"><CircleAlert size={22} /><div><strong>This report is unavailable.</strong><p>{errorText(report.error)}</p></div></div>}{report.data && <article className="report-card"><div className="report-card-top"><div><span className="inventory-eyebrow">Repair handover</span><h1>{typeof fields.item === 'string' ? fields.item : 'Household repair report'}</h1></div><div className="report-seal"><ShieldCheck size={19} /><span>Approved<br />by owner</span></div></div><p className="report-date">Created {dateLabel(report.data.createdAt)}{report.data.expiresAt ? ` · Available until ${dateLabel(report.data.expiresAt)}` : ''}</p><div className="report-fields">{Object.entries(fields).filter(([key, value]) => key !== 'item' && value != null && value !== '').map(([key, value]) => <div className="report-field" key={key}><span>{key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</span><strong>{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</strong></div>)}</div><div className="report-footer"><ShieldCheck size={15} /> This report only contains details explicitly approved for sharing.</div></article>}</main></div>;
}

export default InventoryPage;