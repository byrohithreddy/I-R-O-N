import React, { useState } from 'react';
import { Placement, Student } from '../../types';
import { ironStorage } from '../../services/storage';
import { Search, Award, Download, CheckCircle2 } from 'lucide-react';

export const PublicPlacements: React.FC = () => {
  const placements: Placement[] = ironStorage.getPlacements();
  const students: Student[] = ironStorage.getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');

  const rows = placements.map((p) => {
    const s = studentMap.get(p.studentId);
    return {
      id: p.id,
      rollNumber: s?.rollNumber || 'N/A',
      name: s?.fullName || 'Candidate',
      branch: s?.branch || 'N/A',
      department: s?.department || 'N/A',
      companyName: p.companyName,
      jobRole: p.jobRole,
      package: p.package,
      selectedAt: p.selectedAt,
    };
  });

  const companies = Array.from(new Set(placements.map((p) => p.companyName)));

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.branch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComp = selectedCompany === 'ALL' || r.companyName === selectedCompany;
    return matchesSearch && matchesComp;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Campus Placement Records</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Official roll of candidates selected through verified campus recruitment drives.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search by student name, roll no, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-zinc-500">Filter Company:</span>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="ALL">All Companies ({placements.length})</option>
            {companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Roll Number</th>
              <th className="py-2.5 px-3">Candidate</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3">Company</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Package</th>
              <th className="py-2.5 px-3 text-right">Offer Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-400">
                  No verified placements found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/50">
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-950">{r.rollNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-900">{r.name}</td>
                  <td className="py-2.5 px-3 text-zinc-600">{r.branch}</td>
                  <td className="py-2.5 px-3 font-semibold text-zinc-950">{r.companyName}</td>
                  <td className="py-2.5 px-3 text-zinc-700">{r.jobRole}</td>
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-900">{r.package}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Placed
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
