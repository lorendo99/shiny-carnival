import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListRepairJobs,
  useListPublicRepairJobs,
  getListRepairJobsQueryKey,
  type RepairJob,
  type PublicRepairJob,
} from '@workspace/api-client-react';
import { BriefcaseBusiness } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { CustomerJobForm } from './CustomerJobForm';
import { CustomerJobDetails } from './CustomerJobDetails';

const jobCategoryLabel = (category: RepairJob['category']) => ({
  appliance: 'Home appliances',
  plumbing: 'Plumbing',
  painting: 'Painting and decorating',
  electrical: 'Electrical',
}[category]);

export function CustomerView() {
  const queryClient = useQueryClient();
  const customerJobs = useListRepairJobs({ scope: 'mine' }, { query: {
    queryKey: getListRepairJobsQueryKey({ scope: 'mine' }),
    refetchInterval: 5000,
  } });
  const publicJobs = useListPublicRepairJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJob = customerJobs.data?.find((job) => job.id === selectedJobId) ?? null;

  const refreshJobs = () => queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey({ scope: 'mine' }) });

  return (
    <div className="market-grid" id="market-grid-top">
      <div className="customer-left-col">
        <CustomerJobForm onSuccess={refreshJobs} />
        
        <section className="market-list">
          <div className="market-heading">
            <BriefcaseBusiness size={18} />
            <div>
              <strong>Your jobs</strong>
              <span>Compare prices and negotiate before choosing; your full postcode is shared only after both sides agree.</span>
            </div>
          </div>
          {customerJobs.isPending ? (
            <div className="market-skeleton" role="status" aria-label="Loading"><i /><i /><i /></div>
          ) : customerJobs.data?.length ? (
            customerJobs.data.map((job) => (
                <button
                  data-testid={`button-select-job-${job.id}`}
                key={job.id} 
                  className={`job-card ${selectedJobId === job.id ? 'selected' : ''}`} 
                onClick={() => { 
                  setSelectedJobId(job.id); 
                  trackEvent('repair_job_selected', { status: job.status }); 
                  if (window.innerWidth <= 800) {
                    document.getElementById('market-grid-top')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <div>
                  <strong>{job.title}</strong>
                  <span>{jobCategoryLabel(job.category)} · {job.itemType} · {job.postcode}</span>
                  {job.photoRefs && job.photoRefs.length > 0 && (
                    <span className="photo-count">{job.photoRefs.length} photo{job.photoRefs.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                  <span className={`job-status ${job.status}`} data-testid={`status-job-${job.id}`}>{job.status === 'pending_payment' ? 'payment needed' : job.status === 'accepted' ? 'in progress' : job.status}</span>
              </button>
            ))
          ) : (
            <div className="market-empty" data-testid="empty-customer-jobs">No jobs yet. Post your first one to start receiving offers.</div>
          )}
        </section>
      </div>

      <div className="customer-right-col">
          {selectedJob ? <CustomerJobDetails job={selectedJob} /> : (
            <section className="market-list selection-prompt" data-testid="empty-selected-job">
              <div className="market-heading"><BriefcaseBusiness size={18} /><div><strong>Your job control centre</strong><span>Select a job to compare offers, message workers and track the next step.</span></div></div>
            </section>
          )}
        <section className="market-list public-jobs-list">
          <div className="market-heading">
            <BriefcaseBusiness size={18} />
            <div>
              <strong>Open jobs on FixMate</strong>
              <span>Workers can discover these tasks and send an offer.</span>
            </div>
          </div>
          {publicJobs.isPending ? (
            <div className="market-skeleton" role="status" aria-label="Loading"><i /><i /><i /></div>
          ) : publicJobs.data?.length ? (
            publicJobs.data.map((job) => <PublicJobCard key={job.id} job={job} />)
          ) : (
            <div className="market-empty" data-testid="empty-open-jobs">No open jobs are available yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function PublicJobCard({ job }: { job: PublicRepairJob }) {
  return (
    <article className="job-card public-job-card" data-testid={`card-open-job-${job.id}`}>
      <div>
        <strong>{job.title}</strong>
        <span>{jobCategoryLabel(job.category)} · Area {job.postcode}</span>
        <p className="public-job-description">{job.description}</p>
      </div>
      <span className="job-status open" data-testid={`status-open-job-${job.id}`}>open for offers</span>
    </article>
  );
}
