import React from 'react';
import { Drive } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Calendar, MapPin, Award, ArrowUpRight } from 'lucide-react';

interface DriveCardProps {
  drive: Drive;
  onApply: (drive: Drive) => void;
  onViewDetails: (drive: Drive) => void;
}

export const DriveCard: React.FC<DriveCardProps> = ({
  drive,
  onApply,
  onViewDetails,
}) => {
  const isDeadlinePassed = new Date() >= new Date(drive.applicationDeadline);
  const isApplicationOpen = !isDeadlinePassed && drive.status !== 'CANCELLED' && drive.status !== 'COMPLETED';

  return (
    <div className="border border-zinc-200 bg-white rounded-lg p-5 flex flex-col justify-between hover:border-zinc-400 transition-colors">
      <div>
        {/* Top line: Status & Package */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-950 tracking-tight">{drive.companyName}</h3>
            <p className="text-xs text-zinc-600 mt-0.5">{drive.jobRole}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-zinc-900 font-mono tabular-nums">
              {drive.package}
            </span>
          </div>
        </div>

        {/* Status badges & Deadline info */}
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={drive.status} />
          {isDeadlinePassed ? (
            <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              Applications Closed
            </span>
          ) : (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              Applications Open
            </span>
          )}
        </div>

        {/* Metadata info */}
        <div className="space-y-1.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Drive Date: <span className="font-medium text-zinc-900">{drive.driveDate}</span> at {drive.driveTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{drive.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              Min CGPA: <span className="font-mono font-medium text-zinc-900">{drive.minimumCgpa.toFixed(2)}</span> · Max Backlogs:{' '}
              <span className="font-mono font-medium text-zinc-900">
                {drive.backlogRule === 'NOT_APPLICABLE' || drive.backlogRule === -1 ? 'Not applicable' : drive.backlogRule}
              </span>
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 pt-1">
            Eligible: <span className="text-zinc-700">{drive.eligibleBranches.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-zinc-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(drive)}
          className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-2.5 py-1.5 hover:bg-zinc-100 rounded transition-colors"
        >
          View Details
        </button>

        {isApplicationOpen ? (
          <button
            type="button"
            onClick={() => onApply(drive)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors"
          >
            <span>Apply</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-xs text-zinc-400 font-medium px-2 py-1">
            Closed
          </span>
        )}
      </div>
    </div>
  );
};
