import { type FormEvent, useState, useEffect, useRef } from 'react';
import { useCreateRepairJob } from '@workspace/api-client-react';
import { BriefcaseBusiness, LoaderCircle, Plus } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { PhotoUploader, type UploadedPhoto } from './PhotoUploader';

type MarketplaceDraft = {
  title: string;
  itemType: string;
  category: 'appliance' | 'plumbing' | 'painting' | 'electrical';
  description: string;
  postcode: string;
  diagnosisId?: string;
};

function readMarketplaceDraft(): MarketplaceDraft | null {
  try {
    const value = sessionStorage.getItem('fixmate_marketplace_draft');
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const draft = parsed as Record<string, unknown>;
    const category: MarketplaceDraft['category'] =
      draft.category === 'plumbing' || draft.category === 'painting' || draft.category === 'electrical'
        ? draft.category
        : 'appliance';
    const normalized: MarketplaceDraft = {
      title: typeof draft.title === 'string' ? draft.title.slice(0, 120) : '',
      itemType: typeof draft.itemType === 'string' ? draft.itemType.slice(0, 80) : '',
      category,
      description: typeof draft.description === 'string' ? draft.description.slice(0, 1200) : '',
      postcode: typeof draft.postcode === 'string' ? draft.postcode.slice(0, 8) : '',
      diagnosisId: typeof draft.diagnosisId === 'string' ? draft.diagnosisId : undefined,
    };
    trackEvent('repair_job_form_prefilled', {
      has_title: Boolean(normalized.title),
      has_item_type: Boolean(normalized.itemType),
      has_description: Boolean(normalized.description),
      has_postcode: Boolean(normalized.postcode),
    });
    return normalized;
  } catch {
    return null;
  }
}

export function CustomerJobForm({ onSuccess }: { onSuccess: () => void }) {
  const createJob = useCreateRepairJob();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [draft] = useState(readMarketplaceDraft);

  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, []);

  const submitJob = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    
    createJob.mutate(
      {
        data: {
          title: String(form.get('title')),
          itemType: String(form.get('itemType')),
          category: String(form.get('category')) as 'appliance' | 'plumbing' | 'painting' | 'electrical',
          description: String(form.get('description')),
          postcode: String(form.get('postcode')),
           diagnosisId: draft?.diagnosisId ?? undefined,
          photoRefs: photos.map((p) => ({
            objectPath: p.objectPath,
            uploadToken: p.uploadToken,
            name: p.name,
            contentType: p.contentType,
            size: p.size,
          })),
        },
      },
      {
        onSuccess: () => {
          trackEvent('repair_job_posted', { item_type: String(form.get('itemType')) });
          try {
            sessionStorage.removeItem('fixmate_marketplace_draft');
          } catch {
            // The submitted job still succeeded if browser storage is unavailable.
          }
          formElement.reset();
          // Revoke URLs for the uploaded photos on success since we are clearing them
          photos.forEach(p => URL.revokeObjectURL(p.url));
          setPhotos([]);
          onSuccess();
        },
        onError: () => trackEvent('repair_job_post_failed'),
      }
    );
  };

  return (
    <form className="panel market-form" onSubmit={submitJob}>
      <div className="market-heading">
        <Plus size={18} />
        <div>
          <strong>Post a job</strong>
          <span>Tell local workers what you need done. They can send a clear offer.</span>
        </div>
      </div>
      {draft && (
        <div className="market-diagnosis-note" data-testid="panel-diagnosis-summary">
          <strong>Diagnosis summary added</strong>
          <span>Your diagnosis will help the right worker understand the problem.</span>
        </div>
      )}
      <div className="market-form-note" data-testid="text-job-safety-note">For safety, do not include phone numbers, payment details, or requests to move conversations off FixMate.</div>
      <label>
        Job title
        <input data-testid="input-job-title" name="title" required minLength={3} maxLength={120} placeholder="Fit a shelf in the hallway" defaultValue={draft?.title ?? ''} />
      </label>
      <label>
        Job category
        <select data-testid="select-job-category" name="category" defaultValue={draft?.category ?? 'appliance'}>
           <option value="appliance">Home appliances</option>
          <option value="plumbing">Plumbing</option>
          <option value="painting">Painting and decorating</option>
          <option value="electrical">Electrical</option>
        </select>
       </label>
       <label>
        What is the job about?
        <input data-testid="input-job-type" name="itemType" required maxLength={80} placeholder="Shelf, tap, wall, appliance" defaultValue={draft?.itemType ?? ''} />
      </label>
      <label>
        Describe what needs doing
        <textarea data-testid="input-job-description" name="description" required minLength={10} maxLength={1200} placeholder="Share the outcome you need, access details, and anything a worker should know." defaultValue={draft?.description ?? ''} />
      </label>
      <label>
        Photos (up to 5)
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={5} />
      </label>
      <label>
        Where is the job?
        <input data-testid="input-job-postcode" name="postcode" required minLength={3} maxLength={8} autoComplete="postal-code" placeholder="SW1A 1AA" defaultValue={draft?.postcode ?? ''} />
        <small>Workers see only the postcode area until both sides agree on a price. The full postcode is shared with the chosen worker afterward.</small>
      </label>
      <button data-testid="button-post-job" className="submit-button" disabled={createJob.isPending}>
        {createJob.isPending ? <LoaderCircle className="animate-spin" /> : <BriefcaseBusiness />} Post job
      </button>
    </form>
  );
}
