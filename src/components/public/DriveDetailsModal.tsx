import React from 'react';
import { Modal } from '../common/Modal';
import { Drive, DriveRound } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ironStorage } from '../../services/storage';
import { Calendar, MapPin, Award, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DriveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: Drive | null;
  onApplyClick?: (drive: Drive) => void;
}

export const DriveDetailsModal: React.FC<DriveDetailsModalProps> = ({
  isOpen,
  onClose,
  drive,
  onApplyClick,
}) => {
  if (!drive) return null;

  const rounds: DriveRound[] = ironStorage.getRounds(drive.id);
  const isDeadlinePassed = new Date() >= new Date(drive.applicationDeadline);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={drive.companyName}
      subtitle={`${drive.jobRole} · ${drive.package}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Key Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded">
          <div className="flex items-center gap-2">
            <StatusBadge status={drive.status} />
            <span className="text-zinc-400">·</span>
            <span className="text-xs font-mono font-bold text-zinc-950">{drive.package}</span>
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            Cutoff: {drive.driveDate} 00:00
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 border border-zinc-200 rounded space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" />
              <span>Drive Schedule</span>
            </div>
            <p className="text-zinc-600">
              Date: <strong className="text-zinc-900">{drive.driveDate}</strong>
            </p>
            <p className="text-zinc-600">
              Reporting Time: <strong className="text-zinc-900">{drive.driveTime}</strong>
            </p>
          </div>

          <div className="p-3 border border-zinc-200 rounded space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
              <MapPin className="w-3.5 h-3.5 text-zinc-600" />
              <span>Campus Venue</span>
            </div>
            <p className="text-zinc-800">{drive.location}</p>
          </div>
        </div>

        {/* Eligibility Criteria */}
        <div className="p-4 border border-zinc-200 rounded space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
            <Award className="w-4 h-4 text-zinc-700" />
            <span>Eligibility Requirements</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div>
              <span className="text-zinc-500 block">Minimum CGPA</span>
              <span className="font-mono font-semibold text-zinc-900 text-sm">
                {drive.minimumCgpa.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Allowed Backlogs</span>
              <span className="font-mono font-semibold text-zinc-900 text-sm">
                {drive.backlogRule === 'NOT_APPLICABLE' || drive.backlogRule === -1 ? 'Not applicable' : drive.backlogRule}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Eligible Disciplines</span>
              <span className="font-semibold text-zinc-900">
                {drive.eligibleBranches.join(', ')}
              </span>
            </div>
          </div>
          {drive.eligibilityCriteria && (
            <p className="text-xs text-zinc-600 pt-1 border-t border-zinc-100">
              {drive.eligibilityCriteria}
            </p>
          )}
        </div>

        {/* Job Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-zinc-900">Job Description & Role Responsibilities</h4>
          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
            {drive.jobDescription || 'Standard engineering responsibilities and project deliverables.'}
          </p>
        </div>

        {/* Recruitment Rounds Timeline */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-zinc-900">Recruitment Process</h4>
          <div className="border border-zinc-200 rounded divide-y divide-zinc-200">
            {rounds.map((rnd) => (
              <div key={rnd.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-950">{rnd.roundName}</span>
                    {rnd.isFinalRound && (
                      <span className="px-1.5 py-0.2 bg-zinc-900 text-white text-[10px] font-medium rounded">
                        Final Round
                      </span>
                    )}
                  </div>
                  {rnd.description && (
                    <p className="text-zinc-500 text-[11px] mt-0.5">{rnd.description}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={rnd.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
          {!isDeadlinePassed && drive.status !== 'CANCELLED' && onApplyClick && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onApplyClick(drive);
              }}
              className="px-5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
            >
              Apply to Drive
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
