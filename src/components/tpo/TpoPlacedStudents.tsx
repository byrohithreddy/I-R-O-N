import React, { useState } from 'react';
import { Placement, Student, Drive } from '../../types';
import { ironStorage } from '../../services/storage';
import { Download, Search, CheckCircle2, Building, Award } from 'lucide-react';

interface TpoPlacedStudentsProps {
  onRefresh: () => void;
}

export const TpoPlacedStudents: React.FC<TpoPlacedStudentsProps> = () => {
  const placements: Placement[] = ironStorage.getPlacements();
  const students: Student[] = ironStorage.getStudents();
  const drives: Drive[] = ironStorage.getDrives();

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const driveMap = new Map(drives.map((d) => [d.id, d]));

  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Enriched rows
  const rows = placements.map((p) => {
    const s = studentMap.get(p.studentId);
    const d = driveMap.get(p.driveId);
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
      driveDate: d?.driveDate || 'N/A',
    };
  });

  const uniqueCompanies = Array.from(new Set(placements.map((p) => p.companyName)));

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.jobRole.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = companyFilter === 'ALL' || r.companyName === companyFilter;
    const matchesBranch = branchFilter === 'ALL' || r.branch === branchFilter;
    return matchesSearch && matchesCompany && matchesBranch;
  });

  const handleExportCSV = () => {
    const headers = ['Roll Number,Student Name,Branch,Department,Company,Job Role,Package,Date'];
    const lines = filteredRows.map(
      (r) =>
        `"${r.rollNumber}","${r.name}","${r.branch}","${r.department}","${r.companyName}","${r.jobRole}","${r.package}","${r.selectedAt}"`
    );
    const content = [headers, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IRON_Placed_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Placed Students Repository</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Authoritative placement registry across all campus recruitment drives. Multiple offers per student supported.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-zinc-500" />
          <span>Export Placements CSV</span>
        </button>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Total Placements</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {placements.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Verified offers generated</span>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Unique Students Placed</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {new Set(placements.map((p) => p.studentId)).size}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Students with at least one offer</span>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Participating Companies</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {uniqueCompanies.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Hiring partner organizations</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search candidate, roll no, company, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Company:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="ALL">All Companies</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="ALL">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Placements Table */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Roll Number</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Branch & Dept</th>
              <th className="py-2.5 px-3">Company</th>
              <th className="py-2.5 px-3">Job Role</th>
              <th className="py-2.5 px-3">Package (CTC)</th>
              <th className="py-2.5 px-3 text-right">Offer Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-400">
                  No placement records matched your filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/50">
                  <td className="py-2.5 px-3 font-mono font-medium text-zinc-950">{r.rollNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-900">{r.name}</td>
                  <td className="py-2.5 px-3 text-zinc-600">
                    {r.branch} <span className="text-zinc-400">·</span> {r.department}
                  </td>
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
