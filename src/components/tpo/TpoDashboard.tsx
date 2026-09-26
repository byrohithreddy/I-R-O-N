import React, { useState, useEffect } from 'react';
import { Drive, Placement } from '../../types';
import { ironStorage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Users, Briefcase, Award, CheckCircle2, AlertTriangle, ArrowRight, Plus, Key, Copy, Check } from 'lucide-react';

interface TpoDashboardProps {
  onNavigate: (view: string, driveId?: string) => void;
  onCreateDrive: () => void;
}

export const TpoDashboard: React.FC<TpoDashboardProps> = ({
  onNavigate,
  onCreateDrive,
}) => {
  const [studentCount, setStudentCount] = useState<number>(() => ironStorage.getStudentCount());
  const [drives, setDrives] = useState<Drive[]>(() => ironStorage.getDrives());
  const [placements, setPlacements] = useState<Placement[]>(() => ironStorage.getPlacements());

  useEffect(() => {
    const unsubscribe = ironStorage.subscribe(() => {
      setStudentCount(ironStorage.getStudentCount());
      setDrives(ironStorage.getDrives());
      setPlacements(ironStorage.getPlacements());
    });
    return unsubscribe;
  }, []);

  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [credentialsDrive, setCredentialsDrive] = useState<Drive | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeDrives = drives.filter((d) => d.status === 'UPCOMING' || d.status === 'ONGOING');
  const completedDrives = drives.filter((d) => d.status === 'COMPLETED');
  const totalPlaced = placements.length;
  const placementRate = studentCount > 0 ? ((totalPlaced / studentCount) * 100).toFixed(1) : '0';

  // Check drives approaching 6-month data expiry
  const now = new Date();
  const expiringDrives = drives.filter((d) => {
    const expiry = new Date(d.retentionExpiresAt);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // within 30 days or overdue
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Placement Officer Overview</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Centralized recruitment operations, Master DB administration, and active drive monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateDrive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Drive</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Anti-slop: High contrast, tabular-nums, single elevation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Student Master DB</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {studentCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Permanent college records</div>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Active Drives</span>
            <Briefcase className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {activeDrives.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Upcoming & ongoing</div>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Placed Candidates</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {totalPlaced}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {placementRate}% of registered batch
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Completed Drives</span>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {completedDrives.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Historical placement drives</div>
        </div>
      </div>

      {/* 6-Month Data Expiry Warning Banner (If any drives nearing retention cutoff) */}
      {expiringDrives.length > 0 && (
        <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-lg flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-amber-950">
                Retention Expiry Notice: {expiringDrives.length} drive(s) approaching 6-month retention cutoff
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {expiringDrives.map((d) => d.companyName).join(', ')} has reached or is nearing the 6-month
                retention threshold. Download complete ZIP archive before proceeding with safe deletion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tpo-expiry')}
            className="px-3 py-1.5 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Review Expiry
          </button>
        </div>
      )}

      {/* Active Recruitment Drives Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-950">Current Placement Drives</h2>
          <button
            type="button"
            onClick={() => onNavigate('tpo-drives')}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1"
          >
            <span>View All Drives</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Company & Role</th>
                <th className="py-2.5 px-3">Drive Date</th>
                <th className="py-2.5 px-3">Package</th>
                <th className="py-2.5 px-3">Criteria</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {drives.map((d) => {
                const apps = ironStorage.getApplications(d.id);
                return (
                  <tr key={d.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950">{d.companyName}</div>
                      <div className="text-zinc-500 text-[11px]">{d.jobRole}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-700">{d.driveDate}</td>
                    <td className="py-3 px-3 font-mono font-medium text-zinc-900">{d.package}</td>
                    <td className="py-3 px-3 text-zinc-600">
                      CGPA <span className="font-mono">{d.minimumCgpa.toFixed(2)}</span> · Backlogs <span className="font-mono">{d.backlogRule}</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCredentialsDrive(d);
                            setIsCredentialsOpen(true);
                          }}
                          className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100"
                          title="View Coordinator & HR Credentials"
                        >
                          <Key className="w-3.5 h-3.5 inline" />
                        </button>
                        <span className="text-zinc-300">·</span>
                        <button
                          type="button"
                          onClick={() => onNavigate('tpo-drives', d.id)}
                          className="text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:underline"
                        >
                          Manage
                        </button>
                        <span className="text-zinc-300">·</span>
                        <button
                          type="button"
                          onClick={() => onNavigate('tpo-analytics', d.id)}
                          className="text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:underline"
                        >
                          Analytics
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREDENTIALS VIEW MODAL */}
      <Modal
        isOpen={isCredentialsOpen}
        onClose={() => setIsCredentialsOpen(false)}
        title={`Recruiter Credentials: ${credentialsDrive?.companyName}`}
        subtitle="Single coordinator account and single HR account per drive"
        maxWidth="max-w-md"
      >
        {credentialsDrive && (() => {
          const creds = ironStorage.getDriveCredentials(credentialsDrive);
          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 border border-zinc-200 rounded space-y-2 bg-zinc-50">
                <div className="font-semibold text-zinc-900 flex items-center justify-between">
                  <span>Student Coordinator Account</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `Username: ${creds.coordinatorUsername}\nPassword: ${creds.coordinatorPassword}`,
                        'coord'
                      )
                    }
                    className="text-zinc-500 hover:text-zinc-950 flex items-center gap-1"
                  >
                    {copiedKey === 'coord' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="font-mono text-zinc-700">
                  User: <strong className="text-zinc-900">{creds.coordinatorUsername}</strong>
                </div>
                <div className="font-mono text-zinc-700">
                  Pass: <strong className="text-zinc-900">{creds.coordinatorPassword}</strong>
                </div>
                <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200">
                  Coordinators create batches and assign applicants for {credentialsDrive.companyName}.
                </p>
              </div>

              <div className="p-3 border border-zinc-200 rounded space-y-2 bg-zinc-50">
                <div className="font-semibold text-zinc-900 flex items-center justify-between">
                  <span>Company HR Account</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `Username: ${creds.hrUsername}\nPassword: ${creds.hrPassword}`,
                        'hr'
                      )
                    }
                    className="text-zinc-500 hover:text-zinc-950 flex items-center gap-1"
                  >
                    {copiedKey === 'hr' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="font-mono text-zinc-700">
                  User: <strong className="text-zinc-900">{creds.hrUsername}</strong>
                </div>
                <div className="font-mono text-zinc-700">
                  Pass: <strong className="text-zinc-900">{creds.hrPassword}</strong>
                </div>
                <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200">
                  Restricted to evaluate batches of {credentialsDrive.companyName} only.
                </p>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsCredentialsOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
