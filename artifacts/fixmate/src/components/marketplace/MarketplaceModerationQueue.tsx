import { useState } from 'react';
import {
  useListMarketplaceReports,
  useUpdateMarketplaceReport,
  getListMarketplaceReportsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ShieldAlert, X } from 'lucide-react';

export function MarketplaceModerationQueue() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const reports = useListMarketplaceReports(
    { status: 'open' },
    { query: { enabled: open, queryKey: getListMarketplaceReportsQueryKey({ status: 'open' }) } },
  );
  const updateReport = useUpdateMarketplaceReport();

  if (!open) {
    return (
      <button type="button" className="moderation-launch" onClick={() => setOpen(true)}>
        <ShieldAlert size={14} /> Open moderation queue
      </button>
    );
  }

  if (reports.isError) {
    return <div className="moderation-denied">This queue is available to FixMate moderators only.</div>;
  }

  return (
    <section className="moderation-queue panel">
      <div className="moderation-header">
        <div>
          <strong>Marketplace moderation</strong>
          <span>Review reports without exposing private message threads.</span>
        </div>
        <button type="button" className="safety-action" onClick={() => setOpen(false)}>Close</button>
      </div>
      {reports.isPending ? (
        <div className="market-empty">Loading reports…</div>
      ) : reports.data?.length ? (
        <div className="moderation-list">
          {reports.data.map((report) => (
            <article className="moderation-item" key={report.id}>
              <div>
                <strong>{report.reason} · {report.targetType}</strong>
                <span>Target: {report.targetId}</span>
                {report.details && <p>{report.details}</p>}
                <small>{new Date(report.createdAt).toLocaleString('en-GB')}</small>
              </div>
              <div className="moderation-actions">
                <button
                  type="button"
                  onClick={() => updateReport.mutate(
                    { reportId: report.id, data: { status: 'resolved' } },
                    { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMarketplaceReportsQueryKey({ status: 'open' }) }) },
                  )}
                  disabled={updateReport.isPending}
                >
                  <Check size={13} /> Resolve
                </button>
                <button
                  type="button"
                  onClick={() => updateReport.mutate(
                    { reportId: report.id, data: { status: 'dismissed' } },
                    { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMarketplaceReportsQueryKey({ status: 'open' }) }) },
                  )}
                  disabled={updateReport.isPending}
                >
                  <X size={13} /> Dismiss
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="market-empty">No open reports.</div>
      )}
    </section>
  );
}