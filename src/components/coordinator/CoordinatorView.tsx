import React, { useState, useMemo, useEffect } from 'react';
import { User, Drive, DriveRound, Batch, BatchStudent, Student, RoundCandidate } from '../../types';
import { ironStorage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Search,
  CheckSquare,
  Square,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface CoordinatorViewProps {
  currentUser: User;
  onRefresh: () => void;
}

export const CoordinatorView: React.FC<CoordinatorViewProps> = ({
  currentUser,
  onRefresh,
}) => {
  const drives = ironStorage.getDrives();
  // Coordinator is assigned to their specific drive (Rule 26)
  const assignedDrive = drives.find((d) => d.id === currentUser.driveId) || drives[0];

  const rounds = ironStorage.getRounds(assignedDrive?.id);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    rounds.length > 0 ? rounds[0].id : ''
  );
  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  const batches = ironStorage.getBatches(selectedRoundId);
  const [activeBatchId, setActiveBatchId] = useState<string>(
    batches.length > 0 ? batches[0].id : ''
  );
  const activeBatch = batches.find((b) => b.id === activeBatchId);

  const students = useMemo(() => ironStorage.getStudents(), []);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Helper to calculate outcomes for a batch
  const getBatchOutcomes = (batchId: string) => {
    const bStudents = ironStorage.getBatchStudents(batchId);
    const bEvals = ironStorage.getEvaluations(batchId);
    const evalMap = new Map(bEvals.map((e) => [e.studentId, e.action]));
    const bResults = ironStorage.getRoundResults().filter((rr) => rr.batchId === batchId);
    const resultMap = new Map(bResults.map((rr) => [rr.studentId, rr.result]));

    let selected = 0;
    let hold = 0;
    let rejected = 0;

    bStudents.forEach((bs) => {
      const outcome =
        resultMap.get(bs.studentId) ||
        (evalMap.get(bs.studentId) === 'SELECT'
          ? 'SELECTED'
          : evalMap.get(bs.studentId) === 'HOLD'
          ? 'HOLD'
          : 'REJECTED');
      if (outcome === 'SELECTED') selected++;
      else if (outcome === 'HOLD') hold++;
      else rejected++;
    });

    return { selected, hold, rejected, total: bStudents.length };
  };

  // Helper to get outcome for a student in a submitted batch
  const getStudentOutcome = (batchId: string, studentId: string) => {
    const bResults = ironStorage.getRoundResults().filter((rr) => rr.batchId === batchId);
    const foundResult = bResults.find((rr) => rr.studentId === studentId);
    if (foundResult) return foundResult.result;

    const bEvals = ironStorage.getEvaluations(batchId);
    const foundEval = bEvals.find((e) => e.studentId === studentId);
    if (foundEval) {
      if (foundEval.action === 'SELECT') return 'SELECTED';
      if (foundEval.action === 'HOLD') return 'HOLD';
      return 'REJECTED';
    }
    return 'REJECTED';
  };

  // Modals
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [deleteBatchCandidate, setDeleteBatchCandidate] = useState<Batch | null>(null);

  // Create Batch Form
  const [batchName, setBatchName] = useState('');
  const [capacityType, setCapacityType] = useState<'LIMITED' | 'UNLIMITED'>('LIMITED');
  const [capacity, setCapacity] = useState<number>(30);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Student Assignment State (Per Section 27.1: Bulk Selection & Select All)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  if (!assignedDrive) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500">
        No drive assigned to this coordinator account.
      </div>
    );
  }

  // Candidates for selected round
  const roundCandidates = ironStorage.getCandidates(selectedRoundId);

  // All batch assignments in this round (Rule 15: Student Batch Uniqueness)
  const allBatchStudentsInRound = ironStorage
    .getBatchStudents()
    .filter((bs) => bs.roundId === selectedRoundId);
  const assignedStudentIdsInRound = new Set(allBatchStudentsInRound.map((bs) => bs.studentId));

  // Current batch students
  const currentBatchStudents = activeBatch ? ironStorage.getBatchStudents(activeBatch.id) : [];

  // Batch Students Pagination & Filter State
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchCurrentPage, setBatchCurrentPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(50);
  const [batchJumpPageInput, setBatchJumpPageInput] = useState('');

  // Reset page when active batch, search term, or page size changes
  useEffect(() => {
    setBatchCurrentPage(1);
  }, [activeBatchId, batchSearchTerm, batchPageSize]);

  // Filtered batch students
  const filteredBatchStudents = useMemo(() => {
    const clean = batchSearchTerm.trim().toLowerCase();
    return currentBatchStudents.filter((bs) => {
      const s = studentMap.get(bs.studentId);
      if (!s) return false;
      if (!clean) return true;
      return (
        s.fullName.toLowerCase().includes(clean) ||
        s.rollNumber.toLowerCase().includes(clean) ||
        s.branch.toLowerCase().includes(clean) ||
        (s.department && s.department.toLowerCase().includes(clean))
      );
    });
  }, [currentBatchStudents, studentMap, batchSearchTerm]);

  const totalBatchStudents = filteredBatchStudents.length;
  const totalBatchPages = Math.max(1, Math.ceil(totalBatchStudents / batchPageSize));
  const safeBatchPage = Math.min(Math.max(1, batchCurrentPage), totalBatchPages);
  const batchStartIndex = (safeBatchPage - 1) * batchPageSize;
  const batchEndIndex = Math.min(batchStartIndex + batchPageSize, totalBatchStudents);

  const paginatedBatchStudents = useMemo(() => {
    return filteredBatchStudents.slice(batchStartIndex, batchEndIndex);
  }, [filteredBatchStudents, batchStartIndex, batchEndIndex]);

  const handleBatchPageChange = (newPage: number) => {
    const target = Math.min(Math.max(1, newPage), totalBatchPages);
    setBatchCurrentPage(target);
  };

  const handleBatchJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(batchJumpPageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalBatchPages) {
      setBatchCurrentPage(parsed);
      setBatchJumpPageInput('');
    }
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);

    if (!batchName.trim()) {
      setBatchError('Batch name is required.');
      return;
    }

    if (capacityType === 'LIMITED' && (!capacity || capacity <= 0)) {
      setBatchError('Capacity must be greater than 0.');
      return;
    }

    try {
      const newB = ironStorage.createBatch(
        selectedRoundId,
        assignedDrive.id,
        batchName,
        capacityType,
        capacityType === 'LIMITED' ? capacity : null,
        currentUser.username
      );
      setIsCreateBatchOpen(false);
      setBatchName('');
      setActiveBatchId(newB.id);
      onRefresh();
    } catch (err: any) {
      setBatchError(err.message || 'Error creating batch.');
    }
  };

  const handleDeleteBatch = () => {
    if (!deleteBatchCandidate) return;
    try {
      ironStorage.deleteBatch(deleteBatchCandidate.id);
      setDeleteBatchCandidate(null);
      if (activeBatchId === deleteBatchCandidate.id) {
        const remaining = batches.filter((b) => b.id !== deleteBatchCandidate.id);
        setActiveBatchId(remaining.length > 0 ? remaining[0].id : '');
      }
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenAssignModal = () => {
    setSelectedStudentIds(new Set());
    setAssignSearch('');
    setAssignError(null);
    setAssignSuccess(null);
    setIsAssignOpen(true);
  };

  const handleToggleStudent = (studentId: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudentIds(next);
  };

  // Filter available candidates for assignment modal
  const eligibleCandidatesForModal = roundCandidates
    .map((c) => {
      const s = studentMap.get(c.studentId);
      const isAssigned = assignedStudentIdsInRound.has(c.studentId);
      return {
        candidate: c,
        student: s,
        isAssigned,
      };
    })
    .filter((item) => item.student)
    .filter((item) => {
      if (!assignSearch.trim()) return true;
      const q = assignSearch.toLowerCase();
      return (
        item.student!.fullName.toLowerCase().includes(q) ||
        item.student!.rollNumber.toLowerCase().includes(q) ||
        item.student!.branch.toLowerCase().includes(q)
      );
    });

  // Unassigned candidates in this round
  const unassignedInView = eligibleCandidatesForModal.filter((item) => !item.isAssigned);

  // Modal Candidates Pagination
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(50);

  useEffect(() => {
    setModalCurrentPage(1);
  }, [assignSearch, isAssignOpen, modalPageSize]);

  const totalModalCandidates = eligibleCandidatesForModal.length;
  const totalModalPages = Math.max(1, Math.ceil(totalModalCandidates / modalPageSize));
  const safeModalPage = Math.min(Math.max(1, modalCurrentPage), totalModalPages);
  const modalStartIndex = (safeModalPage - 1) * modalPageSize;
  const modalEndIndex = Math.min(modalStartIndex + modalPageSize, totalModalCandidates);

  const paginatedModalCandidates = useMemo(() => {
    return eligibleCandidatesForModal.slice(modalStartIndex, modalEndIndex);
  }, [eligibleCandidatesForModal, modalStartIndex, modalEndIndex]);

  const handleSelectAll = () => {
    if (selectedStudentIds.size === unassignedInView.length && unassignedInView.length > 0) {
      // Deselect all
      setSelectedStudentIds(new Set());
    } else {
      // Select all unassigned
      const next = new Set<string>();
      unassignedInView.forEach((item) => next.add(item.student!.id));
      setSelectedStudentIds(next);
    }
  };

  const handleConfirmAssignment = () => {
    if (!activeBatch) return;
    setAssignError(null);

    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) {
      setAssignError('Please select at least one student.');
      return;
    }

    try {
      const res = ironStorage.addStudentsToBatch(
        activeBatch.id,
        selectedRoundId,
        ids,
        currentUser.username
      );

      if (res.errors.length > 0) {
        setAssignError(res.errors.join('; '));
      }

      if (res.addedCount > 0) {
        setAssignSuccess(`Added ${res.addedCount} student(s) to ${activeBatch.batchName}.`);
        setSelectedStudentIds(new Set());
        setTimeout(() => {
          setIsAssignOpen(false);
          setAssignSuccess(null);
        }, 1200);
      }
      onRefresh();
    } catch (err: any) {
      setAssignError(err.message || 'Failed to add students to batch.');
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    if (!activeBatch) return;
    try {
      ironStorage.removeStudentFromBatch(activeBatch.id, studentId);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              Coordinator Console: {assignedDrive.companyName}
            </h1>
            <StatusBadge status={assignedDrive.status} />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Drive Date: <span className="font-mono text-zinc-900">{assignedDrive.driveDate}</span> · Venue: {assignedDrive.location} · Package: {assignedDrive.package}
          </p>
        </div>
      </div>

      {/* Round Selection Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">Recruitment Rounds:</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {rounds.map((rnd) => {
            const count = ironStorage.getCandidates(rnd.id).length;
            const isSelected = rnd.id === selectedRoundId;
            return (
              <button
                key={rnd.id}
                onClick={() => {
                  setSelectedRoundId(rnd.id);
                  const bList = ironStorage.getBatches(rnd.id);
                  setActiveBatchId(bList.length > 0 ? bList[0].id : '');
                }}
                className={`px-3.5 py-2 text-xs rounded border transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-950 text-white border-zinc-950 font-semibold'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span>{rnd.roundName}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {count} candidates
                </span>
                {rnd.isFinalRound && (
                  <span className="text-[10px] text-amber-400">★ Final</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Workspace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Batches List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Batches in {selectedRound?.roundName}
            </h2>
            <button
              type="button"
              onClick={() => {
                setBatchName(`Batch ${batches.length + 1}`);
                setCapacity(30);
                setCapacityType('LIMITED');
                setBatchError(null);
                setIsCreateBatchOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:text-zinc-600 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Batch</span>
            </button>
          </div>

          <div className="space-y-2">
            {batches.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded">
                No batches created for this round. Click "New Batch" to begin student distribution.
              </div>
            ) : (
              batches.map((b) => {
                const bStudents = ironStorage.getBatchStudents(b.id);
                const isSelected = b.id === activeBatchId;
                const isFull = b.capacityType === 'LIMITED' && b.capacity !== null && bStudents.length >= b.capacity;
                const isSubmitted = b.status === 'SUBMITTED';
                const bOutcomes = isSubmitted ? getBatchOutcomes(b.id) : null;

                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBatchId(b.id)}
                    className={`p-3.5 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-50 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {isSubmitted && <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                        <span className="font-semibold text-xs text-zinc-950">{b.batchName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold text-zinc-800 bg-zinc-200 border border-zinc-300">
                            FROZEN
                          </span>
                        ) : (
                          <StatusBadge status={b.status} />
                        )}
                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteBatchCandidate(b);
                            }}
                            className="text-zinc-400 hover:text-rose-600 p-0.5"
                            title="Delete Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span>
                        Capacity: {b.capacityType === 'LIMITED' ? `${bStudents.length} / ${b.capacity}` : `${bStudents.length} / Unlimited`}
                      </span>
                      {isFull && !isSubmitted && (
                        <span className="text-amber-700 font-semibold uppercase">Full</span>
                      )}
                    </div>

                    {/* Quick Outcome Counts for Frozen Batches */}
                    {isSubmitted && bOutcomes && (
                      <div className="mt-2 pt-2 border-t border-zinc-200 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-700 font-bold">{bOutcomes.selected} Selected</span>
                        <span className="text-amber-700 font-bold">{bOutcomes.hold} Hold</span>
                        <span className="text-rose-700 font-bold">{bOutcomes.rejected} Rejected</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Batch Details & Assigned Students */}
        <div className="md:col-span-2 space-y-4">
          {activeBatch ? (
            <div className="border border-zinc-200 bg-white rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {activeBatch.status === 'SUBMITTED' && (
                      <Lock className="w-4 h-4 text-zinc-700 shrink-0" />
                    )}
                    <h3 className="text-base font-bold text-zinc-950">{activeBatch.batchName}</h3>
                    {activeBatch.status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-zinc-900 bg-zinc-200 border border-zinc-300">
                        FROZEN / SUBMITTED
                      </span>
                    ) : (
                      <StatusBadge status={activeBatch.status} />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {activeBatch.capacityType === 'LIMITED'
                      ? `Capacity: ${currentBatchStudents.length} of ${activeBatch.capacity} allocated`
                      : `Capacity: ${currentBatchStudents.length} allocated (No limit)`}
                  </p>
                </div>

                {activeBatch.status !== 'SUBMITTED' ? (
                  <button
                    type="button"
                    onClick={handleOpenAssignModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors self-start sm:self-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign Students</span>
                  </button>
                ) : (
                  <div className="p-1.5 px-3 bg-zinc-100 border border-zinc-300 rounded text-xs font-semibold text-zinc-700 flex items-center gap-1.5 self-start sm:self-auto">
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                    <span>READ-ONLY (EVALUATED BY HR)</span>
                  </div>
                )}
              </div>

              {/* Frozen Batch Overview Banner & Outcome Cards */}
              {activeBatch.status === 'SUBMITTED' && (() => {
                const outcomes = getBatchOutcomes(activeBatch.id);
                return (
                  <div className="p-4 bg-zinc-50 border border-zinc-300 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-950 font-bold">
                        <Lock className="w-4 h-4 text-zinc-800" />
                        <span>BATCH FROZEN & LOCKED</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        Submitted: {activeBatch.submittedAt ? new Date(activeBatch.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Official HR Record'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Company HR has submitted this batch. Candidate results have been permanently recorded in the database.
                      The breakdown below reflects the official status of all assigned candidates:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          Selected (Next Stage / Placed)
                        </span>
                        <span className="font-mono text-2xl font-extrabold text-emerald-900 mt-0.5">
                          {outcomes.selected}
                        </span>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                          Hold (Carried to Next Round)
                        </span>
                        <span className="font-mono text-2xl font-extrabold text-amber-900 mt-0.5">
                          {outcomes.hold}
                        </span>
                      </div>

                      <div className="p-3 bg-rose-50/70 border border-rose-300 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                          Rejected (Discontinued)
                        </span>
                        <span className="font-mono text-2xl font-extrabold text-rose-900 mt-0.5">
                          {outcomes.rejected}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Assigned Students Table with Pagination & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-2 w-full sm:w-64">
                    <div className="relative w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search allocated students..."
                        value={batchSearchTerm}
                        onChange={(e) => setBatchSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-600">
                    <div className="font-mono text-[11px]">
                      Showing <strong className="text-zinc-900">{totalBatchStudents === 0 ? 0 : batchStartIndex + 1}–{batchEndIndex}</strong> of{' '}
                      <strong className="text-zinc-900">{totalBatchStudents.toLocaleString()}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-[10px]">Rows:</span>
                      <select
                        value={batchPageSize}
                        onChange={(e) => setBatchPageSize(Number(e.target.value))}
                        className="px-1.5 py-0.5 text-xs border border-zinc-300 rounded bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredBatchStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded">
                    {currentBatchStudents.length === 0
                      ? 'No students currently assigned to this batch. Click "Assign Students" to add candidates.'
                      : 'No allocated students matched your search criteria.'}
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[800px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Roll Number</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3">CGPA</th>
                          <th className="py-2.5 px-3 text-right">
                            {activeBatch.status === 'SUBMITTED' ? 'HR Decision & Outcome' : 'Remove'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {paginatedBatchStudents.map((bs) => {
                          const s = studentMap.get(bs.studentId);
                          const isSubmitted = activeBatch.status === 'SUBMITTED';
                          const outcome = isSubmitted ? getStudentOutcome(activeBatch.id, bs.studentId) : null;

                          let rowClass = 'hover:bg-zinc-50/50';
                          if (isSubmitted) {
                            if (outcome === 'SELECTED') {
                              rowClass = 'bg-emerald-50/80 hover:bg-emerald-100/80 border-l-4 border-l-emerald-600';
                            } else if (outcome === 'HOLD') {
                              rowClass = 'bg-amber-50/80 hover:bg-amber-100/80 border-l-4 border-l-amber-600';
                            } else {
                              rowClass = 'bg-rose-50/80 hover:bg-rose-100/80 border-l-4 border-l-rose-600';
                            }
                          }

                          return (
                            <tr key={bs.id} className={rowClass}>
                              <td className="py-2.5 px-3 font-mono font-medium text-zinc-950">
                                {s?.rollNumber}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-zinc-900">
                                {s?.fullName}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-600">{s?.branch}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">
                                {s?.cgpa.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isSubmitted ? (
                                  outcome === 'SELECTED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded shadow-xs font-mono">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                      <span>SELECTED</span>
                                    </span>
                                  ) : outcome === 'HOLD' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded shadow-xs font-mono">
                                      <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                                      <span>HOLD</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 rounded shadow-xs font-mono">
                                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                                      <span>REJECTED</span>
                                    </span>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudent(bs.studentId)}
                                    className="text-xs text-rose-600 hover:text-rose-900 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Batch Table Pagination Controls */}
                {totalBatchPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-zinc-700">
                    <div className="font-mono text-zinc-500">
                      Page <strong className="text-zinc-900">{safeBatchPage}</strong> of{' '}
                      <strong className="text-zinc-900">{totalBatchPages}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button
                        type="button"
                        disabled={safeBatchPage <= 1}
                        onClick={() => handleBatchPageChange(1)}
                        className="p-1 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={safeBatchPage <= 1}
                        onClick={() => handleBatchPageChange(safeBatchPage - 1)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      {(() => {
                        const pages: (number | string)[] = [];
                        if (totalBatchPages <= 7) {
                          for (let i = 1; i <= totalBatchPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (safeBatchPage > 3) pages.push('...');
                          const start = Math.max(2, safeBatchPage - 1);
                          const end = Math.min(totalBatchPages - 1, safeBatchPage + 1);
                          for (let i = start; i <= end; i++) {
                            pages.push(i);
                          }
                          if (safeBatchPage < totalBatchPages - 2) pages.push('...');
                          pages.push(totalBatchPages);
                        }

                        return pages.map((p, idx) => {
                          if (typeof p === 'string') {
                            return (
                              <span key={`dots-${idx}`} className="px-1 text-zinc-400 font-mono">
                                ...
                              </span>
                            );
                          }
                          const isActive = p === safeBatchPage;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleBatchPageChange(p)}
                              className={`min-w-6 h-6 px-1.5 font-mono text-xs rounded border transition-colors ${
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

                      <button
                        type="button"
                        disabled={safeBatchPage >= totalBatchPages}
                        onClick={() => handleBatchPageChange(safeBatchPage + 1)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={safeBatchPage >= totalBatchPages}
                        onClick={() => handleBatchPageChange(totalBatchPages)}
                        className="p-1 rounded border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white text-zinc-700 transition-colors"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>

                      <form onSubmit={handleBatchJumpSubmit} className="flex items-center gap-1 pl-2 ml-1 border-l border-zinc-200">
                        <span className="text-[10px] text-zinc-500">Go:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalBatchPages}
                          value={batchJumpPageInput}
                          onChange={(e) => setBatchJumpPageInput(e.target.value)}
                          placeholder={`${safeBatchPage}`}
                          className="w-10 px-1 py-0.5 text-xs font-mono text-center border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded">
              Select or create a batch to view and assign candidates.
            </div>
          )}
        </div>
      </div>

      {/* CREATE BATCH MODAL (Per Section 44) */}
      <Modal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
        title="Create New Batch"
        subtitle={`Round: ${selectedRound?.roundName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
          {batchError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded">
              {batchError}
            </div>
          )}

          <div>
            <label className="block text-zinc-700 font-medium mb-1">Batch Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Batch 3 - Technical Panel"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-medium mb-1">Capacity Configuration</label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="capacityType"
                  checked={capacityType === 'LIMITED'}
                  onChange={() => setCapacityType('LIMITED')}
                  className="accent-zinc-900"
                />
                <span>Fixed Capacity</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="capacityType"
                  checked={capacityType === 'UNLIMITED'}
                  onChange={() => setCapacityType('UNLIMITED')}
                  className="accent-zinc-900"
                />
                <span>No Limit (Unlimited)</span>
              </label>
            </div>
          </div>

          {capacityType === 'LIMITED' && (
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Maximum Student Limit</label>
              <input
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Backend strictly prevents adding students beyond this threshold.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsCreateBatchOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded"
            >
              Create Batch
            </button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN STUDENTS MODAL (Per Section 27.1: Select All & Individual Deselect) */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Add Students to ${activeBatch?.batchName}`}
        subtitle={`Available Round Candidates · ${activeBatch?.capacityType === 'LIMITED' ? `Max capacity: ${activeBatch?.capacity}` : 'Unlimited'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          {assignError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{assignError}</span>
            </div>
          )}

          {assignSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{assignSuccess}</span>
            </div>
          )}

          {/* Search and Select All Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-200 pb-3">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search candidates..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:text-zinc-600"
              >
                {selectedStudentIds.size > 0 && selectedStudentIds.size === unassignedInView.length ? (
                  <CheckSquare className="w-4 h-4 text-zinc-900" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400" />
                )}
                <span>Select All ({unassignedInView.length} Available)</span>
              </button>

              <span className="text-zinc-400">|</span>

              <span className="font-mono font-medium text-zinc-700">
                {selectedStudentIds.size} Selected
              </span>
            </div>
          </div>

          {/* Candidates List with Single-Round Conflict Protection */}
          <div className="max-h-72 overflow-y-auto border border-zinc-200 rounded divide-y divide-zinc-200">
            {eligibleCandidatesForModal.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                No eligible candidates found for this round.
              </div>
            ) : (
              paginatedModalCandidates.map(({ candidate, student, isAssigned }) => {
                const isSelected = selectedStudentIds.has(student!.id);
                return (
                  <div
                    key={candidate.id}
                    onClick={() => {
                      if (!isAssigned) {
                        handleToggleStudent(student!.id);
                      }
                    }}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      isAssigned
                        ? 'bg-zinc-50 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-zinc-100/70 cursor-pointer'
                        : 'hover:bg-zinc-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {isAssigned ? (
                          <div className="w-4 h-4 rounded border border-zinc-300 bg-zinc-200" />
                        ) : isSelected ? (
                          <CheckSquare className="w-4 h-4 text-zinc-900" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-950 flex items-center gap-2">
                          <span>{student!.fullName}</span>
                          {candidate.entryStatus === 'HOLD' && (
                            <span className="px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded">
                              HOLD Carry-Over
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {student!.rollNumber} · {student!.branch} · CGPA {student!.cgpa.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isAssigned ? (
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-200/80 px-2 py-0.5 rounded">
                          Already Assigned in Round
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Eligible
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Candidate Pagination Controls */}
          {totalModalPages > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs text-zinc-600 font-mono">
              <div>
                Showing {modalStartIndex + 1}–{modalEndIndex} of {totalModalCandidates} candidates
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeModalPage <= 1}
                  onClick={() => setModalCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border border-zinc-300 rounded bg-white hover:bg-zinc-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 text-zinc-900 font-bold">
                  {safeModalPage} / {totalModalPages}
                </span>
                <button
                  type="button"
                  disabled={safeModalPage >= totalModalPages}
                  onClick={() => setModalCurrentPage((p) => Math.min(totalModalPages, p + 1))}
                  className="px-2 py-1 border border-zinc-300 rounded bg-white hover:bg-zinc-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedStudentIds.size === 0}
              onClick={handleConfirmAssignment}
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 rounded transition-colors"
            >
              Add {selectedStudentIds.size} Students
            </button>
          </div>
        </div>
      </Modal>

      {/* BATCH DELETION CONFIRMATION (Per Section 27.2) */}
      <ConfirmDialog
        isOpen={!!deleteBatchCandidate}
        onClose={() => setDeleteBatchCandidate(null)}
        onConfirm={handleDeleteBatch}
        title="Delete Batch"
        message={`Are you sure you want to delete "${deleteBatchCandidate?.batchName}"? Any student assignments in this batch will be released back to the round candidate pool.`}
        confirmLabel="Delete Batch"
        isDestructive={true}
      />
    </div>
  );
};
