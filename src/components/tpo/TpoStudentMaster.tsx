import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import { ironStorage } from '../../services/storage';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Plus,
  Upload,
  Download,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface TpoStudentMasterProps {
  onRefresh: () => void;
}

export const TpoStudentMaster: React.FC<TpoStudentMasterProps> = ({ onRefresh }) => {
  // Load students into state so renders do not repeatedly invoke JSON.parse
  const [students, setStudents] = useState<Student[]>(() => ironStorage.getStudents());

  // Subscribe to storage changes to update state only when data changes
  useEffect(() => {
    const unsubscribe = ironStorage.subscribe(() => {
      setStudents(ironStorage.getStudents());
    });
    return unsubscribe;
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Pagination State (50 students per page default for optimal DOM performance)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    rollNumber: '',
    fullName: '',
    email: '',
    phone: '',
    college: 'Institute of Engineering & Technology',
    branch: 'CSE',
    department: 'Computer Science & Engineering',
    academicYear: '2022-2026',
    cgpa: 8.0,
    backlogCount: 0,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Import State
  const [importText, setImportText] = useState('');
  const [importReport, setImportReport] = useState<{
    total: number;
    valid: Student[];
    invalid: { row: number; reason: string }[];
    duplicates: string[];
  } | null>(null);

  // Memoized branch counts
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: students.length };
    for (const s of students) {
      counts[s.branch] = (counts[s.branch] || 0) + 1;
    }
    return counts;
  }, [students]);

  // Memoized filtered students: only recomputed when students, search, or branch filter changes
  const filteredStudents = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !cleanSearch ||
        s.fullName.toLowerCase().includes(cleanSearch) ||
        s.rollNumber.toLowerCase().includes(cleanSearch) ||
        s.email.toLowerCase().includes(cleanSearch);
      const matchesBranch = branchFilter === 'ALL' || s.branch === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [students, searchTerm, branchFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, branchFilter, pageSize]);

  // Pagination Calculations
  const totalStudents = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalStudents);

  // Only render the current page of students in the DOM
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    const target = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(target);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed);
      setJumpPageInput('');
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      rollNumber: '',
      fullName: '',
      email: '',
      phone: '',
      college: 'Institute of Engineering & Technology',
      branch: 'CSE',
      department: 'Computer Science & Engineering',
      academicYear: '2022-2026',
      cgpa: 8.0,
      backlogCount: 0,
      isActive: true,
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.rollNumber || !formData.fullName) {
      setFormError('Roll number and full name are required.');
      return;
    }

    try {
      if (editingStudent) {
        ironStorage.saveStudent(formData as any, editingStudent.id);
        setIsEditOpen(false);
      } else {
        ironStorage.saveStudent(formData as any);
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error saving student record.');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteCandidate) return;
    ironStorage.deleteStudent(deleteCandidate.id);
    setDeleteCandidate(null);
    onRefresh();
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Roll Number,Full Name,Email,Phone,College,Branch,Department,Academic Year,CGPA,Backlogs,Active',
    ];
    const rows = students.map(
      (s) =>
        `"${s.rollNumber}","${s.fullName}","${s.email}","${s.phone}","${s.college}","${s.branch}","${s.department}","${s.academicYear}",${s.cgpa},${s.backlogCount},${s.isActive}`
    );
    const content = [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IRON_Student_Master_DB_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import Validation (Per Section 53)
  const handleValidateImport = () => {
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    const existingRolls = new Set(students.map((s) => s.rollNumber.toUpperCase()));

    const valid: Student[] = [];
    const invalid: { row: number; reason: string }[] = [];
    const duplicates: string[] = [];

    // Skip header if detected
    const startIndex = lines[0].toLowerCase().includes('roll') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      // Expected: Roll, Name, Email, Phone, College, Branch, Department, AcademicYear, CGPA, Backlogs
      const [roll, name, email, phone, college, branch, department, year, cgpaStr, backlogsStr] = cols;

      if (!roll || !name) {
        invalid.push({ row: i + 1, reason: 'Missing Roll Number or Name' });
        continue;
      }

      const cleanRoll = roll.toUpperCase();
      if (existingRolls.has(cleanRoll)) {
        duplicates.push(cleanRoll);
        continue;
      }

      const cgpa = parseFloat(cgpaStr);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        invalid.push({ row: i + 1, reason: `Invalid CGPA value: ${cgpaStr}` });
        continue;
      }

      const backlogs = parseInt(backlogsStr) || 0;
      if (backlogs < 0) {
        invalid.push({ row: i + 1, reason: `Invalid backlogs value: ${backlogsStr}` });
        continue;
      }

      existingRolls.add(cleanRoll);

      valid.push({
        id: `std_imp_${Date.now()}_${i}`,
        rollNumber: cleanRoll,
        fullName: name,
        email: email || `${cleanRoll.toLowerCase()}@college.edu`,
        phone: phone || '+91 90000 00000',
        college: college || 'Institute of Engineering & Technology',
        branch: branch || 'CSE',
        department: department || 'Engineering',
        academicYear: year || '2022-2026',
        cgpa,
        backlogCount: backlogs,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setImportReport({
      total: lines.length - startIndex,
      valid,
      invalid,
      duplicates,
    });
  };

  const handleCommitImport = () => {
    if (!importReport || importReport.valid.length === 0) return;

    for (const s of importReport.valid) {
      ironStorage.saveStudent(s);
    }

    setIsImportOpen(false);
    setImportText('');
    setImportReport(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Student Master Database</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Permanent college student records. Sourced across drives and preserved independently of 6-month drive expiry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImportText('');
              setImportReport(null);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Import Excel/CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Results Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by roll number, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-medium">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
            >
              <option value="ALL">All Branches ({branchCounts.ALL || 0})</option>
              <option value="CSE">CSE ({branchCounts.CSE || 0})</option>
              <option value="CSE-DS">CSE-DS ({branchCounts['CSE-DS'] || 0})</option>
              <option value="CSE-AIML">CSE-AIML ({branchCounts['CSE-AIML'] || 0})</option>
              <option value="CSE-CS">CSE-CS ({branchCounts['CSE-CS'] || 0})</option>
              <option value="CSE-IOT">CSE-IOT ({branchCounts['CSE-IOT'] || 0})</option>
              <option value="IT">IT ({branchCounts.IT || 0})</option>
              <option value="ECE">ECE ({branchCounts.ECE || 0})</option>
              <option value="EEE">EEE ({branchCounts.EEE || 0})</option>
              <option value="MECH">MECH ({branchCounts.MECH || 0})</option>
              <option value="CIVIL">CIVIL ({branchCounts.CIVIL || 0})</option>
              <option value="MBA">MBA ({branchCounts.MBA || 0})</option>
            </select>
          </div>
        </div>

        {/* Results Counter and Page Size */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-600">
          <div className="font-mono">
            Showing <strong className="text-zinc-900">{totalStudents === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{' '}
            <strong className="text-zinc-900">{totalStudents.toLocaleString()}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-zinc-300 rounded bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Master Table (Renders ONLY 50 rows at a time for 60fps performance) */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Roll Number</th>
              <th className="py-2.5 px-3">Full Name</th>
              <th className="py-2.5 px-3">Branch & Dept</th>
              <th className="py-2.5 px-3">Academic Year</th>
              <th className="py-2.5 px-3">CGPA</th>
              <th className="py-2.5 px-3">Backlogs</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400">
                  No students matched your search criteria.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/50">
                  <td className="py-2 px-3 font-mono font-medium text-zinc-950">{s.rollNumber}</td>
                  <td className="py-2 px-3 font-medium text-zinc-900">{s.fullName}</td>
                  <td className="py-2 px-3 text-zinc-600">
                    {s.branch} <span className="text-zinc-400">·</span> {s.department}
                  </td>
                  <td className="py-2 px-3 font-mono text-zinc-600">{s.academicYear}</td>
                  <td className="py-2 px-3 font-mono font-semibold text-zinc-950">{s.cgpa.toFixed(2)}</td>
                  <td className="py-2 px-3 font-mono">
                    {s.backlogCount > 0 ? (
                      <span className="text-rose-700 font-semibold">{s.backlogCount}</span>
                    ) : (
                      <span className="text-zinc-500">0</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100"
                      title="Edit Student"
                    >
                      <Edit2 className="w-3.5 h-3.5 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(s)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls (Rule: 50 students per page with fast navigation) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-zinc-700">
          <div className="font-mono text-zinc-500">
            Page <strong className="text-zinc-900">{safePage}</strong> of{' '}
            <strong className="text-zinc-900">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* First Page */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(1)}
              className="p-1.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Numeric Page Buttons */}
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (safePage > 3) pages.push('...');
                const start = Math.max(2, safePage - 1);
                const end = Math.min(totalPages - 1, safePage + 1);
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                if (safePage < totalPages - 2) pages.push('...');
                pages.push(totalPages);
              }

              return pages.map((p, idx) => {
                if (typeof p === 'string') {
                  return (
                    <span key={`dots-${idx}`} className="px-1 text-zinc-400 font-mono">
                      ...
                    </span>
                  );
                }
                const isActive = p === safePage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    className={`min-w-7 h-7 px-2 font-mono text-xs rounded border transition-colors ${
                      isActive
                        ? 'bg-zinc-950 text-white border-zinc-950 font-bold'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            {/* Next Page */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="p-1.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

            {/* Direct Jump Input */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 pl-2 ml-1 border-l border-zinc-200">
              <span className="text-[11px] text-zinc-500">Go:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder={`${safePage}`}
                className="w-12 px-1.5 py-1 text-xs font-mono text-center border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL (Per Section 52) */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? `Edit: ${editingStudent?.fullName}` : 'Add New Student'}
        subtitle="Registered in College Permanent Student Master DB"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Roll Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 22B81A0511"
                value={formData.rollNumber || ''}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Varun Tej"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Branch</label>
              <select
                value={formData.branch || 'CSE'}
                onChange={(e) => {
                  const b = e.target.value;
                  const deptMap: Record<string, string> = {
                    CSE: 'Computer Science & Engineering',
                    'CSE-DS': 'CSE (Data Science)',
                    'CSE-AIML': 'CSE (AI & Machine Learning)',
                    'CSE-CS': 'CSE (Cyber Security)',
                    'CSE-IOT': 'CSE (Internet of Things)',
                    IT: 'Information Technology',
                    ECE: 'Electronics & Communication',
                    EEE: 'Electrical & Electronics',
                    MECH: 'Mechanical Engineering',
                    CIVIL: 'Civil Engineering',
                    MBA: 'Master of Business Administration',
                  };
                  setFormData({ ...formData, branch: b, department: deptMap[b] || 'Engineering' });
                }}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="CSE">CSE</option>
                <option value="CSE-DS">CSE-DS (Data Science)</option>
                <option value="CSE-AIML">CSE-AIML (AI & ML)</option>
                <option value="CSE-CS">CSE-CS (Cyber Security)</option>
                <option value="CSE-IOT">CSE-IOT (Internet of Things)</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="MBA">MBA</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Department</label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">CGPA (0-10)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                required
                value={formData.cgpa ?? 8.0}
                onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Backlogs</label>
              <input
                type="number"
                min="0"
                required
                value={formData.backlogCount ?? 0}
                onChange={(e) => setFormData({ ...formData, backlogCount: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Batch Year</label>
              <input
                type="text"
                value={formData.academicYear || '2022-2026'}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded"
            >
              Save Student
            </button>
          </div>
        </form>
      </Modal>

      {/* EXCEL / CSV IMPORT MODAL (Per Section 53) */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Students to Master DB"
        subtitle="Upload or paste CSV data with columns: RollNumber, Name, Email, Phone, College, Branch, Department, AcademicYear, CGPA, Backlogs"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-800">CSV Data (Paste Rows):</label>
              <button
                type="button"
                onClick={() => {
                  setImportText(
                    `Roll Number,Name,Email,Phone,College,Branch,Department,Academic Year,CGPA,Backlogs\n22B81A0511,Nikhil Kumar,nikhil.k@college.edu,+91 98480 99991,Institute of Engineering & Technology,CSE,Computer Science,2022-2026,8.60,0\n22B81A0512,Sravani Reddy,sravani.r@college.edu,+91 98480 99992,Institute of Engineering & Technology,ECE,Electronics,2022-2026,7.85,0\n22B81A0513,Pranay V,pranay.v@college.edu,+91 98480 99993,Institute of Engineering & Technology,IT,Information Tech,2022-2026,6.90,1`
                  );
                }}
                className="text-[11px] text-zinc-600 hover:text-zinc-950 underline"
              >
                Insert Sample Batch Data
              </button>
            </div>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportReport(null);
              }}
              placeholder="22B81A0511,Nikhil Kumar,nikhil.k@college.edu,+91 98480 99991,IET,CSE,Computer Science,2022-2026,8.60,0"
              className="w-full px-3 py-2 font-mono text-[11px] border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleValidateImport}
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors"
            >
              Validate File Data
            </button>
          </div>

          {/* Validation Result Box (Per Section 53) */}
          {importReport && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded space-y-3">
              <div className="font-semibold text-zinc-950">Validation Assessment:</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white border border-zinc-200 rounded">
                  <span className="text-zinc-500 block">Total Rows</span>
                  <span className="font-mono font-bold text-zinc-900">{importReport.total}</span>
                </div>
                <div className="p-2 bg-white border border-zinc-200 rounded">
                  <span className="text-emerald-700 block">Valid</span>
                  <span className="font-mono font-bold text-emerald-800">{importReport.valid.length}</span>
                </div>
                <div className="p-2 bg-white border border-zinc-200 rounded">
                  <span className="text-rose-700 block">Invalid</span>
                  <span className="font-mono font-bold text-rose-800">{importReport.invalid.length}</span>
                </div>
                <div className="p-2 bg-white border border-zinc-200 rounded">
                  <span className="text-amber-700 block">Duplicates</span>
                  <span className="font-mono font-bold text-amber-800">{importReport.duplicates.length}</span>
                </div>
              </div>

              {importReport.invalid.length > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] space-y-1">
                  <strong>Errors detected:</strong>
                  {importReport.invalid.map((err, i) => (
                    <div key={i}>Row {err.row}: {err.reason}</div>
                  ))}
                </div>
              )}

              {importReport.duplicates.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                  <strong>Skipped duplicates:</strong> {importReport.duplicates.join(', ')}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setImportReport(null)}
                  className="px-3 py-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={importReport.valid.length === 0}
                  onClick={handleCommitImport}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 rounded"
                >
                  Import {importReport.valid.length} Valid Records
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Student Record"
        message={`Are you sure you want to remove ${deleteCandidate?.fullName} (${deleteCandidate?.rollNumber}) from the Student Master Database? This action is permanent.`}
        confirmLabel="Delete Student"
        isDestructive={true}
      />
    </div>
  );
};
