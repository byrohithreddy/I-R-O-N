import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Drive, Placement, Student } from '../../types';
import { ironStorage } from '../../services/storage';
import { Download, Search } from 'lucide-react';

interface PublicSelectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: Drive | null;
}

export const PublicSelectedModal: React.FC<PublicSelectedModalProps> = ({
  isOpen,
  onClose,
  drive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!drive) return null;

  const placements: Placement[] = ironStorage.getPlacements(drive.id);
  const students: Student[] = ironStorage.getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const rows = placements
    .map((p) => {
      const s = studentMap.get(p.studentId);
      return {
        id: p.id,
        rollNumber: s?.rollNumber || 'N/A',
        name: s?.fullName || 'Candidate',
        department: s?.department || s?.branch || 'N/A',
        branch: s?.branch || 'N/A',
        role: p.jobRole,
        package: p.package,
        selectedAt: p.selectedAt,
      };
    })
    .filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleExportCSV = () => {
    const headers = ['Roll Number,Student Name,Department,Branch,Package,Date'];
    const lines = rows.map(
      (r) => `"${r.rollNumber}","${r.name}","${r.department}","${r.branch}","${r.package}","${r.selectedAt}"`
    );
    const content = [headers, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${drive.companyName}_Selected_Students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Selected Candidates: ${drive.companyName}`}
      subtitle={`${drive.jobRole} · Final Selections`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by name, roll no, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-300 rounded">
            No candidates have been finalized for this drive yet.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="py-2 px-3 font-mono font-medium text-zinc-900">{r.rollNumber}</td>
                    <td className="py-2 px-3 font-medium text-zinc-950">{r.name}</td>
                    <td className="py-2 px-3 text-zinc-600">{r.department}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Placed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
