import React from 'react';

export type StatusType =
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'OVERRIDDEN'
  | 'APPLIED'
  | 'IN_PROGRESS'
  | 'SELECTED'
  | 'PLACED'
  | 'HOLD'
  | 'PENDING'
  | 'REJECTED'
  | 'OPEN'
  | 'SUBMITTED'
  | 'FROZEN'
  | 'DRAFT'
  | 'UPCOMING'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'LIMITED'
  | 'UNLIMITED'
  | 'ACTIVE';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const norm = status.trim().toUpperCase() as StatusType;

  // STRICT COLOR RULES:
  // Green: Eligible, Selected, Placed, Active, Ongoing
  // Red: Not Eligible, Rejected, Cancelled, Expired, Closed
  // Orange: Hold, Pending, Upcoming, Draft, Limited
  // Zinc / Monochrome: Completed, Submitted, Frozen, Unlimited, Applied, In Progress

  let dotColor = 'bg-zinc-500';
  let textColor = 'text-zinc-700';
  let borderColor = 'border-zinc-300';
  let bgColor = 'bg-zinc-50';

  if (['ELIGIBLE', 'SELECTED', 'PLACED', 'ACTIVE', 'ONGOING'].includes(norm)) {
    dotColor = 'bg-emerald-600';
    textColor = 'text-emerald-800';
    borderColor = 'border-emerald-200';
    bgColor = 'bg-emerald-50/60';
  } else if (['REJECTED', 'NOT_ELIGIBLE', 'CANCELLED', 'EXPIRED', 'CLOSED'].includes(norm)) {
    dotColor = 'bg-rose-600';
    textColor = 'text-rose-800';
    borderColor = 'border-rose-200';
    bgColor = 'bg-rose-50/60';
  } else if (['HOLD', 'PENDING', 'UPCOMING', 'DRAFT', 'LIMITED', 'OVERRIDDEN'].includes(norm)) {
    dotColor = 'bg-amber-600';
    textColor = 'text-amber-800';
    borderColor = 'border-amber-200';
    bgColor = 'bg-amber-50/60';
  }

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded whitespace-nowrap tabular-nums ${bgColor} ${borderColor} ${textColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{formatText(norm)}</span>
    </span>
  );
};
