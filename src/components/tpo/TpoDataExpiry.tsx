import React, { useState } from 'react';
import { Drive } from '../../types';
import { ironStorage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import {
  Archive,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileArchive,
} from 'lucide-react';

interface TpoDataExpiryProps {
  onRefresh: () => void;
}

export const TpoDataExpiry: React.FC<TpoDataExpiryProps> = ({ onRefresh }) => {
  const drives = ironStorage.getDrives();
  const now = new Date();

  const [downloadedDrives, setDownloadedDrives] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Drive | null>(null);
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState<string | null>(null);

  const handleDownloadArchive = async (drive: Drive) => {
    setIsGenerating(drive.id);
    try {
      const { zipBlob, fileName } = await ironStorage.generateDriveArchive(drive.id);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadedDrives((prev) => new Set([...prev, drive.id]));
      setArchiveSuccessMessage(
        `Successfully generated and downloaded complete ZIP archive: ${fileName}. You may now safely confirm permanent deletion of this drive's temporary data.`
      );
    } catch (err: any) {
      alert(`Archive generation failed: ${err.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleConfirmDeletion = () => {
    if (!deleteCandidate) return;
    try {
      ironStorage.confirmArchiveAndDeleteDrive(deleteCandidate.id);
      setDeleteCandidate(null);
      setArchiveSuccessMessage(
        `Drive "${deleteCandidate.companyName}" and all associated temporary rounds, batches, and applications have been safely deleted. Permanent Student Master DB records remain intact.`
      );
      onRefresh();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-950">
          6-Month Data Retention & Archival
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Enforces IRON compliance rules: Temporary drive operational records expire 6 months after drive completion.
          Download complete verified ZIP backups before initiating permanent drive deletion.
        </p>
      </div>

      {/* Policy Explanation Banner */}
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-zinc-950">
          <ShieldCheck className="w-4 h-4 text-zinc-700" />
          <span>Core IRON Data Separation Guarantee (Rule 4, 30, 31, 32)</span>
        </div>
        <p className="text-zinc-600 leading-relaxed">
          1. <strong>Student Master DB</strong> is permanent and is never deleted when a drive expires.<br />
          2. <strong>Drive-Specific Data</strong> (applications, rounds, batches, evaluations) must be archived after 6 months.<br />
          3. Complete download of verified multi-CSV ZIP archive is required prior to database purge.
        </p>
      </div>

      {archiveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{archiveSuccessMessage}</span>
        </div>
      )}

      {/* Retention Status Table */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-4">Drive & Company</th>
              <th className="py-2.5 px-3">Drive Date</th>
              <th className="py-2.5 px-3">Retention Expiry</th>
              <th className="py-2.5 px-3">Days Remaining</th>
              <th className="py-2.5 px-3">Archive Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {drives.map((d) => {
              const expiry = new Date(d.retentionExpiresAt);
              const diffMs = expiry.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const isExpired = diffDays <= 0;
              const isWarning = diffDays > 0 && diffDays <= 30;
              const isDownloaded = downloadedDrives.has(d.id);

              return (
                <tr key={d.id} className="hover:bg-zinc-50/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-950">{d.companyName}</div>
                    <div className="text-zinc-500 text-[11px]">{d.jobRole} · {d.package}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-700">{d.driveDate}</td>
                  <td className="py-3 px-3 font-mono text-zinc-700">{d.retentionExpiresAt.split('T')[0]}</td>
                  <td className="py-3 px-3 font-mono">
                    {isExpired ? (
                      <span className="text-rose-700 font-bold">0 Days (Expired)</span>
                    ) : isWarning ? (
                      <span className="text-amber-700 font-bold">{diffDays} Days Remaining</span>
                    ) : (
                      <span className="text-zinc-700">{diffDays} Days</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isDownloaded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Downloaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Pending Archive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button
                      type="button"
                      disabled={isGenerating === d.id}
                      onClick={() => handleDownloadArchive(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors"
                      title="Download complete ZIP archive"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isGenerating === d.id ? 'Archiving...' : 'Download ZIP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                      title="Delete temporary drive records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Drive</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CRITICAL DELETION CONFIRMATION MODAL (Per Section 58 & 72) */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDeletion}
        title="⚠ Permanent Drive Deletion"
        message={`This will permanently delete all drive-specific data for "${deleteCandidate?.companyName}" (including applications, round progression, batches, and HR evaluations) from IRON.\n\nCRITICAL GUARANTEE: The Student Master Database will NOT be deleted.\n\nThis action cannot be undone. Please ensure you have downloaded the complete ZIP archive before proceeding.`}
        confirmLabel="Confirm Permanent Deletion"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  );
};
