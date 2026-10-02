import { Check, ShieldCheck } from 'lucide-react';
import type { EngineerProfile, RepairQuote } from '@workspace/api-client-react';

type VerificationProfile = Pick<
  EngineerProfile,
  'identityVerified' | 'businessDetailsVerified' | 'insuranceEvidenceProvided' | 'qualificationsProvided' | 'rating' | 'reviewCount' | 'completedJobs'
>;

type QuoteVerification = Pick<
  RepairQuote,
  'engineerIdentityVerified' | 'engineerBusinessDetailsVerified' | 'engineerInsuranceEvidenceProvided' | 'engineerQualificationsProvided' | 'engineerRating' | 'engineerReviewCount' | 'engineerCompletedJobs'
>;

export function RepairerVerificationCard({ profile, quote }: { profile?: VerificationProfile; quote?: QuoteVerification }) {
  const values = profile
    ? {
        identityVerified: profile.identityVerified,
        businessDetailsVerified: profile.businessDetailsVerified,
        insuranceEvidenceProvided: profile.insuranceEvidenceProvided,
        qualificationsProvided: profile.qualificationsProvided,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        completedJobs: profile.completedJobs,
      }
    : quote
      ? {
          identityVerified: quote.engineerIdentityVerified,
          businessDetailsVerified: quote.engineerBusinessDetailsVerified,
          insuranceEvidenceProvided: quote.engineerInsuranceEvidenceProvided,
          qualificationsProvided: quote.engineerQualificationsProvided,
          rating: quote.engineerRating,
          reviewCount: quote.engineerReviewCount,
          completedJobs: quote.engineerCompletedJobs,
        }
      : null;

  if (!values) return null;
  const evidence = [
    ['Identity verified', values.identityVerified],
    ['Business details verified', values.businessDetailsVerified],
    ['Insurance evidence provided', values.insuranceEvidenceProvided],
    ['Qualifications provided', values.qualificationsProvided],
  ] as const;

  return (
    <div className="repairer-verification" aria-label="Worker verification details" data-testid="worker-verification">
      <div className="repairer-verification-heading">
        <ShieldCheck size={15} />
        <strong>Worker verification</strong>
      </div>
      <div className="repairer-verification-list">
        {evidence.map(([label, isPresent]) => (
          <span key={label} className={isPresent ? 'present' : 'not-present'}>
            {isPresent ? <Check size={12} /> : <span aria-hidden="true">—</span>} {label}
          </span>
        ))}
        <span><strong>{values.rating.toFixed(1)} / 5</strong> customer reviews ({values.reviewCount})</span>
        <span><strong>{values.completedJobs}</strong> completed FixMate jobs</span>
      </div>
      <p>These are individual evidence points, not a claim that every worker is fully vetted.</p>
    </div>
  );
}