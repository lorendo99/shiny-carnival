import { type FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListRepairJobs,
  useListRepairQuotes,
  useCreateRepairQuote,
  useCreateRepairPriceOffer,
  useAgreeRepairPriceOffer,
  useDeclineRepairPriceOffer,
  useCreateEngineerPayoutOnboarding,
  useUpdateJobResponse,
  useListJobResponses,
  getListRepairJobsQueryKey,
  getListRepairQuotesQueryKey,
  getListJobResponsesQueryKey,
  type EngineerProfile,
  type RepairJob,
} from '@workspace/api-client-react';
import { BriefcaseBusiness, LoaderCircle, Check, X, MessageSquare } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { JobPhoto } from './JobPhoto';
import { JobMessages } from './JobMessages';
import { MarketplaceSafetyActions } from './MarketplaceSafetyActions';
import { RepairerVerificationCard } from './RepairerVerificationCard';

const pounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const toPence = (value: string) => Math.max(0, Math.round(Number(value || 0) * 100));
const jobCategoryLabel = (category: RepairJob['category']) => ({
  appliance: 'Home appliances',
  plumbing: 'Plumbing',
  painting: 'Painting and decorating',
  electrical: 'Electrical',
}[category]);

export function EngineerView({ profile }: { profile: EngineerProfile }) {
  const queryClient = useQueryClient();
  const openJobs = useListRepairJobs({ scope: 'open' }, { query: {
    queryKey: getListRepairJobsQueryKey({ scope: 'open' }),
    refetchInterval: 5000,
  } });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [payoutSetupError, setPayoutSetupError] = useState('');
  const payoutOnboarding = useCreateEngineerPayoutOnboarding();

  const refreshJobs = () => queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey({ scope: 'open' }) });
  const startPayoutSetup = () => {
    setPayoutSetupError('');
    payoutOnboarding.mutate(undefined, {
      onSuccess: ({ url }) => window.location.assign(url),
      onError: () => setPayoutSetupError('Stripe payout setup could not be opened. Please try again.'),
    });
  };

  return (
    <section className="engineer-board">
      <div className="market-heading">
        <BriefcaseBusiness size={18} />
        <div>
          <strong>Jobs you can do</strong>
          <span>{profile.displayName} · {profile.skills.join(', ')} · {profile.rating.toFixed(1)} / 5 · {profile.completedJobs} completed</span>
          <RepairerVerificationCard profile={profile} />
        </div>
      </div>
      <div className="market-safety-guidance" data-testid="worker-payout-setup">
        <strong>{profile.payoutsEnabled ? 'Stripe payouts are ready' : 'Set up Stripe payouts'}</strong>
        <span>FixMate keeps a 15% marketplace fee. The remaining 85% is transferred to your Stripe balance only after the customer confirms the repair is complete.</span>
        {!profile.payoutsEnabled && (
          <button type="button" data-testid="button-start-payout-setup" disabled={payoutOnboarding.isPending} onClick={startPayoutSetup}>
            {payoutOnboarding.isPending ? 'Opening Stripe…' : 'Set up payouts securely with Stripe'}
          </button>
        )}
        {payoutSetupError && <span role="alert" data-testid="status-payout-setup-error">{payoutSetupError}</span>}
      </div>
      
      {openJobs.isPending ? (
        <div className="market-skeleton" role="status" aria-label="Loading"><i /><i /><i /></div>
      ) : openJobs.data?.length ? (
        <div className="engineer-jobs-grid">
          {openJobs.data.map((job) => (
            <EngineerJobCard 
              key={job.id} 
              job={job} 
              profile={profile}
              isExpanded={selectedJobId === job.id}
              onToggle={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
              onRefresh={refreshJobs}
            />
          ))}
        </div>
      ) : (
        <div className="market-empty" data-testid="empty-worker-jobs">There are no available jobs right now. Check back soon for a local task.</div>
      )}
    </section>
  );
}

function EngineerJobCard({ 
  job, 
  profile, 
  isExpanded, 
  onToggle,
  onRefresh 
}: { 
  job: RepairJob; 
  profile: EngineerProfile;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const quotes = useListRepairQuotes(job.id, { query: {
    enabled: isExpanded,
    queryKey: getListRepairQuotesQueryKey(job.id),
    refetchInterval: 5000,
  } });
  const responses = useListJobResponses(job.id, { query: { enabled: isExpanded, queryKey: getListJobResponsesQueryKey(job.id) } });
  
  const createQuote = useCreateRepairQuote();
  const createPriceOffer = useCreateRepairPriceOffer();
  const agreePriceOffer = useAgreeRepairPriceOffer();
  const declinePriceOffer = useDeclineRepairPriceOffer();
  const updateResponse = useUpdateJobResponse();
  const [counterPrice, setCounterPrice] = useState('');
  const [priceActionMessage, setPriceActionMessage] = useState('');

  const myResponse = responses.data?.find(r => r.engineerId === profile.userId);
  const myQuote = quotes.data?.find(q => q.engineerId === profile.userId);
  const activeOffer = myQuote
    ? [...myQuote.priceOffers].reverse().find((offer) => offer.status === 'pending' || offer.status === 'awaiting_proposer')
    : undefined;
  const currentMyPrice = myQuote?.agreedTotalPence ?? myQuote?.currentOfferPence ?? myQuote?.totalPence ?? 0;

  const submitCounterPrice = () => {
    if (!myQuote) return;
    const amountPence = Math.round(Number(counterPrice || 0) * 100);
    if (!Number.isInteger(amountPence) || amountPence < 1) return;
    createPriceOffer.mutate(
      { quoteId: myQuote.id, data: { amountPence } },
      {
        onSuccess: () => {
          setCounterPrice('');
          setPriceActionMessage('Price proposal sent. The customer must agree, then confirm it.');
          queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
          onRefresh();
        },
        onError: () => setPriceActionMessage('The price proposal could not be sent. Please try again.'),
      },
    );
  };

  const agreeToPrice = (offerId: string) => {
    if (!myQuote) return;
    agreePriceOffer.mutate(
      { quoteId: myQuote.id, offerId },
      {
        onSuccess: ({ agreementComplete }) => {
          setPriceActionMessage(agreementComplete
            ? 'Both sides agreed. The customer can now pay securely.'
            : 'You agreed to this price. The customer needs to confirm it.');
          queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
          onRefresh();
        },
        onError: () => setPriceActionMessage('That price could not be agreed. Refresh and try again.'),
      },
    );
  };

  const declinePrice = (offerId: string) => {
    if (!myQuote) return;
    declinePriceOffer.mutate(
      { quoteId: myQuote.id, offerId },
      {
        onSuccess: () => {
          setPriceActionMessage('Price declined. You can suggest a different amount.');
          queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
        },
        onError: () => setPriceActionMessage('The price offer could not be declined.'),
      },
    );
  };
  
  const handleResponse = (status: 'interested' | 'declined') => {
    trackEvent('job_response_started', { status });
    updateResponse.mutate(
      { jobId: job.id, data: { status } },
      {
        onSuccess: () => {
          trackEvent('job_response_success', { status });
          queryClient.invalidateQueries({ queryKey: getListJobResponsesQueryKey(job.id) });
        },
        onError: () => {
          trackEvent('job_response_failed', { status });
        }
      }
    );
  };

  const submitQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    
    createQuote.mutate(
      {
        jobId: job.id,
        data: {
          message: String(form.get('message')),
          estimatedDuration: String(form.get('estimatedDuration')),
          laborPence: toPence(String(form.get('labour'))),
          toolsAndMaterialsPence: toPence(String(form.get('materials'))),
           callOutFeePence: toPence(String(form.get('callOutFee'))),
           estimatedArrival: String(form.get('estimatedArrival')),
           warranty: String(form.get('warranty')),
           earliestAvailability: String(form.get('earliestAvailability')),
        },
      },
      {
        onSuccess: () => {
          trackEvent('repair_quote_submitted', {
            labor_pence: toPence(String(form.get('labour'))),
            materials_pence: toPence(String(form.get('materials'))),
          });
          formElement.reset();
          queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
          onRefresh();
        },
        onError: () => trackEvent('repair_quote_submit_failed'),
      }
    );
  };

  return (
    <article className="panel engineer-job" data-testid={`card-worker-job-${job.id}`}>
      <button className="engineer-job-header" data-testid={`button-expand-worker-job-${job.id}`} onClick={onToggle}>
        <div className="quote-top">
          <div>
            <strong>{job.title}</strong>
            <span>{jobCategoryLabel(job.category)} · {job.itemType} · {job.status === 'open' ? 'Area' : 'Postcode'} {job.postcode}</span>
          </div>
           <span className={`job-status ${job.status}`} data-testid={`status-worker-job-${job.id}`}>{job.status === 'pending_payment' ? 'waiting for customer payment' : job.status === 'accepted' ? 'in progress' : job.status}</span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="engineer-job-details">
          <p className="job-desc">{job.description}</p>
          <MarketplaceSafetyActions targetType="job" targetId={job.id} blockedUserId={job.customerId} />

          {job.applianceDetails && Object.values(job.applianceDetails).some(Boolean) && (
            <div className="job-appliance-details">
              <strong>Item details</strong>
              <div className="job-appliance-detail-grid">
                {([
                  ['Brand', job.applianceDetails.brand],
                  ['Model', job.applianceDetails.modelNumber],
                  ['Serial', job.applianceDetails.serialNumber],
                  ['Type', job.applianceDetails.productType],
                  ['Age', job.applianceDetails.approximateAge],
                ] as const).map(([label, value]) => value ? (
                  <span key={label}><b>{label}</b>{value}</span>
                ) : null)}
              </div>
            </div>
          )}
          
          {job.photoRefs && job.photoRefs.length > 0 && (
            <div className="job-photos-preview">
              {job.photoRefs.map((_, idx) => (
                <JobPhoto key={idx} jobId={job.id} index={idx} />
              ))}
            </div>
          )}

          {job.status === 'open' ? (
            <div className="engineer-actions">
              {!myResponse || myResponse.status === 'declined' ? (
                <div className="response-buttons">
                  <button
                    className="interested-btn"
                    data-testid={`button-apply-job-${job.id}`}
                    disabled={updateResponse.isPending}
                    onClick={() => handleResponse('interested')}
                  >
                    <Check size={16} /> I can do this job
                  </button>
                  <button
                    className="declined-btn"
                    data-testid={`button-pass-job-${job.id}`}
                    disabled={updateResponse.isPending}
                    onClick={() => handleResponse('declined')}
                  >
                    <X size={16} /> Pass
                  </button>
                </div>
              ) : (
                <div className="interested-workflow">
                  <div className="status-badge interested" data-testid={`status-applied-job-${job.id}`}><Check size={14} /> You applied — next, send your offer</div>
                  
                  <div className="workflow-grid">
                    <div className="workflow-col">
                      <h4>Private message</h4>
                      <JobMessages jobId={job.id} engineerId={profile.userId} currentRole="engineer" />
                    </div>
                    <div className="workflow-col">
                      <h4>{myQuote ? 'Your offer' : 'Send an offer'}</h4>
                      {!myQuote ? (
                        <form className="quote-form-vertical" onSubmit={submitQuote}>
                          <textarea data-testid={`input-offer-message-${job.id}`} name="message" required minLength={5} maxLength={800} placeholder="Explain what your offer covers and how you will approach the job." />
                          <label>Estimated duration<input name="estimatedDuration" type="text" minLength={2} maxLength={80} placeholder="e.g. 2–3 hours" required /></label>
                          <label>Labour (£)<input name="labour" type="number" min="1" max="10000" step="0.01" required /></label>
                          <label>Tools & materials (£)<input name="materials" type="number" min="0" max="10000" step="0.01" defaultValue="0" required /></label>
                           <label>Call-out fee (£)<input name="callOutFee" type="number" min="0" max="10000" step="0.01" defaultValue="0" required /></label>
                           <label>Estimated arrival<input name="estimatedArrival" type="text" minLength={2} maxLength={80} placeholder="e.g. Within 2 hours" required /></label>
                           <label>Warranty<input name="warranty" type="text" minLength={2} maxLength={120} placeholder="e.g. 90 days on labour" required /></label>
                           <label>Earliest availability<input name="earliestAvailability" type="text" minLength={2} maxLength={80} placeholder="e.g. Tuesday morning" required /></label>
                          <button data-testid={`button-send-offer-${job.id}`} className="submit-button" disabled={createQuote.isPending}>
                            {createQuote.isPending ? <LoaderCircle className="animate-spin" /> : 'Send offer'}
                          </button>
                        </form>
                      ) : (
                        <div className="my-quote-summary">
                           <strong>{pounds(currentMyPrice)} current price</strong>
                          <span>Labour: {pounds(myQuote.laborPence)}</span>
                          <span>Materials: {pounds(myQuote.toolsAndMaterialsPence)}</span>
                           <span>Call-out: {pounds(myQuote.callOutFeePence)}</span>
                           <span>Estimated duration: {myQuote.estimatedDuration}</span>
                           <span>Arrival: {myQuote.estimatedArrival}</span>
                           <span>Warranty: {myQuote.warranty}</span>
                           <span>Available: {myQuote.earliestAvailability}</span>
                            <span>Worker rating: {myQuote.engineerRating.toFixed(1)} / 5 · {myQuote.engineerCompletedJobs} completed jobs</span>
                          {myQuote.premiumDiscountPence > 0 && <span className="discount">Premium saving −{pounds(myQuote.premiumDiscountPence)}</span>}
                           <span>Expected payout after customer confirmation: {pounds(myQuote.engineerPayoutPence)} (85%)</span>
                          <span className={`quote-status ${myQuote.status}`}>{myQuote.status.replace('_', ' ')}</span>
                          <span className="quote-message-preview">{myQuote.message}</span>
                           <MarketplaceSafetyActions targetType="quote" targetId={myQuote.id} compact />
                          <div className="price-negotiation">
                            <strong>Price discussion</strong>
                            {myQuote.priceOffers.map((offer) => (
                              <div className="price-offer-row" key={offer.id}>
                                <span>{offer.proposerRole === 'engineer' ? 'Your offer' : 'Customer offer'}</span>
                                <b>{pounds(offer.amountPence)}</b>
                                <small>{offer.message || 'Price proposal'} · {offer.status.replace('_', ' ')}</small>
                              </div>
                            ))}
                            {activeOffer?.status === 'pending' && activeOffer.proposerRole === 'engineer' && (
                              <p>Your offer is waiting for the customer to agree.</p>
                            )}
                            {activeOffer?.status === 'pending' && activeOffer.proposerRole === 'customer' && (
                              <div className="quote-actions">
                                <button disabled={agreePriceOffer.isPending} onClick={() => agreeToPrice(activeOffer.id)}>
                                  <Check size={14} />Agree to {pounds(activeOffer.amountPence)}
                                </button>
                                <button disabled={declinePriceOffer.isPending} onClick={() => declinePrice(activeOffer.id)}>
                                  <X size={14} />Decline price
                                </button>
                              </div>
                            )}
                            {activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'engineer' && (
                              <div>
                                <p>The customer agreed. Confirm this price to finalize the agreement.</p>
                                <button disabled={agreePriceOffer.isPending} onClick={() => agreeToPrice(activeOffer.id)}>
                                  <Check size={14} />Confirm agreed price
                                </button>
                              </div>
                            )}
                            {activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'customer' && (
                              <p>You agreed to the customer's price. Waiting for them to confirm.</p>
                            )}
                            {(!activeOffer || activeOffer.status === 'awaiting_proposer' || activeOffer.proposerRole === 'customer') && (
                              <label className="counter-price-field">
                                <span>Suggest another price</span>
                                <div>
                                  <input
                                    aria-label="Counteroffer in pounds"
                                    type="number"
                                    min="0.01"
                                    max="30000"
                                    step="0.01"
                                    value={counterPrice}
                                    onChange={(event) => setCounterPrice(event.target.value)}
                                    placeholder={(currentMyPrice / 100).toFixed(2)}
                                  />
                                  <button type="button" disabled={createPriceOffer.isPending || !counterPrice} onClick={submitCounterPrice}>
                                    Suggest price
                                  </button>
                                </div>
                              </label>
                            )}
                            {priceActionMessage && <p role="status">{priceActionMessage}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="engineer-actions won-job">
              <div className="status-badge accepted" data-testid={`status-got-job-${job.id}`}><Check size={14} /> {job.status === 'pending_payment' ? 'Price agreed — waiting for customer payment' : 'You got the job'}</div>
              <div className="workflow-grid">
                <div className="workflow-col">
                  <h4>Private message</h4>
                  <JobMessages jobId={job.id} engineerId={profile.userId} currentRole="engineer" />
                </div>
                <div className="workflow-col">
                  <h4>Your accepted offer</h4>
                  {myQuote && (
                    <div className="my-quote-summary">
                       <strong>{pounds(myQuote.agreedTotalPence ?? myQuote.currentOfferPence ?? myQuote.totalPence)} agreed price</strong>
                      <span>Labour: {pounds(myQuote.laborPence)}</span>
                      <span>Materials: {pounds(myQuote.toolsAndMaterialsPence)}</span>
                         <span>Call-out: {pounds(myQuote.callOutFeePence)}</span>
                       <span>Estimated duration: {myQuote.estimatedDuration}</span>
                         <span>Arrival: {myQuote.estimatedArrival}</span>
                         <span>Warranty: {myQuote.warranty}</span>
                         <span>Available: {myQuote.earliestAvailability}</span>
                          <span>Worker rating: {myQuote.engineerRating.toFixed(1)} / 5 · {myQuote.engineerCompletedJobs} completed jobs</span>
                      {myQuote.premiumDiscountPence > 0 && <span className="discount">Premium saving −{pounds(myQuote.premiumDiscountPence)}</span>}
                       <span>Expected payout after customer confirmation: {pounds(myQuote.engineerPayoutPence)} (85%)</span>
                      <span className={`quote-status ${myQuote.status}`}>{myQuote.status.replace('_', ' ')}</span>
                      <span className="quote-message-preview">{myQuote.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {quotes.data && quotes.data.length > 0 && (
            <div className="competing-quotes">
              <h4>Other offers</h4>
              <div className="competing-quotes-list">
                {quotes.data.filter(q => q.engineerId !== profile.userId).map(q => (
                  <div key={q.id} className="competing-quote full-detail">
                    <div className="quote-top">
                      <div>
                        <strong>{q.engineerName}</strong>
                        <span className="quote-message-preview">{q.message}</span>
                      </div>
                      <strong>{pounds(q.currentOfferPence ?? q.agreedTotalPence ?? q.totalPence)}</strong>
                    </div>
                    <div className="quote-breakdown">
                      <span>Labour {pounds(q.laborPence)}</span>
                      <span>Materials {pounds(q.toolsAndMaterialsPence)}</span>
                       <span>Call-out {pounds(q.callOutFeePence)}</span>
                      <span>Estimated duration: {q.estimatedDuration}</span>
                       <span>Arrival: {q.estimatedArrival}</span>
                       <span>Warranty: {q.warranty}</span>
                       <span>Available: {q.earliestAvailability}</span>
                       <span>Rating: {q.engineerRating.toFixed(1)} / 5 · {q.engineerCompletedJobs} completed jobs</span>
                      {q.premiumDiscountPence > 0 && <span className="discount">Premium saving −{pounds(q.premiumDiscountPence)}</span>}
                      <span className={`quote-status ${q.status}`}>{q.status.replace('_', ' ')}</span>
                    </div>
                     <MarketplaceSafetyActions targetType="quote" targetId={q.id} blockedUserId={q.engineerId} compact />
                  </div>
                ))}
                {quotes.data.filter(q => q.engineerId !== profile.userId).length === 0 && (
                  <span className="no-competition">No other quotes yet.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
