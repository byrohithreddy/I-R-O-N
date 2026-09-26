import React, { useState } from 'react';
import { Drive, DriveRound, Application, Student, RoundType } from '../../types';
import { ironStorage } from '../../services/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Plus,
  Key,
  Edit2,
  Users,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  ArrowRight,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
} from 'lucide-react';

interface CreateRoundItem {
  roundName: string;
  roundType: RoundType;
  description: string;
  isFinalRound: boolean;
}

interface TpoDrivesProps {
  initialDriveId?: string;
  onNavigateToAnalytics: (driveId: string) => void;
  onRefresh: () => void;
}

const ALL_BRANCHES = ['CSE', 'CSE-DS', 'CSE-AIML', 'CSE-CS', 'CSE-IOT', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA'];

export const TpoDrives: React.FC<TpoDrivesProps> = ({
  initialDriveId,
  onNavigateToAnalytics,
  onRefresh,
}) => {
  const drives = ironStorage.getDrives();
  const students = ironStorage.getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(
    initialDriveId ? drives.find((d) => d.id === initialDriveId) || null : null
  );

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [isApplicantsOpen, setIsApplicantsOpen] = useState(false);
  const [credentialsDrive, setCredentialsDrive] = useState<Drive | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Status change dialog
  const [confirmStatusDrive, setConfirmStatusDrive] = useState<{ drive: Drive; newStatus: any } | null>(null);

  // Create Drive Form State
  const [createStep, setCreateStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [pkg, setPkg] = useState('₹8.0 LPA');
  const [jobDescription, setJobDescription] = useState('');
  const [minimumCgpa, setMinimumCgpa] = useState<number>(7.0);
  const [backlogRule, setBacklogRule] = useState<number | string>(0);
  const [eligibleBranches, setEligibleBranches] = useState<string[]>(['CSE', 'CSE-DS', 'CSE-AIML', 'IT', 'ECE']);
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [driveDate, setDriveDate] = useState('2026-11-05');
  const [driveTime, setDriveTime] = useState('09:30');
  const [location, setLocation] = useState('Placement Auditorium');
  const [createRounds, setCreateRounds] = useState<CreateRoundItem[]>([
    {
      roundName: 'Round 1: Screening & Aptitude',
      roundType: 'Aptitude',
      description: 'Initial screening and numerical reasoning assessment.',
      isFinalRound: false,
    },
    {
      roundName: 'Round 2: Technical Interview',
      roundType: 'Technical',
      description: 'Core problem solving, algorithms, and system design.',
      isFinalRound: false,
    },
    {
      roundName: 'Round 3: Final HR Interview',
      roundType: 'HR',
      description: 'Leadership alignment, behavioral fit, and placement selection.',
      isFinalRound: true,
    },
  ]);
  const [roundStepError, setRoundStepError] = useState<string | null>(null);

  // Existing Drive Rounds Modal
  const [isRoundsModalOpen, setIsRoundsModalOpen] = useState(false);
  const [roundsDrive, setRoundsDrive] = useState<Drive | null>(null);
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundType, setNewRoundType] = useState<RoundType>('Technical');
  const [newRoundDesc, setNewRoundDesc] = useState('');
  const [newRoundIsFinal, setNewRoundIsFinal] = useState(false);

  // Edit Drive Form State
  const [editDriveData, setEditDriveData] = useState<Partial<Drive>>({});

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenCreate = () => {
    setCreateStep(1);
    setCompanyName('');
    setJobRole('');
    setPkg('₹8.0 LPA');
    setJobDescription('');
    setMinimumCgpa(7.0);
    setBacklogRule(0);
    setEligibleBranches(['CSE', 'IT', 'ECE']);
    setEligibilityCriteria('Minimum 7.0 CGPA with no standing backlogs.');
    setDriveDate('2026-11-05');
    setDriveTime('09:30');
    setLocation('Campus Placement Block');
    setCreateRounds([
      {
        roundName: 'Round 1: Screening & Aptitude',
        roundType: 'Aptitude',
        description: 'Initial screening and numerical reasoning assessment.',
        isFinalRound: false,
      },
      {
        roundName: 'Round 2: Technical Interview',
        roundType: 'Technical',
        description: 'Core problem solving, algorithms, and system design.',
        isFinalRound: false,
      },
      {
        roundName: 'Round 3: Final HR Interview',
        roundType: 'HR',
        description: 'Leadership alignment, behavioral fit, and placement selection.',
        isFinalRound: true,
      },
    ]);
    setRoundStepError(null);
    setIsCreateOpen(true);
  };

  const handleAddRoundToCreate = () => {
    const nextNumber = createRounds.length + 1;
    setCreateRounds([
      ...createRounds,
      {
        roundName: `Round ${nextNumber}: Technical Interview ${nextNumber > 2 ? nextNumber - 1 : ''}`.trim(),
        roundType: 'Technical',
        description: '',
        isFinalRound: false,
      },
    ]);
    setRoundStepError(null);
  };

  const handleRemoveRoundFromCreate = (idx: number) => {
    if (createRounds.length <= 1) {
      setRoundStepError('A drive must have at least one round.');
      return;
    }
    const filtered = createRounds.filter((_, i) => i !== idx);
    // If we removed the final round, make the last one final
    const hasFinal = filtered.some((r) => r.isFinalRound);
    if (!hasFinal && filtered.length > 0) {
      filtered[filtered.length - 1].isFinalRound = true;
    }
    setCreateRounds(filtered);
    setRoundStepError(null);
  };

  const handleMoveRound = (idx: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === createRounds.length - 1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    const copy = [...createRounds];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setCreateRounds(copy);
  };

  const handleSetFinalRound = (idx: number) => {
    const updated = createRounds.map((r, i) => ({
      ...r,
      isFinalRound: i === idx,
    }));
    setCreateRounds(updated);
    setRoundStepError(null);
  };

  const handleUpdateCreateRound = (idx: number, field: keyof CreateRoundItem, value: any) => {
    const updated = [...createRounds];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };
    setCreateRounds(updated);
  };

  const validateRoundsStep = (): boolean => {
    if (createRounds.length === 0) {
      setRoundStepError('Please add at least one round.');
      return false;
    }
    for (let i = 0; i < createRounds.length; i++) {
      if (!createRounds[i].roundName.trim()) {
        setRoundStepError(`Round ${i + 1} must have a name.`);
        return false;
      }
    }
    const finalCount = createRounds.filter((r) => r.isFinalRound).length;
    if (finalCount === 0) {
      // Auto-assign last round as final
      handleSetFinalRound(createRounds.length - 1);
    } else if (finalCount > 1) {
      setRoundStepError('Rule F: Exactly one round can be marked as the Final Round.');
      return false;
    }
    setRoundStepError(null);
    return true;
  };

  const handleSaveNewDrive = (status: 'UPCOMING' | 'DRAFT') => {
    if (!companyName.trim() || !jobRole.trim()) return;

    if (!validateRoundsStep()) {
      setCreateStep(4);
      return;
    }

    ironStorage.saveDrive(
      {
        companyName,
        jobRole,
        package: pkg,
        jobDescription,
        minimumCgpa,
        backlogRule,
        eligibleBranches,
        eligibilityCriteria,
        driveDate,
        driveTime,
        location,
        status,
      },
      undefined,
      createRounds.map((r, idx) => ({
        roundNumber: idx + 1,
        roundName: r.roundName.trim(),
        roundType: r.roundType,
        description: r.description.trim(),
        status: 'UPCOMING',
        isFinalRound: r.isFinalRound,
      }))
    );

    setIsCreateOpen(false);
    onRefresh();
  };

  const handleOpenEdit = (drive: Drive) => {
    setEditDriveData({ ...drive });
    setSelectedDrive(drive);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedDrive || !editDriveData.companyName) return;
    ironStorage.saveDrive(editDriveData, selectedDrive.id);
    setIsEditOpen(false);
    onRefresh();
  };

  const handleStatusChange = (drive: Drive, newStatus: any) => {
    ironStorage.saveDrive({ status: newStatus }, drive.id);
    setConfirmStatusDrive(null);
    onRefresh();
  };

  const filteredDrives = drives.filter((d) => {
    if (filterStatus === 'ALL') return true;
    return d.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Placement Drive Administration</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure recruitment drives, rounds, recruiter credentials, and application overrides.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Recruitment Drive</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-1 text-xs">
        {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'DRAFT', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
              filterStatus === st
                ? 'text-zinc-950 border-b-2 border-zinc-950 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {st} {st !== 'ALL' && `(${drives.filter((d) => d.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Drives Table */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-4">Company & Job Role</th>
              <th className="py-2.5 px-3">Schedule</th>
              <th className="py-2.5 px-3">Package</th>
              <th className="py-2.5 px-3">Eligibility Rules</th>
              <th className="py-2.5 px-3">Applicants</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredDrives.map((d) => {
              const apps = ironStorage.getApplications(d.id);
              return (
                <tr key={d.id} className="hover:bg-zinc-50/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-950">{d.companyName}</div>
                    <div className="text-zinc-500 text-[11px]">{d.jobRole}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-zinc-900">{d.driveDate}</div>
                    <div className="text-[11px] text-zinc-500">{d.driveTime} · {d.location}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-zinc-900">{d.package}</td>
                  <td className="py-3 px-3 text-zinc-600">
                    <div>Min CGPA: <strong className="font-mono text-zinc-900">{d.minimumCgpa.toFixed(2)}</strong></div>
                    <div className="text-[11px] text-zinc-500">Backlogs ≤ {d.backlogRule}</div>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDrive(d);
                        setIsApplicantsOpen(true);
                      }}
                      className="font-mono font-semibold text-zinc-900 hover:text-zinc-600 hover:underline"
                    >
                      {apps.length} applicants
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRoundsDrive(d);
                        setIsRoundsModalOpen(true);
                      }}
                      className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100"
                      title="Manage Rounds"
                    >
                      <Layers className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCredentialsDrive(d);
                        setIsCredentialsOpen(true);
                      }}
                      className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100"
                      title="View Coordinator & HR Credentials"
                    >
                      <Key className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(d)}
                      className="p-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100"
                      title="Edit Drive"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToAnalytics(d.id)}
                      className="text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:underline"
                    >
                      Analytics
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MULTI-STEP CREATE DRIVE MODAL (Per Section 37) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Recruitment Drive"
        subtitle={`Step ${createStep} of 5 · Integrated Drive Setup`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Step Progress indicators */}
          <div className="grid grid-cols-5 text-center text-[11px] font-medium border-b border-zinc-200 pb-2">
            <span className={createStep === 1 ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>1. Job</span>
            <span className={createStep === 2 ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>2. Eligibility</span>
            <span className={createStep === 3 ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>3. Schedule</span>
            <span className={createStep === 4 ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>4. Rounds</span>
            <span className={createStep === 5 ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>5. Review</span>
          </div>

          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Systems"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Job Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Package (CTC) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹12.0 LPA"
                    value={pkg}
                    onChange={(e) => setPkg(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Job Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed job expectations, tech stack, and role responsibilities..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Minimum CGPA (0.0 - 10.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={minimumCgpa}
                    onChange={(e) => setMinimumCgpa(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Max Active Backlogs Allowed</label>
                  <select
                    value={backlogRule}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBacklogRule(val === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : parseInt(val));
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value={0}>0 (Strictly No Backlogs)</option>
                    <option value={1}>Up to 1 Backlog</option>
                    <option value={2}>Up to 2 Backlogs</option>
                    <option value="NOT_APPLICABLE">Not applicable (No Backlog Restriction)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Eligible Branches</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_BRANCHES.map((b) => {
                    const checked = eligibleBranches.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => {
                          if (checked) {
                            setEligibleBranches(eligibleBranches.filter((x) => x !== b));
                          } else {
                            setEligibleBranches([...eligibleBranches, b]);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          checked
                            ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Eligibility Notes</label>
                <input
                  type="text"
                  placeholder="Additional eligibility requirements..."
                  value={eligibilityCriteria}
                  onChange={(e) => setEligibilityCriteria(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Drive Date</label>
                  <input
                    type="date"
                    required
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Application deadline is strictly enforced at 00:00 on this date.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Reporting Time</label>
                  <input
                    type="time"
                    value={driveTime}
                    onChange={(e) => setDriveTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          )}

          {createStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900">
                    Recruitment Rounds Pipeline ({createRounds.length})
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Add custom rounds, order the evaluation sequence, and designate exactly one Final Round.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRoundToCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Round</span>
                </button>
              </div>

              {roundStepError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{roundStepError}</span>
                </div>
              )}

              {/* Rounds List */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {createRounds.map((rnd, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 border rounded-lg space-y-3 transition-colors ${
                      rnd.isFinalRound
                        ? 'border-zinc-950 bg-zinc-50/70 shadow-xs'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    {/* Round Header & Order Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          ROUND {idx + 1}
                        </span>
                        {rnd.isFinalRound && (
                          <span className="px-2 py-0.5 bg-zinc-950 text-white text-[10px] font-bold rounded">
                            ★ FINAL ROUND
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveRound(idx, 'UP')}
                          className="p-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-100"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === createRounds.length - 1}
                          onClick={() => handleMoveRound(idx, 'DOWN')}
                          className="p-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-100"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={createRounds.length <= 1}
                          onClick={() => handleRemoveRoundFromCreate(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-100 ml-1"
                          title="Delete Round"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Round Name & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                          Round Display Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={rnd.roundName}
                          onChange={(e) => handleUpdateCreateRound(idx, 'roundName', e.target.value)}
                          placeholder="e.g. Round 2: Technical & Coding"
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                          Round Type
                        </label>
                        <select
                          value={rnd.roundType}
                          onChange={(e) =>
                            handleUpdateCreateRound(idx, 'roundType', e.target.value as RoundType)
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                        >
                          <option value="Aptitude">Aptitude</option>
                          <option value="Coding">Coding</option>
                          <option value="Technical">Technical</option>
                          <option value="Group Discussion">Group Discussion</option>
                          <option value="HR">HR</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                        Round Details / Instructions
                      </label>
                      <input
                        type="text"
                        value={rnd.description}
                        onChange={(e) => handleUpdateCreateRound(idx, 'description', e.target.value)}
                        placeholder="e.g. 60-min live algorithmic interview with Senior Architects"
                        className="w-full px-2.5 py-1 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    {/* Final Round Selection */}
                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="finalRoundSelection"
                          checked={rnd.isFinalRound}
                          onChange={() => handleSetFinalRound(idx)}
                          className="accent-zinc-950"
                        />
                        <span className={rnd.isFinalRound ? 'font-bold text-zinc-950' : 'text-zinc-600'}>
                          Designate as Final Round (Enforces Rule 22: HOLD is disabled, SELECT creates placement)
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {createStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded text-xs space-y-2">
                <div className="font-bold text-zinc-950 text-sm">{companyName}</div>
                <div className="text-zinc-700">Role: <strong className="text-zinc-900">{jobRole}</strong> ({pkg})</div>
                <div className="text-zinc-700">Date: <strong className="text-zinc-900">{driveDate}</strong> at {driveTime}</div>
                <div className="text-zinc-700">Venue: {location}</div>
                <div className="text-zinc-700">
                  Criteria: Min CGPA {minimumCgpa.toFixed(2)}, Backlogs ≤ {backlogRule}, Branches: {eligibleBranches.join(', ')}
                </div>
              </div>

              {/* Rounds Summary in Step 5 Review */}
              <div className="border border-zinc-200 rounded p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-950">
                  Configured Recruitment Pipeline ({createRounds.length} Rounds):
                </div>
                <div className="divide-y divide-zinc-200 text-xs">
                  {createRounds.map((rnd, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-900">{rnd.roundName}</span>
                        <span className="text-zinc-400 text-[11px] ml-2 font-mono">({rnd.roundType})</span>
                      </div>
                      <div>
                        {rnd.isFinalRound ? (
                          <span className="px-2 py-0.5 bg-zinc-950 text-white text-[10px] font-bold rounded">
                            ★ Final Round
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-mono">Stage {i + 1}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 border border-zinc-200 rounded space-y-1 bg-zinc-50">
                <div className="text-xs font-semibold text-zinc-900">Generated Drive Credentials:</div>
                <div className="text-[11px] font-mono text-zinc-700">
                  Coordinator: <span className="font-bold">coord_{(companyName || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-700">
                  Company HR: <span className="font-bold">hr_{(companyName || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            {createStep > 1 ? (
              <button
                type="button"
                onClick={() => setCreateStep(createStep - 1)}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
              >
                Cancel
              </button>
            )}

            {createStep < 5 ? (
              <button
                type="button"
                disabled={createStep === 1 && (!companyName || !jobRole)}
                onClick={() => {
                  if (createStep === 4) {
                    if (validateRoundsStep()) {
                      setCreateStep(5);
                    }
                  } else {
                    setCreateStep(createStep + 1);
                  }
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 rounded"
              >
                Continue
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveNewDrive('DRAFT')}
                  className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewDrive('UPCOMING')}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded"
                >
                  Publish Drive
                </button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* CREDENTIALS VIEW MODAL (Per Section 62) */}
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
                  Multiple coordinators operate simultaneously on this assigned drive.
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

      {/* EDIT DRIVE MODAL (Per Rule: TPO can edit drive at any time) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Drive: ${editDriveData.companyName}`}
        subtitle="Update schedules, eligibility thresholds, or active status"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={editDriveData.companyName || ''}
                onChange={(e) => setEditDriveData({ ...editDriveData, companyName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Job Role</label>
              <input
                type="text"
                value={editDriveData.jobRole || ''}
                onChange={(e) => setEditDriveData({ ...editDriveData, jobRole: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Package</label>
              <input
                type="text"
                value={editDriveData.package || ''}
                onChange={(e) => setEditDriveData({ ...editDriveData, package: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Min CGPA</label>
              <input
                type="number"
                step="0.05"
                value={editDriveData.minimumCgpa ?? 7.0}
                onChange={(e) => setEditDriveData({ ...editDriveData, minimumCgpa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Drive Status</label>
              <select
                value={editDriveData.status || 'UPCOMING'}
                onChange={(e) => setEditDriveData({ ...editDriveData, status: e.target.value as any })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Drive Date</label>
              <input
                type="date"
                value={editDriveData.driveDate || ''}
                onChange={(e) => setEditDriveData({ ...editDriveData, driveDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-medium mb-1">Drive Time</label>
              <input
                type="time"
                value={editDriveData.driveTime || ''}
                onChange={(e) => setEditDriveData({ ...editDriveData, driveTime: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 font-medium mb-1">Venue / Location</label>
            <input
              type="text"
              value={editDriveData.location || ''}
              onChange={(e) => setEditDriveData({ ...editDriveData, location: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-medium mb-1">Max Active Backlogs Allowed</label>
            <select
              value={editDriveData.backlogRule ?? 0}
              onChange={(e) => {
                const val = e.target.value;
                setEditDriveData({
                  ...editDriveData,
                  backlogRule: val === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : parseInt(val),
                });
              }}
              className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value={0}>0 (Strictly No Backlogs)</option>
              <option value={1}>Up to 1 Backlog</option>
              <option value={2}>Up to 2 Backlogs</option>
              <option value="NOT_APPLICABLE">Not applicable (No Backlog Restriction)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 font-medium mb-1">Eligible Branches</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_BRANCHES.map((b) => {
                const branches = editDriveData.eligibleBranches || [];
                const checked = branches.includes(b);
                return (
                  <button
                    type="button"
                    key={b}
                    onClick={() => {
                      if (checked) {
                        setEditDriveData({
                          ...editDriveData,
                          eligibleBranches: branches.filter((x) => x !== b),
                        });
                      } else {
                        setEditDriveData({
                          ...editDriveData,
                          eligibleBranches: [...branches, b],
                        });
                      }
                    }}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      checked
                        ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* APPLICANTS MODAL */}
      <Modal
        isOpen={isApplicantsOpen}
        onClose={() => setIsApplicantsOpen(false)}
        title={`Applicants: ${selectedDrive?.companyName}`}
        subtitle={`${ironStorage.getApplications(selectedDrive?.id).length} registered applicants`}
        maxWidth="max-w-3xl"
      >
        {selectedDrive && (
          <div className="space-y-4">
            <div className="border border-zinc-200 rounded overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Branch & Dept</th>
                    <th className="py-2.5 px-3">CGPA / Backlogs</th>
                    <th className="py-2.5 px-3 text-right">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {ironStorage.getApplications(selectedDrive.id).map((app) => {
                    const s = studentMap.get(app.studentId);
                    return (
                      <tr key={app.id} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 px-3 font-mono font-medium text-zinc-950">{s?.rollNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-zinc-900">{s?.fullName}</td>
                        <td className="py-2.5 px-3 text-zinc-600">{s?.branch}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {s?.cgpa.toFixed(2)} / {s?.backlogCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <StatusBadge status={app.eligibilityStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsApplicantsOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EXISTING DRIVE ROUNDS MANAGEMENT MODAL */}
      <Modal
        isOpen={isRoundsModalOpen}
        onClose={() => {
          setIsRoundsModalOpen(false);
          setNewRoundName('');
          setNewRoundDesc('');
        }}
        title={`Rounds: ${roundsDrive?.companyName}`}
        subtitle="Manage recruitment pipeline stages and evaluation checkpoints"
        maxWidth="max-w-2xl"
      >
        {roundsDrive && (
          <div className="space-y-5 text-xs">
            {/* List of current rounds */}
            <div className="space-y-2">
              <div className="font-semibold text-zinc-900">Current Pipeline Stages:</div>
              <div className="border border-zinc-200 rounded divide-y divide-zinc-200">
                {ironStorage.getRounds(roundsDrive.id).map((rnd) => (
                  <div key={rnd.id} className="p-3 flex items-start justify-between gap-3 bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                          Round {rnd.roundNumber}
                        </span>
                        <span className="font-semibold text-zinc-950">{rnd.roundName}</span>
                        <span className="text-zinc-400 text-[11px] font-mono">({rnd.roundType})</span>
                        {rnd.isFinalRound && (
                          <span className="px-1.5 py-0.2 bg-zinc-950 text-white text-[10px] font-bold rounded">
                            ★ Final Round
                          </span>
                        )}
                      </div>
                      {rnd.description && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">{rnd.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={rnd.status} />
                      {!rnd.isFinalRound && ironStorage.getRounds(roundsDrive.id).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${rnd.roundName}?`)) {
                              ironStorage.deleteRound(rnd.id);
                              onRefresh();
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100"
                          title="Delete Round"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Round Form */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
              <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Additional Round to {roundsDrive.companyName}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 font-medium mb-1">Round Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Round 4: Managerial Assessment"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Round Type</label>
                  <select
                    value={newRoundType}
                    onChange={(e) => setNewRoundType(e.target.value as RoundType)}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Aptitude">Aptitude</option>
                    <option value="Coding">Coding</option>
                    <option value="Technical">Technical</option>
                    <option value="Group Discussion">Group Discussion</option>
                    <option value="HR">HR</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Round objective, format, or venue..."
                  value={newRoundDesc}
                  onChange={(e) => setNewRoundDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={newRoundIsFinal}
                    onChange={(e) => setNewRoundIsFinal(e.target.checked)}
                    className="accent-zinc-950"
                  />
                  <span>Designate as new Final Round</span>
                </label>

                <button
                  type="button"
                  disabled={!newRoundName.trim()}
                  onClick={() => {
                    const currentRounds = ironStorage.getRounds(roundsDrive.id);
                    if (newRoundIsFinal) {
                      // Demote previous final rounds
                      currentRounds.forEach((cr) => {
                        if (cr.isFinalRound) {
                          ironStorage.saveRound({ isFinalRound: false }, cr.id);
                        }
                      });
                    }

                    ironStorage.saveRound({
                      driveId: roundsDrive.id,
                      roundNumber: currentRounds.length + 1,
                      roundName: newRoundName.trim(),
                      roundType: newRoundType,
                      description: newRoundDesc.trim(),
                      status: 'UPCOMING',
                      isFinalRound: newRoundIsFinal,
                    });

                    setNewRoundName('');
                    setNewRoundDesc('');
                    setNewRoundIsFinal(false);
                    onRefresh();
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 rounded transition-colors"
                >
                  Add Round
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsRoundsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
