import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Drive, Student } from '../../types';
import { ironStorage } from '../../services/storage';
import { CheckCircle2, XCircle, Search, AlertCircle, ArrowRight } from 'lucide-react';

interface StudentApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: Drive | null;
  onApplicationSubmitted: () => void;
}

export const StudentApplyModal: React.FC<StudentApplyModalProps> = ({
  isOpen,
  onClose,
  drive,
  onApplicationSubmitted,
}) => {
  const [rollNumber, setRollNumber] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{ isEligible: boolean; reasons: string[] } | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRollNumber('');
      setStudent(null);
      setEmail('');
      setPhone('');
      setSearched(false);
      setEligibilityResult(null);
      setAlreadyApplied(false);
      setError(null);
      setIsSuccess(false);
    }
  }, [isOpen, drive]);

  if (!drive) return null;

  const handleLookup = () => {
    setError(null);
    if (!rollNumber.trim()) {
      setError('Please enter your college roll number.');
      return;
    }

    const found = ironStorage.getStudentByRollNumber(rollNumber);
    setSearched(true);
    if (!found) {
      setStudent(null);
      setEligibilityResult(null);
      setError(`Roll number "${rollNumber.trim().toUpperCase()}" not found in Student Master DB. Please contact the TPO.`);
      return;
    }

    setStudent(found);
    setEmail(found.email);
    setPhone(found.phone);

    // Check duplicate
    const apps = ironStorage.getApplications(drive.id);
    const existing = apps.some((a) => a.studentId === found.id);
    setAlreadyApplied(existing);

    // Check eligibility
    const el = ironStorage.checkEligibility(found, drive);
    setEligibilityResult(el);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!student || !eligibilityResult) {
      setError('Please verify your roll number first.');
      return;
    }

    if (alreadyApplied) {
      setError(`You have already applied to ${drive.companyName}. Duplicate applications are prohibited.`);
      return;
    }

    if (!eligibilityResult.isEligible) {
      setError(`Cannot apply: ${eligibilityResult.reasons.join('. ')}`);
      return;
    }

    try {
      ironStorage.applyToDrive(drive.id, student.rollNumber, email, phone);
      setIsSuccess(true);
      onApplicationSubmitted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Apply: ${drive.companyName}`}
      subtitle={`${drive.jobRole} · ${drive.package}`}
      maxWidth="max-w-xl"
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-950">Application Submitted Successfully</h3>
            <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
              Your application for <span className="font-semibold text-zinc-900">{drive.companyName}</span> has been
              recorded in IRON. You have been added to the Round 1 candidate pool.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Eligibility Requirements Summary */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-600 space-y-1">
            <div className="font-semibold text-zinc-900">Drive Criteria:</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-zinc-600">
              <span>Min CGPA: <strong className="text-zinc-900 font-mono">{drive.minimumCgpa.toFixed(2)}</strong></span>
              <span>Max Backlogs: <strong className="text-zinc-900 font-mono">{drive.backlogRule}</strong></span>
              <span>Branches: <strong className="text-zinc-900">{drive.eligibleBranches.join(', ')}</strong></span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Roll Number Lookup Form */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Enter College Roll Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter College Roll Number"
                value={rollNumber}
                onChange={(e) => {
                  setRollNumber(e.target.value.toUpperCase());
                  setSearched(false);
                  setStudent(null);
                  setEligibilityResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded uppercase focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <button
                type="button"
                onClick={handleLookup}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify Roll No</span>
              </button>
            </div>
          </div>

          {/* Sourced Master DB Academic Record */}
          {student && (
            <div className="space-y-4 border-t border-zinc-200 pt-4">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Permanent Master DB Profile (Authoritative)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Full Name</span>
                    <span className="font-medium text-zinc-900">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Branch & Dept</span>
                    <span className="font-medium text-zinc-900">{student.branch} · {student.department}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Academic Year</span>
                    <span className="font-mono text-zinc-900">{student.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cumulative CGPA</span>
                    <span className="font-mono font-semibold text-zinc-900">{student.cgpa.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Active Backlogs</span>
                    <span className="font-mono font-semibold text-zinc-900">{student.backlogCount}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">College</span>
                    <span className="text-zinc-700 truncate block">{student.college}</span>
                  </div>
                </div>
              </div>

              {/* Real-time Eligibility Status Result */}
              {eligibilityResult && (
                <div
                  className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                    eligibilityResult.isEligible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {eligibilityResult.isEligible ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {eligibilityResult.isEligible ? 'Criteria Met: Eligible to Apply' : 'Not Eligible'}
                    </div>
                    {eligibilityResult.reasons.length > 0 && (
                      <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5 opacity-90">
                        {eligibilityResult.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {alreadyApplied && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded">
                  <strong>Notice:</strong> An application with this roll number has already been registered for this drive.
                </div>
              )}

              {/* Editable Contact Information */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Application Contact Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!eligibilityResult?.isEligible || alreadyApplied}
                    className="px-5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-1.5"
                  >
                    <span>Submit Application</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
