import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListRepairQuotes,
  useListJobResponses,
  useAcceptRepairQuote,
  useRejectRepairQuote,
  useCreateRepairPriceOffer,
  useAgreeRepairPriceOffer,
  useDeclineRepairPriceOffer,
  useCancelRepairPayment,
  getListRepairQuotesQueryKey,
  getListJobResponsesQueryKey,
  getListRepairJobsQueryKey,
  type RepairJob,
  type RepairQuote,
} from '@workspace/api-client-react';
import { ArrowDownUp, BadgePoundSterling, Check, Clock3, MessageSquare, Star, Trophy, X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { JobMessages } from './JobMessages';
import { JobPhoto } from './JobPhoto';
import { RepairTimeline } from './RepairTimeline';
import { MarketplaceSafetyActions } from './MarketplaceSafetyActions';
import { RepairerVerificationCard } from './RepairerVerificationCard';

const pounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

type QuoteSort = 'recommended' | 'price' | 'speed' | 'rating';

function durationMinutes(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(minute|hour|day|week)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * (unit === 'minute' ? 1 : unit === 'hour' ? 60 : unit === 'day' ? 1440 : 10080);
}

function availabilityScore(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function currentPrice(quote: RepairQuote) {
  return quote.agreedTotalPence ?? quote.currentOfferPence ?? quote.totalPence;
}

function sortQuotes(quotes: RepairQuote[], sort: QuoteSort) {
  return [...quotes].sort((a, b) => {
    if (sort === 'price') return currentPrice(a) - currentPrice(b);
    if (sort === 'speed') return durationMinutes(a.estimatedDuration) - durationMinutes(b.estimatedDuration)
      || availabilityScore(a.estimatedArrival) - availabilityScore(b.estimatedArrival);
    if (sort === 'rating') return b.engineerRating - a.engineerRating || b.engineerCompletedJobs - a.engineerCompletedJobs;
    const aScore = a.engineerRating * 10 + (a.warranty ? 2 : 0) - currentPrice(a) / 10000;
    const bScore = b.engineerRating * 10 + (b.warranty ? 2 : 0) - currentPrice(b) / 10000;
    return bScore - aScore;
  });
}

export function CustomerJobDetails({ job }: { job: RepairJob }) {
  const queryClient = useQueryClient();
  const quotes = useListRepairQuotes(job.id, { query: {
    enabled: Boolean(job),
    queryKey: getListRepairQuotesQueryKey(job.id),
    refetchInterval: 5000,
  } });
  const responses = useListJobResponses(job.id, { query: { enabled: Boolean(job), queryKey: getListJobResponsesQueryKey(job.id) } });
  const acceptQuote = useAcceptRepairQuote();
  const rejectQuote = useRejectRepairQuote();
  const createPriceOffer = useCreateRepairPriceOffer();
  const agreePriceOffer = useAgreeRepairPriceOffer();
  const declinePriceOffer = useDeclineRepairPriceOffer();
  const cancelPayment = useCancelRepairPayment();
  
  const [activeMessageEngineerId, setActiveMessageEngineerId] = useState<string | null>(null);
  const [quoteSort, setQuoteSort] = useState<QuoteSort>('recommended');
  const [paymentError, setPaymentError] = useState<{ quoteId: string; message: string } | null>(null);
  const [counterPrices, setCounterPrices] = useState<Record<string, string>>({});
  const previousAgreedJob = useRef(job.status === 'pending_payment' && job.acceptedQuoteId ? `${job.id}:${job.acceptedQuoteId}` : null);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: getListRepairQuotesQueryKey(job.id) });
    queryClient.invalidateQueries({ queryKey: getListJobResponsesQueryKey(job.id) });
    queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey({ scope: 'mine' }) });
  };

  useEffect(() => {
    const currentAgreedJob = job.status === 'pending_payment' && job.acceptedQuoteId
      ? `${job.id}:${job.acceptedQuoteId}`
      : null;
    const becameAgreed = currentAgreedJob !== null && previousAgreedJob.current === null;
    previousAgreedJob.current = currentAgreedJob;
    if (!becameAgreed || !job.acceptedQuoteId || acceptQuote.isPending) return;
    acceptQuote.mutate(
      { quoteId: job.acceptedQuoteId },
      {
        onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
        onError: () => setPaymentError({
          quoteId: job.acceptedQuoteId!,
          message: 'The price is agreed, but secure Checkout could not open. Use the payment button to retry.',
        }),
      },
    );
  }, [job.id, job.status, job.acceptedQuoteId]);

  const submitCounterPrice = (quoteId: string) => {
    const amountPence = Math.round(Number(counterPrices[quoteId] || 0) * 100);
    if (!Number.isInteger(amountPence) || amountPence < 1) return;
    createPriceOffer.mutate(
      { quoteId, data: { amountPence } },
      {
        onSuccess: () => {
          setCounterPrices((current) => ({ ...current, [quoteId]: '' }));
          refreshData();
        },
        onError: () => setPaymentError({ quoteId, message: 'Your price suggestion could not be sent. Please try again.' }),
      },
    );
  };

  const agreeToPrice = (quoteId: string, offerId: string) => {
    setPaymentError(null);
    agreePriceOffer.mutate(
      { quoteId, offerId },
      {
        onSuccess: ({ checkoutUrl }) => {
          refreshData();
          if (checkoutUrl) window.location.assign(checkoutUrl);
        },
        onError: () => setPaymentError({ quoteId, message: 'That price could not be agreed. Refresh the offer and try again.' }),
      },
    );
  };

  const interestedEngineers = (responses.data || []).filter(r => r.status === 'interested');
  const availableQuotes = quotes.data ?? [];
  const quoteCandidates = availableQuotes.filter((quote) => quote.status === 'pending' || quote.status === 'negotiating');
  const comparisonQuotes = quoteCandidates.length > 0 ? quoteCandidates : availableQuotes;
  const lowestPrice = comparisonQuotes.reduce<RepairQuote | null>((best, quote) => !best || currentPrice(quote) < currentPrice(best) ? quote : best, null);
  const fastest = comparisonQuotes.reduce<RepairQuote | null>((best, quote) => !best || durationMinutes(quote.estimatedDuration) < durationMinutes(best.estimatedDuration) ? quote : best, null);
  const bestRated = comparisonQuotes.reduce<RepairQuote | null>((best, quote) => !best || quote.engineerRating > best.engineerRating ? quote : best, null);
  const displayedQuotes = sortQuotes(availableQuotes, quoteSort);

  return (
    <section className="panel quote-panel">
      <div className="market-heading">
        <BadgePoundSterling size={18} />
        <div>
          <strong>Control centre for {job.title}</strong>
          <span>Compare offers and negotiate together. Payment starts only after both sides agree on a price.</span>
        </div>
      </div>
      <MarketplaceSafetyActions targetType="job" targetId={job.id} />

      <RepairTimeline job={job} />
      
      {job.photoRefs && job.photoRefs.length > 0 && (
        <div className="job-photos-preview">
          {job.photoRefs.map((_, idx) => (
            <JobPhoto key={idx} jobId={job.id} index={idx} />
          ))}
        </div>
      )}

      {quotes.isPending || responses.isPending ? (
        <div className="market-skeleton" role="status" aria-label="Loading"><i /><i /><i /></div>
      ) : (
        <div className="job-details-content">
          <div className="quotes-list">
             <div className="quotes-heading-row">
               <div>
                  <h4 className="section-title">Compare offers</h4>
                  <p className="quotes-heading-copy">Look at the total, timing, cover and worker history together—not price alone.</p>
               </div>
                <label className="quote-sort-control"><ArrowDownUp size={14} aria-hidden="true" /><span className="sr-only">Sort offers</span><select data-testid={`select-offer-sort-${job.id}`} value={quoteSort} onChange={(event) => setQuoteSort(event.target.value as QuoteSort)} aria-label="Sort offers">
                 <option value="recommended">Recommended</option>
                 <option value="price">Lowest total</option>
                 <option value="speed">Fastest repair</option>
                 <option value="rating">Highest rated</option>
               </select></label>
             </div>
             {comparisonQuotes.length > 0 && (
               <div className="quote-comparison-summary" aria-label="Quote comparison highlights">
                  <div className="quote-comparison-card"><span><BadgePoundSterling size={14} aria-hidden="true" />Lowest total</span><strong>{lowestPrice ? pounds(currentPrice(lowestPrice)) : '—'}</strong><small>{lowestPrice?.engineerName ?? 'No quote yet'}</small></div>
                 <div className="quote-comparison-card"><span><Clock3 size={14} aria-hidden="true" />Fastest repair</span><strong>{fastest?.estimatedDuration ?? '—'}</strong><small>{fastest?.engineerName ?? 'No quote yet'}</small></div>
                 <div className="quote-comparison-card"><span><Star size={14} aria-hidden="true" />Best rating</span><strong>{bestRated ? `${bestRated.engineerRating.toFixed(1)} / 5` : '—'}</strong><small>{bestRated?.engineerName ?? 'No quote yet'}</small></div>
               </div>
             )}
             {availableQuotes.length ? displayedQuotes.map((quote) => {
                const activeOffer = [...quote.priceOffers].reverse().find((offer) =>
                  offer.status === 'pending' || offer.status === 'awaiting_proposer',
                );
                const agreedTotal = currentPrice(quote);
                const selectedForPayment = job.status === 'pending_payment' && job.acceptedQuoteId === quote.id;
                const canNegotiate = job.status === 'open' && quote.status !== 'rejected';
                const customerCanConfirm = activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'customer';
                const customerCanAgree = activeOffer?.status === 'pending' && activeOffer.proposerRole === 'engineer';
                const canCounter = canNegotiate && (!activeOffer || activeOffer.status === 'awaiting_proposer' || activeOffer.proposerRole === 'engineer');
               const highlights = [
                 lowestPrice?.id === quote.id ? 'Lowest total' : null,
                 fastest?.id === quote.id ? 'Fastest' : null,
                 bestRated?.id === quote.id ? 'Highest rated' : null,
               ].filter(Boolean) as string[];
               return (
               <article className="quote-card" key={quote.id} data-testid={`card-offer-${quote.id}`}>
                <div className="quote-top">
                  <div>
                    <strong>{quote.engineerName}</strong>
                   <span>{quote.message}</span>
                  </div>
                   <b>{pounds(agreedTotal)}</b>
                </div>
                <div className="quote-breakdown">
                  <span>Labour {pounds(quote.laborPence)}</span>
                  <span>Tools/materials {pounds(quote.toolsAndMaterialsPence)}</span>
                   <span>Call-out {pounds(quote.callOutFeePence)}</span>
                  <span>Estimated duration: {quote.estimatedDuration}</span>
                   <span>Arrival: {quote.estimatedArrival}</span>
                   <span>Warranty: {quote.warranty}</span>
                   <span>Available: {quote.earliestAvailability}</span>
                   <span>Worker rating: {quote.engineerRating.toFixed(1)} / 5 · {quote.engineerCompletedJobs} completed jobs</span>
                  {quote.premiumDiscountPence > 0 && <span className="discount">Premium saving −{pounds(quote.premiumDiscountPence)}</span>}
                    <span>At this price, FixMate keeps 15%: {pounds(quote.platformCommissionPence)}</span>
                    <span>Engineer receives 85% after you confirm completion: {pounds(quote.engineerPayoutPence)}</span>
                    {quote.agreedTotalPence != null && <span className="quote-status pending_payment">Price agreed: {pounds(quote.agreedTotalPence)}</span>}
                </div>
                  <div className="price-negotiation">
                    <strong>Price discussion</strong>
                    {quote.priceOffers.map((offer) => (
                      <div className="price-offer-row" key={offer.id}>
                        <span>{offer.proposerRole === 'customer' ? 'Your offer' : 'Worker offer'}</span>
                        <b>{pounds(offer.amountPence)}</b>
                        <small>{offer.message || 'Price proposal'} · {offer.status.replace('_', ' ')}</small>
                      </div>
                    ))}
                    {selectedForPayment && <p>Both sides agreed. The job is reserved while you complete payment.</p>}
                    {!selectedForPayment && activeOffer?.status === 'pending' && activeOffer.proposerRole === 'customer' && (
                      <p>Your price proposal is waiting for the worker to agree or respond.</p>
                    )}
                    {!selectedForPayment && activeOffer?.status === 'awaiting_proposer' && activeOffer.proposerRole === 'engineer' && (
                      <p>You agreed to this price. The worker needs to confirm it before payment can start.</p>
                    )}
                    {!selectedForPayment && customerCanConfirm && <p>The worker agreed. Confirm the price to finalize your agreement.</p>}
                  </div>
                 {highlights.length > 0 && <div className="quote-highlights">{highlights.map((highlight) => <span key={highlight}><Trophy size={12} aria-hidden="true" />{highlight}</span>)}</div>}
                  {paymentError?.quoteId === quote.id && <p className="payment-banner error" role="alert" data-testid={`status-quote-payment-error-${quote.id}`}>{paymentError.message}</p>}
                <RepairerVerificationCard quote={quote} />
                 <MarketplaceSafetyActions targetType="quote" targetId={quote.id} blockedUserId={quote.engineerId} compact />
                <div className="quote-actions">
                   {selectedForPayment ? (
                     <>
                       <button
                         data-testid={`button-choose-offer-${quote.id}`}
                         disabled={acceptQuote.isPending}
                         onClick={() => acceptQuote.mutate(
                           { quoteId: quote.id },
                           {
                             onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
                             onError: () => setPaymentError({ quoteId: quote.id, message: 'Payment could not be started. Your agreed price is saved; try again.' }),
                           },
                         )}
                       >
                         <Check size={14} />{acceptQuote.isPending ? 'Opening Checkout…' : 'Pay securely with Stripe'}
                       </button>
                       <button
                         disabled={cancelPayment.isPending}
                         onClick={() => cancelPayment.mutate(
                           { quoteId: quote.id },
                           { onSuccess: refreshData, onError: () => setPaymentError({ quoteId: quote.id, message: 'The payment selection could not be cancelled. Refresh and try again.' }) },
                         )}
                       >
                         <X size={14} />Choose another offer
                       </button>
                     </>
                   ) : canNegotiate ? (
                     <>
                       {customerCanAgree && activeOffer && (
                         <button
                           data-testid={`button-agree-price-${quote.id}`}
                           disabled={agreePriceOffer.isPending}
                           onClick={() => agreeToPrice(quote.id, activeOffer.id)}
                         >
                           <Check size={14} />Agree to {pounds(activeOffer.amountPence)}
                         </button>
                       )}
                       {customerCanConfirm && activeOffer && (
                         <button
                           data-testid={`button-confirm-price-${quote.id}`}
                           disabled={agreePriceOffer.isPending}
                           onClick={() => agreeToPrice(quote.id, activeOffer.id)}
                         >
                           <Check size={14} />Confirm agreed price
                         </button>
                       )}
                       {canCounter && (
                         <label className="counter-price-field">
                           <span>Suggest a price</span>
                           <div>
                             <input
                               aria-label={`Counteroffer in pounds for ${quote.engineerName}`}
                               type="number"
                               min="0.01"
                               max="30000"
                               step="0.01"
                               value={counterPrices[quote.id] ?? ''}
                               onChange={(event) => setCounterPrices((current) => ({ ...current, [quote.id]: event.target.value }))}
                               placeholder={(agreedTotal / 100).toFixed(2)}
                             />
                             <button
                               type="button"
                               disabled={createPriceOffer.isPending || !counterPrices[quote.id]}
                               onClick={() => submitCounterPrice(quote.id)}
                             >
                               Suggest price
                             </button>
                           </div>
                         </label>
                       )}
                       {activeOffer?.proposerRole === 'engineer' && (
                         <button
                           disabled={declinePriceOffer.isPending}
                           onClick={() => declinePriceOffer.mutate(
                             { quoteId: quote.id, offerId: activeOffer.id },
                             { onSuccess: refreshData, onError: () => setPaymentError({ quoteId: quote.id, message: 'The price offer could not be declined.' }) },
                           )}
                         >
                           <X size={14} />Decline price
                         </button>
                       )}
                       <button
                         data-testid={`button-reject-offer-${quote.id}`}
                         disabled={rejectQuote.isPending}
                         onClick={() => rejectQuote.mutate(
                           { quoteId: quote.id },
                           {
                             onSuccess: () => { trackEvent('repair_quote_rejected'); refreshData(); },
                             onError: () => trackEvent('repair_quote_reject_failed'),
                           },
                         )}
                       >
                         <X size={14} />Pass on this worker
                       </button>
                     </>
                   ) : quote.status === 'accepted' || job.status === 'accepted' ? (
                     <span>This repair was paid for and reserved.</span>
                   ) : null}
                  <button 
                     className="msg-btn"
                     data-testid={`button-message-worker-${quote.engineerId}`}
                    onClick={() => setActiveMessageEngineerId(
                      activeMessageEngineerId === quote.engineerId ? null : quote.engineerId
                    )}
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                </div>
                {activeMessageEngineerId === quote.engineerId && (
                    <div className="inline-message-thread" data-testid={`thread-private-${quote.engineerId}`}>
                    <JobMessages jobId={job.id} engineerId={quote.engineerId} currentRole="customer" />
                  </div>
                )}
              </article>
               );
              }) : <div className="market-empty" data-testid={`empty-offers-${job.id}`}>No offers yet. Local workers will see your open job.</div>}
          </div>

          {interestedEngineers.length > 0 && (
            <div className="responses-list">
               <h4 className="section-title">Workers who can help</h4>
              <div className="interested-engineers">
                {interestedEngineers.map(response => {
                  const hasQuote = quotes.data?.some(q => q.engineerId === response.engineerId);
                  if (hasQuote) return null; // Already shown in quotes
                  
                  return (
                    <div key={response.id} className="interested-engineer-card">
                      <strong>{response.engineerName}</strong>
                      <MarketplaceSafetyActions targetType="repairer" targetId={response.engineerId} blockedUserId={response.engineerId} compact />
                       <button
                        className="msg-btn"
                         data-testid={`button-message-interested-worker-${response.engineerId}`}
                        onClick={() => setActiveMessageEngineerId(
                          activeMessageEngineerId === response.engineerId ? null : response.engineerId
                        )}
                      >
                        <MessageSquare size={14} /> Message
                      </button>
                      {activeMessageEngineerId === response.engineerId && (
                         <div className="inline-message-thread" data-testid={`thread-private-response-${response.engineerId}`}>
                          <JobMessages jobId={job.id} engineerId={response.engineerId} currentRole="customer" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
