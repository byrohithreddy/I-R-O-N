import React, { useState } from 'react';
import { User, Drive, DriveRound, Batch, BatchStudent, Student, Evaluation } from '../../types';
import { ironStorage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  CheckCircle2,
  Lock,
  Clock,
  Download,
  AlertTriangle,
  Send,
  Building,
  Check,
  PauseCircle,
  Edit3,
} from 'lucide-react';

interface HrEvaluationViewProps {
  currentUser: User;
  onRefresh: () => void;
}

export const HrEvaluationView: React.FC<HrEvaluationViewProps> = ({
  currentUser,
  onRefresh,
}) => {
  const drives = ironStorage.getDrives();
  const assignedDrive = drives.find((d) => d.id === currentUser.driveId) || drives[0];

  const rounds = ironStorage.getRounds(assignedDrive?.id);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    rounds.length > 0 ? rounds[0].id : ''
  );
  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  const batches = ironStorage.getBatches(selectedRoundId);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches.length > 0 ? batches[0].id : ''
  );
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const students = ironStorage.getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // HR Edit mode for already submitted batches
  const [isEditingSubmitted, setIsEditingSubmitted] = useState(false);

  // Submit Batch Confirmation Dialog
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    selectedCount: number;
    holdCount: number;
    rejectedCount: number;
    placedCount: number;
  } | null>(null);

  if (!assignedDrive) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500">
        No assigned company drive found for this HR account.
      </div>
    );
  }

  const batchStudents = selectedBatch ? ironStorage.getBatchStudents(selectedBatch.id) : [];
  const evaluations = selectedBatch ? ironStorage.getEvaluations(selectedBatch.id) : [];
  const evalMap = new Map(evaluations.map((e) => [e.studentId, e.action]));
  const roundResults = selectedRound ? ironStorage.getRoundResults(selectedRound.id) : [];
  const resultMap = new Map(roundResults.map((r) => [r.studentId, r.result]));

  const isBatchSubmitted = selectedBatch?.status === 'SUBMITTED';
  const isFinalRound = selectedRound?.isFinalRound || false;

  const handleAction = (batchStudentId: string, studentId: string, action: 'SELECT' | 'HOLD') => {
    if (!selectedBatch || (isBatchSubmitted && !isEditingSubmitted)) return;

    const currentAction = evalMap.get(studentId);
    const newAction = currentAction === action ? 'NONE' : action;

    try {
      ironStorage.saveEvaluation(selectedBatch.id, batchStudentId, studentId, newAction);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmSubmitBatch = () => {
    if (!selectedBatch) return;
    try {
      const res = ironStorage.submitBatch(selectedBatch.id, currentUser.username);
      setSubmitResult(res);
      setIsSubmitConfirmOpen(false);
      setIsEditingSubmitted(false);
      onRefresh();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  // Export batch results
  const handleExportBatchCSV = () => {
    if (!selectedBatch) return;
    const headers = ['Roll Number,Student Name,Branch,Department,CGPA,HR Action,Final Outcome'];
    const lines = batchStudents.map((bs) => {
      const s = studentMap.get(bs.studentId);
      const action = evalMap.get(bs.studentId) || 'NONE';
      const outcome = resultMap.get(bs.studentId) || (action === 'SELECT' ? 'SELECTED' : action === 'HOLD' ? 'HOLD' : 'REJECTED');
      return `"${s?.rollNumber || ''}","${s?.fullName || ''}","${s?.branch || ''}","${s?.department || ''}",${s?.cgpa || ''},"${action}","${outcome}"`;
    });
    const content = [headers, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${assignedDrive.companyName}_${selectedBatch.batchName}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary counts for current batch
  let currentSelects = 0;
  let currentHolds = 0;
  let currentNone = 0;

  batchStudents.forEach((bs) => {
    const act = evalMap.get(bs.studentId) || 'NONE';
    if (act === 'SELECT') currentSelects++;
    else if (act === 'HOLD') currentHolds++;
    else currentNone++;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              Recruiter Evaluation Console
            </h1>
            <span className="font-semibold text-xs px-2 py-0.5 rounded bg-zinc-100 border border-zinc-300">
              {assignedDrive.companyName}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Official candidate scoring and batch freezing. Submissions immediately update the college recruitment pool.
          </p>
        </div>

        {selectedBatch && (
          <button
            type="button"
            onClick={handleExportBatchCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export Batch CSV</span>
          </button>
        )}
      </div>

      {/* Rounds Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">Interview Stage / Round:</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {rounds.map((rnd) => {
            const isSelected = rnd.id === selectedRoundId;
            return (
              <button
                key={rnd.id}
                onClick={() => {
                  setSelectedRoundId(rnd.id);
                  const bList = ironStorage.getBatches(rnd.id);
                  setSelectedBatchId(bList.length > 0 ? bList[0].id : '');
                  setIsEditingSubmitted(false);
                }}
                className={`px-3.5 py-2 text-xs rounded border transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-950 text-white border-zinc-950 font-semibold'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span>{rnd.roundName}</span>
                {rnd.isFinalRound && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-zinc-950 font-bold rounded text-[10px]">
                    FINAL ROUND (NO HOLD)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batches Selector Bar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-700">Select Batch to Evaluate:</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {batches.length === 0 ? (
            <div className="text-xs text-zinc-400 py-1">
              No batches created yet by student coordinators for this round.
            </div>
          ) : (
            batches.map((b) => {
              const isSelected = b.id === selectedBatchId;
              const isSubmitted = b.status === 'SUBMITTED';
              const bsCount = ironStorage.getBatchStudents(b.id).length;

              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBatchId(b.id);
                    setIsEditingSubmitted(false);
                  }}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-100 font-semibold text-zinc-950'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {isSubmitted ? (
                    <Lock className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-emerald-600" />
                  )}
                  <span>{b.batchName} ({bsCount})</span>
                  <StatusBadge status={b.status} className="text-[10px] py-0 px-1" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Evaluation Main Card */}
      {selectedBatch ? (
        <div className="border border-zinc-200 bg-white rounded-lg p-5 space-y-5">
          {/* Header of Batch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-950">{selectedBatch.batchName}</h3>
                <StatusBadge status={selectedBatch.status} />
                {isFinalRound && (
                  <span className="text-[11px] font-semibold text-zinc-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                    Final Placement Round
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {isFinalRound ? (
                  <span>
                    <strong>Rule 22 Enforced:</strong> Final Round allows only <strong>SELECT</strong>. Selected candidates are instantly placed. Untouched candidates are rejected upon submission.
                  </span>
                ) : (
                  <span>
                    <strong>Rule 16 Enforced:</strong> <strong>SELECT</strong> advances to next round. <strong>HOLD</strong> is carried forward as pending. Untouched candidates are automatically rejected upon submission.
                  </span>
                )}
              </p>
            </div>

            {/* Submit / Edit Batch CTA (HR-only edit permission even after submission) */}
            {!isBatchSubmitted ? (
              <button
                type="button"
                disabled={batchStudents.length === 0}
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 rounded transition-colors self-start sm:self-auto shrink-0 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit & Freeze Batch</span>
              </button>
            ) : isEditingSubmitted ? (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingSubmitted(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Re-Freeze Batch</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="p-1.5 px-2.5 bg-zinc-100 border border-zinc-300 rounded text-xs font-mono text-zinc-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>FROZEN / SUBMITTED</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSubmitted(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-white border border-zinc-300 hover:bg-zinc-50 rounded transition-colors shadow-xs"
                  title="Modify submitted evaluations (HR Only)"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Edit Evaluation</span>
                </button>
              </div>
            )}
          </div>

          {/* Frozen Banner or Edit Mode Banner */}
          {isBatchSubmitted && (
            isEditingSubmitted ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>HR Edit Mode Active:</strong> You are modifying decisions for this submitted batch. When finished, click <strong>"Save & Re-Freeze Batch"</strong> to update next-round candidates and placement records.
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditingSubmitted(false)}
                    className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="px-3 py-1 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Re-Freeze</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded text-xs text-zinc-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-600 shrink-0" />
                  <span>
                    <strong>Locked & Submitted:</strong> Submitted on {selectedBatch.submittedAt ? new Date(selectedBatch.submittedAt).toLocaleString() : 'N/A'}. Coordinators can only view results. You may click <strong>"Edit Evaluation"</strong> above if changes are required.
                  </span>
                </div>
              </div>
            )
          )}

          {/* Live Decision Counter (Visible when drafting or editing) */}
          {(!isBatchSubmitted || isEditingSubmitted) && batchStudents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded">
                <span className="text-emerald-800 block text-[11px] font-semibold">To be SELECTED</span>
                <span className="font-mono text-lg font-bold text-emerald-900">{currentSelects}</span>
              </div>
              {!isFinalRound && (
                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded">
                  <span className="text-amber-800 block text-[11px] font-semibold">To be HELD (Pending)</span>
                  <span className="font-mono text-lg font-bold text-amber-900">{currentHolds}</span>
                </div>
              )}
              <div className={`p-2.5 bg-rose-50/60 border border-rose-200 rounded ${isFinalRound ? 'col-span-2' : ''}`}>
                <span className="text-rose-800 block text-[11px] font-semibold">No Action (Auto-Reject)</span>
                <span className="font-mono text-lg font-bold text-rose-900">{currentNone}</span>
              </div>
            </div>
          )}

          {/* Students Evaluation Table */}
          {batchStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded">
              No students have been assigned to this batch by the student coordinator yet.
            </div>
          ) : (
            <div className="border border-zinc-200 rounded overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">CGPA</th>
                    <th className="py-2.5 px-3 text-right">
                      {isBatchSubmitted && !isEditingSubmitted ? 'Final Decision' : 'Evaluation Decision'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {batchStudents.map((bs) => {
                    const s = studentMap.get(bs.studentId);
                    const currentAction = evalMap.get(bs.studentId) || 'NONE';
                    const finalResult = resultMap.get(bs.studentId);

                    return (
                      <tr key={bs.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-3 font-mono font-medium text-zinc-950">{s?.rollNumber}</td>
                        <td className="py-3 px-3 font-medium text-zinc-900">{s?.fullName}</td>
                        <td className="py-3 px-3 text-zinc-600">{s?.branch} · {s?.department}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-zinc-900">{s?.cgpa.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">
                          {isBatchSubmitted && !isEditingSubmitted ? (
                            <span className="inline-block">
                              <StatusBadge status={finalResult || (currentAction === 'SELECT' ? 'SELECTED' : currentAction === 'HOLD' ? 'HOLD' : 'REJECTED')} />
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              {/* SELECT BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleAction(bs.id, bs.studentId, 'SELECT')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1 ${
                                  currentAction === 'SELECT'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-zinc-700 border-zinc-300 hover:border-emerald-500 hover:text-emerald-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>SELECT</span>
                              </button>

                              {/* HOLD BUTTON (ONLY RENDERED IN NON-FINAL ROUNDS - Rule 22 & 40) */}
                              {!isFinalRound && (
                                <button
                                  type="button"
                                  onClick={() => handleAction(bs.id, bs.studentId, 'HOLD')}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1 ${
                                    currentAction === 'HOLD'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-500 hover:text-amber-700'
                                  }`}
                                >
                                  <PauseCircle className="w-3 h-3" />
                                  <span>HOLD</span>
                                </button>
                              )}

                              {currentAction === 'NONE' && (
                                <span className="text-[11px] text-zinc-400 font-mono pl-1">
                                  No Action
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded">
          Select a batch above to begin evaluation.
        </div>
      )}

      {/* SUBMIT BATCH CONFIRMATION DIALOG (Per Section 49) */}
      <Modal
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        title="Confirm Batch Submission & Freeze"
        subtitle="This action permanently freezes all evaluation decisions"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Batch Submission Rules</span>
            </div>
            <p className="leading-relaxed">
              After submission, this batch will be <strong>frozen and cannot be modified</strong>.
            </p>
            {isFinalRound ? (
              <ul className="list-disc list-inside space-y-0.5 pt-1 text-[11px]">
                <li><strong>SELECT ({currentSelects}):</strong> Automatic placement records generated.</li>
                <li><strong>No Action ({currentNone}):</strong> Automatically marked as REJECTED.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-0.5 pt-1 text-[11px]">
                <li><strong>SELECT ({currentSelects}):</strong> Progress to next round candidate pool.</li>
                <li><strong>HOLD ({currentHolds}):</strong> Carried forward as HOLD / Pending candidate.</li>
                <li><strong>No Action ({currentNone}):</strong> Automatically marked as REJECTED.</li>
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsSubmitConfirmOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmitBatch}
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
            >
              Confirm & Submit Batch
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
