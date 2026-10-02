import { useState } from 'react';
import {
  useBlockMarketplaceUser,
  useCreateMarketplaceReport,
  type MarketplaceReportInputReason,
  type MarketplaceReportInputTargetType,
} from '@workspace/api-client-react';
import { Flag, ShieldBan } from 'lucide-react';

const reasons: Array<{ value: MarketplaceReportInputReason; label: string }> = [
  { value: 'unsafe', label: 'Unsafe or dangerous' },
  { value: 'fraud', label: 'Fraud or payment scam' },
  { value: 'abuse', label: 'Abusive or threatening' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

export function MarketplaceSafetyActions({
  targetType,
  targetId,
  blockedUserId,
  compact = false,
}: {
  targetType: MarketplaceReportInputTargetType;
  targetId: string;
  blockedUserId?: string;
  compact?: boolean;
}) {
  const report = useCreateMarketplaceReport();
  const block = useBlockMarketplaceUser();
  const [status, setStatus] = useState<string | null>(null);

  const handleReport = () => {
    const selected = window.prompt(`Why are you reporting this?\n${reasons.map((reason, index) => `${index + 1}. ${reason.label}`).join('\n')}`, '1');
    const reason = Number(selected) - 1;
    if (!Number.isInteger(reason) || !reasons[reason]) return;
    const details = window.prompt('Add any useful context (optional):', '')?.trim();
    report.mutate(
      { data: { targetType, targetId, reason: reasons[reason].value, ...(details ? { details } : {}) } },
      {
        onSuccess: () => setStatus('Report sent'),
        onError: () => setStatus('Could not send report'),
      },
    );
  };

  const handleBlock = () => {
    if (!blockedUserId || !window.confirm('Block this marketplace participant? You will no longer see each other’s jobs, quotes, or messages.')) return;
    block.mutate(
      { data: { blockedUserId } },
      {
        onSuccess: () => setStatus('Participant blocked'),
        onError: () => setStatus('Could not block participant'),
      },
    );
  };

  return (
    <div className={`market-safety-actions ${compact ? 'compact' : ''}`}>
      <button type="button" className="safety-action" onClick={handleReport} disabled={report.isPending}>
        <Flag size={13} /> {report.isPending ? 'Sending…' : 'Report'}
      </button>
      {blockedUserId && (
        <button type="button" className="safety-action" onClick={handleBlock} disabled={block.isPending}>
          <ShieldBan size={13} /> {block.isPending ? 'Blocking…' : 'Block'}
        </button>
      )}
      {status && <span className="safety-action-status" role="status">{status}</span>}
    </div>
  );
}