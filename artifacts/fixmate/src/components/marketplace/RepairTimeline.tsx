import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListRepairJobsQueryKey,
  type RepairJob,
  type RepairReminderKind,
  useCreateRepairReminder,
  useUpdateRepairJobTimeline,
  useUpdateRepairReminder,
} from '@workspace/api-client-react';
import { Bell, Check, Circle, LoaderCircle } from 'lucide-react';

const reminderOptions: Array<{ kind: RepairReminderKind; label: string; days: number }> = [
  { kind: 'clean_filter', label: 'Clean filters', days: 30 },
  { kind: 'check_seals', label: 'Check seals', days: 90 },
  { kind: 'replace_batteries', label: 'Replace batteries', days: 180 },
  { kind: 'boiler_service', label: 'Service the boiler', days: 365 },
  { kind: 'review_repair', label: 'Review the completed job', days: 7 },
];

function defaultReminderDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function RepairTimeline({ job }: { job: RepairJob }) {
  const queryClient = useQueryClient();
  const updateTimeline = useUpdateRepairJobTimeline();
  const createReminder = useCreateRepairReminder();
  const updateReminder = useUpdateRepairReminder();
  const [reminderKind, setReminderKind] = useState<RepairReminderKind>('review_repair');
  const [reminderDate, setReminderDate] = useState(defaultReminderDate(7));

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey() });
  const displayStepLabel = (label: string) => label.replace(/repair/gi, 'job');
  const pounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
  const payoutMessage = {
    pending: 'Waiting for FixMate to confirm the Stripe payment.',
    paid: `Payment received. The engineer’s ${pounds(job.engineerPayoutPence ?? 0)} share is transferred after you confirm the repair is complete.`,
    transfer_pending: 'Your completion confirmation was received, but Stripe has not confirmed the engineer transfer yet. Retry below to check it.',
    transferred: `The engineer’s ${pounds(job.engineerPayoutPence ?? 0)} share has been sent to their Stripe balance. Bank arrival follows their Stripe payout schedule.`,
    unpaid: '',
  }[job.paymentStatus];

  return (
    <section className="repair-timeline" aria-labelledby={`timeline-${job.id}`} data-testid={`job-progress-${job.id}`}>
      <div className="timeline-heading">
        <div>
          <div className="section-title">Job progress</div>
          <p id={`timeline-${job.id}`}>See what has happened, mark the next work complete and set a useful follow-up.</p>
        </div>
        <Bell size={17} />
      </div>
      {job.paymentStatus !== 'unpaid' && (
        <div className={`timeline-payment-summary ${job.paymentStatus}`} role="status" data-testid={`status-repair-payment-${job.id}`}>
          <strong>
            {job.paymentStatus === 'transferred' ? 'Payout released' : job.paymentStatus === 'transfer_pending' ? 'Payout pending' : job.paymentStatus === 'paid' ? 'Payment confirmed' : 'Payment pending'}
          </strong>
          <span>{payoutMessage}</span>
          {job.platformCommissionPence != null && (
            <span>FixMate fee: {pounds(job.platformCommissionPence)} (15%) · Engineer share: {pounds(job.engineerPayoutPence ?? 0)} (85%)</span>
          )}
        </div>
      )}
      <div className="timeline-list">
        {job.timeline.map((event) => {
          const canUpdate = event.key === 'parts_ordered' || (
            event.key === 'repair_completed' &&
            job.status === 'accepted' &&
            ['paid', 'transfer_pending'].includes(job.paymentStatus)
          );
          return (
            <div className={`timeline-event ${event.completed ? 'complete' : ''}`} key={event.key} data-testid={`timeline-step-${job.id}-${event.key}`}>
              <div className="timeline-marker">{event.completed ? <Check size={13} /> : <Circle size={10} />}</div>
              <div className="timeline-copy">
                <strong>{displayStepLabel(event.label)}</strong>
                {event.completedAt && <span>{new Date(event.completedAt).toLocaleDateString('en-GB')}</span>}
              </div>
              {canUpdate && (
                <button
                  type="button"
                  data-testid={`button-toggle-progress-${job.id}-${event.key}`}
                  className="timeline-toggle"
                  disabled={updateTimeline.isPending}
                  onClick={() => updateTimeline.mutate(
                    { jobId: job.id, data: { step: event.key as 'parts_ordered' | 'repair_completed', completed: !event.completed } },
                    { onSuccess: refresh },
                  )}
                >
                  {event.key === 'repair_completed'
                    ? job.paymentStatus === 'transfer_pending' ? 'Retry payout & confirm' : 'Confirm completion & release payout'
                    : event.completed ? 'Undo' : 'Mark done'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="reminder-form">
          <div className="problem-card-label">Add a reminder</div>
        <div className="reminder-fields">
            <select data-testid={`select-reminder-${job.id}`} value={reminderKind} onChange={(event) => {
            const option = reminderOptions.find((item) => item.kind === event.target.value);
            setReminderKind(event.target.value as RepairReminderKind);
            if (option) setReminderDate(defaultReminderDate(option.days));
          }}>
            {reminderOptions.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}
          </select>
           <input data-testid={`input-reminder-date-${job.id}`} type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
          <button
             type="button"
             data-testid={`button-add-reminder-${job.id}`}
            className="timeline-add"
            disabled={createReminder.isPending || !reminderDate}
            onClick={() => createReminder.mutate(
              { jobId: job.id, data: { kind: reminderKind, dueAt: new Date(`${reminderDate}T09:00:00`).toISOString() } },
              { onSuccess: refresh },
            )}
          >
            {createReminder.isPending ? <LoaderCircle size={14} className="animate-spin" /> : 'Add'}
          </button>
        </div>
        {job.reminders.length > 0 && (
          <div className="reminder-list">
            {job.reminders.map((reminder) => (
              <label className={`reminder-row ${reminder.completed ? 'complete' : ''}`} key={reminder.id}>
                <input
                  type="checkbox"
                  checked={reminder.completed}
                  disabled={updateReminder.isPending}
                  onChange={(event) => updateReminder.mutate(
                    { jobId: job.id, reminderId: reminder.id, data: { completed: event.target.checked } },
                    { onSuccess: refresh },
                  )}
                />
                <span>{reminder.label}</span>
                <time dateTime={reminder.dueAt}>{new Date(reminder.dueAt).toLocaleDateString('en-GB')}</time>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}